"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FeaturedWork } from "@/data/platform";
import type {
  StoryCampaign,
  StoryCompanion,
  StoryEnding,
  StoryEpisodeChoice,
  StoryEpisodeNode,
} from "@/data/story-campaigns";

type StoryPlayerShellProps = { work: FeaturedWork; campaign: StoryCampaign };
type StoryLogEntry = {
  episodeId: string;
  episodeTitle: string;
  choiceId: string;
  choiceLabel: string;
  resultTitle: string;
  resultDetail: string;
  impactTags: string[];
  trustScore: number;
  hypeScore: number;
  createdAt: string;
};
type StoryProgress = {
  currentEpisodeId: string;
  trustScore: number;
  hypeScore: number;
  visitedEpisodeIds: string[];
  endingId: string | null;
  log: StoryLogEntry[];
  updatedAt: string;
  startedAt: string;
};

type StoryRunSummary = {
  id: string;
  workId: string;
  endingId: string;
  endingTitle: string;
  endingClass: string;
  reward: string;
  trustScore: number;
  hypeScore: number;
  visitedCount: number;
  choiceCount: number;
  durationMinutes: number;
  createdAt: string;
  highlightTags: string[];
};

const STORAGE_PREFIX = "projectr.story-progress.v4";
const HISTORY_STORAGE_PREFIX = "projectr.story-history.v1";

const clampScore = (value: number) => Math.max(0, Math.min(100, value));
const storageKey = (workId: string) => `${STORAGE_PREFIX}.${workId}`;
const historyStorageKey = (workId: string) => `${HISTORY_STORAGE_PREFIX}.${workId}`;
const uniqueItems = (values: string[]) => Array.from(new Set(values));

function createInitialProgress(campaign: StoryCampaign): StoryProgress {
  const firstEpisodeId = campaign.episodes[0]?.id ?? "";
  const now = new Date().toISOString();
  return {
    currentEpisodeId: firstEpisodeId,
    trustScore: 50,
    hypeScore: 50,
    visitedEpisodeIds: firstEpisodeId ? [firstEpisodeId] : [],
    endingId: null,
    log: [],
    updatedAt: "",
    startedAt: now,
  };
}

function formatUpdatedAt(value: string) {
  if (!value) return "이번 세션에서 아직 저장된 기록이 없습니다.";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function groupEpisodesByAct(episodes: StoryEpisodeNode[]) {
  return episodes.reduce<Array<{ actLabel: string; items: StoryEpisodeNode[] }>>((groups, episode) => {
    const group = groups.find((entry) => entry.actLabel === episode.actLabel);
    if (group) {
      group.items.push(episode);
      return groups;
    }
    groups.push({ actLabel: episode.actLabel, items: [episode] });
    return groups;
  }, []);
}

function getRouteTitle(progress: StoryProgress, ending: StoryEnding | null) {
  if (ending) return ending.classification;
  if (progress.trustScore >= 70 && progress.hypeScore >= 70) return "Dominant Balance";
  if (progress.trustScore >= 70) return "High Trust Route";
  if (progress.hypeScore >= 75) return "High Hype Route";
  return "Volatile Build";
}

function getCompanionSignal(companion: StoryCompanion, progress: StoryProgress) {
  if (companion.id === "astra") return progress.trustScore >= 68 ? "Aligned" : "Watching";
  if (companion.id === "noir") return progress.hypeScore >= 74 ? "All-in" : "Speculating";
  return progress.hypeScore + progress.trustScore >= 130 ? "Broadcast-ready" : "Testing";
}

function getChoiceBreakdown(log: StoryLogEntry[]) {
  return log.reduce(
    (accumulator, entry) => {
      if (entry.trustScore - entry.hypeScore >= 8) {
        accumulator.trustLeaning += 1;
      } else if (entry.hypeScore - entry.trustScore >= 8) {
        accumulator.hypeLeaning += 1;
      } else {
        accumulator.balanced += 1;
      }

      for (const tag of entry.impactTags) {
        accumulator.tagWeights[tag] = (accumulator.tagWeights[tag] ?? 0) + 1;
      }

      return accumulator;
    },
    {
      trustLeaning: 0,
      hypeLeaning: 0,
      balanced: 0,
      tagWeights: {} as Record<string, number>,
    },
  );
}

function buildRunSummary(workId: string, ending: StoryEnding, progress: StoryProgress): StoryRunSummary {
  const durationMs =
    new Date(progress.updatedAt || new Date().toISOString()).getTime() -
    new Date(progress.startedAt).getTime();
  const highlightTags = Object.entries(getChoiceBreakdown(progress.log).tagWeights)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([tag]) => tag);

  return {
    id: `${ending.id}:${progress.updatedAt}`,
    workId,
    endingId: ending.id,
    endingTitle: ending.title,
    endingClass: ending.classification,
    reward: ending.reward,
    trustScore: progress.trustScore,
    hypeScore: progress.hypeScore,
    visitedCount: progress.visitedEpisodeIds.length,
    choiceCount: progress.log.length,
    durationMinutes: Math.max(1, Math.round(durationMs / 60000)),
    createdAt: progress.updatedAt || new Date().toISOString(),
    highlightTags,
  };
}

function getReplayRecommendations(progress: StoryProgress, ending: StoryEnding | null) {
  const recommendations: string[] = [];

  if (ending?.id === "quiet-orbit") {
    recommendations.push("다음 런에서는 하이프 중심 루트로 도시 전체를 장악하는 결말을 노려보세요.");
  }
  if (ending?.id === "city-crown") {
    recommendations.push("다음 런에서는 거래와 공개 약속을 섞어 신뢰 축을 더 높여보세요.");
  }
  if (!ending || ending.id === "signal-companion") {
    recommendations.push("항만 길드 루트만 집중해서 아직 보지 못한 중반 장면을 열어보세요.");
  }
  if (progress.visitedEpisodeIds.length < 5) {
    recommendations.push("이번 런에서는 일부 2막 분기만 열렸습니다. 첫 선택을 바꾸면 다른 챕터가 열립니다.");
  }
  if (progress.trustScore < 60) {
    recommendations.push("신뢰 점수가 낮습니다. 아스트라와 루멘 축을 살리면 더 안정적인 엔딩으로 갑니다.");
  }
  if (progress.hypeScore < 70) {
    recommendations.push("하이프가 낮습니다. 공개 액션과 충격 연출을 밀면 더 강한 화제성 엔딩으로 이동합니다.");
  }

  return recommendations.slice(0, 3);
}

function getFocusLabel(progress: StoryProgress) {
  if (progress.trustScore >= 75 && progress.hypeScore >= 75) {
    return "도시 전체를 장악한 균형형 시즌";
  }
  if (progress.trustScore >= 75) {
    return "정통성과 질서를 세운 시즌";
  }
  if (progress.hypeScore >= 80) {
    return "장면과 화제성을 폭발시킨 시즌";
  }
  return "결말 축이 크게 갈릴 수 있는 가변형 시즌";
}

export function StoryPlayerShell({ work, campaign }: StoryPlayerShellProps) {
  const [progress, setProgress] = useState<StoryProgress>(() => createInitialProgress(campaign));
  const [pendingChoiceId, setPendingChoiceId] = useState<string | null>(null);
  const [runHistory, setRunHistory] = useState<StoryRunSummary[]>([]);

  useEffect(() => {
    const initial = createInitialProgress(campaign);
    const storedProgress = window.localStorage.getItem(storageKey(work.id));
    const storedHistory = window.localStorage.getItem(historyStorageKey(work.id));

    if (!storedProgress) {
      setProgress(initial);
    } else {
      try {
        const parsed = JSON.parse(storedProgress) as StoryProgress;
        const knownEpisodes = new Set(campaign.episodes.map((episode) => episode.id));
        setProgress({
          ...initial,
          ...parsed,
          currentEpisodeId: knownEpisodes.has(parsed.currentEpisodeId)
            ? parsed.currentEpisodeId
            : initial.currentEpisodeId,
          visitedEpisodeIds: uniqueItems(
            parsed.visitedEpisodeIds.filter((episodeId) => knownEpisodes.has(episodeId)),
          ),
        });
      } catch {
        setProgress(initial);
        window.localStorage.removeItem(storageKey(work.id));
      }
    }

    if (!storedHistory) {
      setRunHistory([]);
    } else {
      try {
        const parsed = JSON.parse(storedHistory) as StoryRunSummary[];
        setRunHistory(parsed.filter((entry) => entry.workId === work.id));
      } catch {
        setRunHistory([]);
        window.localStorage.removeItem(historyStorageKey(work.id));
      }
    }
  }, [campaign, work.id]);

  const currentEpisode = useMemo(
    () => campaign.episodes.find((episode) => episode.id === progress.currentEpisodeId) ?? campaign.episodes[0] ?? null,
    [campaign.episodes, progress.currentEpisodeId],
  );
  const ending = useMemo(
    () => (progress.endingId ? campaign.endings.find((entry) => entry.id === progress.endingId) ?? null : null),
    [campaign.endings, progress.endingId],
  );
  const completion = ending ? 100 : currentEpisode ? Math.round((currentEpisode.step / (campaign.episodes.at(-1)?.step ?? 1)) * 100) : 0;
  const latestLog = progress.log[0] ?? null;
  const routeSignature = uniqueItems(progress.log.flatMap((entry) => entry.impactTags)).slice(0, 6);
  const choiceBreakdown = getChoiceBreakdown(progress.log);
  const replayRecommendations = getReplayRecommendations(progress, ending);
  const objectiveStates = campaign.objectives.map((label, index) => ({
    label,
    complete:
      index === 0
        ? progress.visitedEpisodeIds.length >= 3
        : index === 1
          ? progress.trustScore >= 65 || progress.hypeScore >= 75
          : progress.log.some((entry) => entry.hypeScore >= 72 || entry.impactTags.some((tag) => tag.includes("Broadcast") || tag.includes("Shock"))),
  }));
  const actGroups = groupEpisodesByAct(campaign.episodes);

  const persistProgress = (nextProgress: StoryProgress) => {
    setProgress(nextProgress);
    window.localStorage.setItem(storageKey(work.id), JSON.stringify(nextProgress));
  };

  useEffect(() => {
    if (!ending || !progress.updatedAt) {
      return;
    }

    const summary = buildRunSummary(work.id, ending, progress);
    setRunHistory((current) => {
      if (current.some((entry) => entry.id === summary.id)) {
        return current;
      }
      const next = [summary, ...current].slice(0, 8);
      window.localStorage.setItem(historyStorageKey(work.id), JSON.stringify(next));
      return next;
    });
  }, [ending, progress, work.id]);

  const choose = (choice: StoryEpisodeChoice) => {
    if (!currentEpisode || pendingChoiceId || ending) return;
    setPendingChoiceId(choice.id);
    const nextEpisodeId = choice.nextEpisodeId ?? currentEpisode.id;
    const nextEpisode = campaign.episodes.find((episode) => episode.id === nextEpisodeId) ?? currentEpisode;
    const trustScore = clampScore(progress.trustScore + choice.trustDelta);
    const hypeScore = clampScore(progress.hypeScore + choice.hypeDelta);
    const nextProgress: StoryProgress = {
      currentEpisodeId: choice.endingId ? currentEpisode.id : nextEpisode.id,
      trustScore,
      hypeScore,
      visitedEpisodeIds: uniqueItems([...progress.visitedEpisodeIds, currentEpisode.id, nextEpisode.id]),
      endingId: choice.endingId ?? null,
      updatedAt: new Date().toISOString(),
      startedAt: progress.startedAt,
      log: [
        {
          episodeId: currentEpisode.id,
          episodeTitle: currentEpisode.title,
          choiceId: choice.id,
          choiceLabel: choice.label,
          resultTitle: choice.resultTitle,
          resultDetail: choice.resultDetail,
          impactTags: choice.impactTags,
          trustScore,
          hypeScore,
          createdAt: new Date().toISOString(),
        },
        ...progress.log,
      ].slice(0, 16),
    };
    persistProgress(nextProgress);
    setPendingChoiceId(null);
  };

  if (!currentEpisode) return null;

  return (
    <div className="min-h-screen text-white" style={{ backgroundImage: `radial-gradient(circle at top, rgba(255,186,109,0.18) 0%, rgba(7,11,18,0) 34%), ${campaign.backdrop}` }}>
      <main className="mx-auto flex w-full max-w-[1480px] flex-col gap-8 px-4 py-6 lg:px-8 lg:py-8">
        <section className="rounded-[2.6rem] border border-white/10 bg-[rgba(8,11,17,0.5)] px-5 py-6 shadow-[0_40px_120px_rgba(0,0,0,0.36)] backdrop-blur lg:px-8 lg:py-8">
          <div className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
            <div>
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.24em] text-white/52">
                <span>{campaign.seasonLabel}</span>
                <span className="rounded-full border border-white/10 px-3 py-2 text-[11px] tracking-[0.18em] text-[#ffd5aa]">{campaign.ambientLabel}</span>
              </div>
              <h1 className="mt-4 text-4xl font-semibold leading-tight text-[#fff6eb] md:text-[3.4rem]">{work.title}</h1>
              <p className="mt-4 max-w-4xl text-sm leading-8 text-white/72 md:text-base">{campaign.logline}</p>
              <p className="mt-3 max-w-3xl text-sm leading-8 text-[#ffd2af]">{campaign.playerFantasy}</p>
              <div className="mt-5 flex flex-wrap gap-2">{work.tags.map((tag) => <span key={tag} className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs text-white/76">{tag}</span>)}</div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/detail/work/${work.id}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#121722]">작품 상세</Link>
                <a href="/?tab=story" className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/74">스토리 홈</a>
                <button type="button" onClick={() => persistProgress(createInitialProgress(campaign))} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/74">세션 리셋</button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">{[
              ["Progress", `${completion}%`, `${currentEpisode.chapterLabel} · ${currentEpisode.actLabel}`],
              ["Trust", String(progress.trustScore), "세력과 시민이 당신을 믿는 정도"],
              ["Hype", String(progress.hypeScore), "도시 전체를 흔드는 장면의 강도"],
              ["Route", getRouteTitle(progress, ending), getFocusLabel(progress)],
            ].map(([label, value, detail]) => <div key={label} className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_100%)] p-5"><div className="text-[11px] uppercase tracking-[0.2em] text-white/46">{label}</div><div className="mt-4 text-3xl font-semibold text-white">{value}</div><div className="mt-2 text-sm leading-7 text-white/62">{detail}</div></div>)}</div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">{routeSignature.length > 0 ? routeSignature.map((tag) => <span key={tag} className="rounded-full border border-[#ffb36a]/25 bg-[rgba(255,179,106,0.08)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[#ffe0bc]">{tag}</span>) : <span className="text-sm text-white/56">첫 선택 이후 이 런의 시그니처가 누적됩니다.</span>}</div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className="rounded-[2.2rem] border border-white/10 bg-[rgba(6,10,17,0.54)] p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-[11px] uppercase tracking-[0.24em] text-[#ffcb96]">{currentEpisode.chapterLabel}</div><h2 className="mt-3 text-3xl font-semibold text-white">{currentEpisode.title}</h2><p className="mt-2 text-sm leading-7 text-white/62">{currentEpisode.slugline}</p></div><div className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/64"><div>{currentEpisode.location}</div><div className="mt-1">{currentEpisode.runtime}</div></div></div><div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]"><div className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_100%)] p-5"><div className="text-xs uppercase tracking-[0.18em] text-white/48">Scene</div><p className="mt-4 text-base leading-9 text-white/78">{currentEpisode.scene}</p><div className="mt-5 rounded-[1.3rem] border border-[#ffb36a]/25 bg-[rgba(255,179,106,0.08)] px-4 py-4 text-sm leading-7 text-[#fff0dc]">Stakes: {currentEpisode.stakes}</div></div><div className="space-y-4"><div className="rounded-[1.6rem] border border-white/10 bg-[#0d1520] p-5"><div className="text-xs uppercase tracking-[0.18em] text-white/48">Atmosphere</div><div className="mt-3 text-lg font-semibold text-white">{currentEpisode.atmosphere}</div><p className="mt-3 text-sm leading-7 text-white/64">{currentEpisode.directorNote}</p></div><div className="rounded-[1.6rem] border border-white/10 bg-[#0d1520] p-5"><div className="text-xs uppercase tracking-[0.18em] text-white/48">Current Objectives</div><div className="mt-3 flex flex-col gap-3">{currentEpisode.objectives.map((objective) => <div key={objective} className="rounded-[1.1rem] border border-white/8 px-3 py-3 text-sm text-white/72">{objective}</div>)}</div></div></div></div></section>

            {ending ? <section className="rounded-[2.2rem] border border-[#ffb36a]/30 bg-[linear-gradient(145deg,rgba(255,179,106,0.16)_0%,rgba(75,36,20,0.34)_100%)] p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-[11px] uppercase tracking-[0.24em] text-[#ffe2bf]">Ending Unlocked</div><h3 className="mt-3 text-3xl font-semibold text-white">{ending.title}</h3><p className="mt-2 text-sm leading-7 text-white/74">{ending.classification}</p></div><div className="rounded-[1.4rem] border border-white/15 bg-black/12 px-4 py-3 text-sm text-white/74">Reward: {ending.reward}</div></div><p className="mt-5 text-base leading-9 text-white/84">{ending.summary}</p><div className="mt-5 grid gap-4 lg:grid-cols-2"><div className="rounded-[1.5rem] border border-white/12 bg-black/12 p-5"><div className="text-xs uppercase tracking-[0.18em] text-white/52">Epilogue</div><p className="mt-3 text-sm leading-8 text-white/74">{ending.epilogue}</p></div><div className="rounded-[1.5rem] border border-white/12 bg-black/12 p-5"><div className="text-xs uppercase tracking-[0.18em] text-white/52">Next Hook</div><p className="mt-3 text-sm leading-8 text-white/74">{ending.nextHook}</p></div></div></section> : <section className="rounded-[2.2rem] border border-white/10 bg-[rgba(6,10,17,0.54)] p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs uppercase tracking-[0.18em] text-white/46">Choices</div><h3 className="mt-2 text-2xl font-semibold text-white">이번 장면을 어떤 기억으로 남길지 선택하세요</h3></div><div className="text-sm text-white/54">마지막 저장 {formatUpdatedAt(progress.updatedAt)}</div></div><div className="mt-5 grid gap-4">{currentEpisode.choices.map((choice) => <button key={choice.id} type="button" onClick={() => choose(choice)} disabled={Boolean(pendingChoiceId)} className="rounded-[1.8rem] border border-white/10 bg-[#0d1520] p-5 text-left transition hover:border-[#ffb36a]/40 hover:bg-[#121c2a] disabled:opacity-60"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-xl font-semibold text-white">{choice.label}</div><div className="mt-2 text-sm text-[#ffd6ae]">{choice.preview}</div></div><div className="flex gap-2 text-xs"><span className="rounded-full border border-white/10 px-3 py-2 text-white/72">Trust {choice.trustDelta >= 0 ? `+${choice.trustDelta}` : choice.trustDelta}</span><span className="rounded-full border border-white/10 px-3 py-2 text-white/72">Hype {choice.hypeDelta >= 0 ? `+${choice.hypeDelta}` : choice.hypeDelta}</span></div></div><p className="mt-4 text-sm leading-7 text-white/64">{choice.resultDetail}</p><div className="mt-4 flex flex-wrap gap-2">{choice.impactTags.map((tag) => <span key={tag} className="rounded-full border border-[#ffb36a]/25 bg-[rgba(255,179,106,0.08)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[#ffe0bc]">{tag}</span>)}</div></button>)}</div></section>}

            <section className="rounded-[2.2rem] border border-white/10 bg-[rgba(6,10,17,0.54)] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-white/46">
                    Season Report
                  </div>
                  <h3 className="mt-2 text-2xl font-semibold text-white">
                    이 런의 서사 통계와 재플레이 포인트
                  </h3>
                </div>
                <div className="text-sm text-white/56">{getFocusLabel(progress)}</div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Visited Nodes", String(progress.visitedEpisodeIds.length), "이번 런에서 실제로 열린 장면 수"],
                  ["Choices", String(progress.log.length), "완료된 선택 수"],
                  ["Trust Lean", String(choiceBreakdown.trustLeaning), "신뢰 축이 우세했던 선택"],
                  ["Hype Lean", String(choiceBreakdown.hypeLeaning), "화제성이 우세했던 선택"],
                ].map(([label, value, detail]) => (
                  <div
                    key={label}
                    className="rounded-[1.5rem] border border-white/10 bg-[#0d1520] p-4"
                  >
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/44">
                      {label}
                    </div>
                    <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
                    <div className="mt-2 text-sm leading-7 text-white/60">{detail}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                <div className="rounded-[1.6rem] border border-white/10 bg-[#0d1520] p-5">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/46">
                    Choice Breakdown
                  </div>
                  <div className="mt-4 space-y-4">
                    {[
                      ["Trust-heavy", choiceBreakdown.trustLeaning, "#8de7cb"],
                      ["Balanced", choiceBreakdown.balanced, "#ffd38b"],
                      ["Hype-heavy", choiceBreakdown.hypeLeaning, "#ff9c66"],
                    ].map(([label, count, color]) => {
                      const total = Math.max(progress.log.length, 1);
                      const width = `${Math.round((Number(count) / total) * 100)}%`;
                      return (
                        <div key={label}>
                          <div className="flex items-center justify-between gap-3 text-sm text-white/70">
                            <span>{label}</span>
                            <span>{count}</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-white/6">
                            <div
                              className="h-full rounded-full"
                              style={{ width, backgroundColor: String(color) }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[1.6rem] border border-white/10 bg-[#0d1520] p-5">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/46">
                    Replay Suggestions
                  </div>
                  <div className="mt-4 space-y-3">
                    {replayRecommendations.map((item) => (
                      <div
                        key={item}
                        className="rounded-[1.2rem] border border-white/8 px-4 py-4 text-sm leading-7 text-white/70"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {latestLog && <section className="rounded-[2.2rem] border border-white/10 bg-[linear-gradient(145deg,#171824,#121f37)] p-6"><div className="text-xs uppercase tracking-[0.2em] text-[#79f0d6]">Latest Beat</div><h3 className="mt-3 text-2xl font-semibold text-white">{latestLog.resultTitle}</h3><p className="mt-3 text-sm leading-8 text-white/72">{latestLog.resultDetail}</p></section>}
          </div>

          <div className="space-y-6">
            <section className="rounded-[2.2rem] border border-white/10 bg-[rgba(6,10,17,0.54)] p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.2em] text-white/46">
                  Run Archive
                </div>
                <div className="text-sm text-white/48">{runHistory.length} saved</div>
              </div>
              <div className="mt-4 space-y-3">
                {runHistory.length === 0 ? (
                  <div className="rounded-[1.4rem] border border-dashed border-white/12 px-4 py-5 text-sm text-white/56">
                    엔딩에 도달하면 이번 런이 시즌 아카이브에 저장됩니다.
                  </div>
                ) : (
                  runHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-[1.4rem] border border-white/10 bg-[#0d1520] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {entry.endingTitle}
                          </div>
                          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[#ffb978]">
                            {entry.endingClass}
                          </div>
                        </div>
                        <div className="text-xs text-white/48">
                          {formatUpdatedAt(entry.createdAt)}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/68">
                          Trust {entry.trustScore}
                        </span>
                        <span className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/68">
                          Hype {entry.hypeScore}
                        </span>
                        <span className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/68">
                          {entry.durationMinutes}m run
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
            <section className="rounded-[2.2rem] border border-white/10 bg-[rgba(6,10,17,0.54)] p-6"><div className="text-xs uppercase tracking-[0.2em] text-white/46">Objective Board</div><div className="mt-4 space-y-3">{objectiveStates.map((objective) => <div key={objective.label} className="rounded-[1.5rem] border border-white/10 bg-[#0d1520] p-4"><div className="flex items-center justify-between gap-4"><div className="text-sm leading-7 text-white/72">{objective.label}</div><div className={`rounded-full px-3 py-2 text-[11px] uppercase tracking-[0.18em] ${objective.complete ? "bg-[rgba(121,240,214,0.12)] text-[#9ef5df]" : "bg-white/6 text-white/48"}`}>{objective.complete ? "Done" : "Open"}</div></div></div>)}</div></section>

            {campaign.companions.length > 0 && <section className="rounded-[2.2rem] border border-white/10 bg-[rgba(6,10,17,0.54)] p-6"><div className="flex items-center justify-between gap-3"><div className="text-xs uppercase tracking-[0.2em] text-white/46">Companions</div><div className="text-sm text-white/48">{campaign.companions.length} active</div></div><div className="mt-4 space-y-4">{campaign.companions.map((companion) => <div key={companion.id} className="rounded-[1.7rem] border border-white/10 p-4" style={{ backgroundImage: companion.gradient }}><div className="flex items-start justify-between gap-4"><div><div className="text-lg font-semibold text-white">{companion.name}</div><div className="mt-1 text-sm text-white/70">{companion.role}</div></div><div className="rounded-full bg-black/18 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/78">{getCompanionSignal(companion, progress)}</div></div><p className="mt-3 text-sm leading-7 text-white/82">{companion.agenda}</p></div>)}</div></section>}

            <section className="rounded-[2.2rem] border border-white/10 bg-[rgba(6,10,17,0.54)] p-6"><div className="text-xs uppercase tracking-[0.2em] text-white/46">Chapter Map</div><div className="mt-4 space-y-5">{actGroups.map((group) => <div key={group.actLabel}><div className="text-sm font-semibold text-white/74">{group.actLabel}</div><div className="mt-3 space-y-3">{group.items.map((episode) => { const isCurrent = !ending && episode.id === currentEpisode.id; const isVisited = progress.visitedEpisodeIds.includes(episode.id); const status = isCurrent ? "LIVE" : isVisited ? "DONE" : episode.step <= currentEpisode.step + 1 ? "READY" : "LOCKED"; return <div key={episode.id} className={`rounded-[1.4rem] border px-4 py-4 ${isCurrent ? "border-[#ffb36a]/45 bg-[rgba(255,179,106,0.1)]" : "border-white/10 bg-[#0d1520]"}`}><div className="flex items-center justify-between gap-3"><div><div className="text-[11px] uppercase tracking-[0.18em] text-white/42">{episode.chapterLabel}</div><div className="mt-2 text-sm font-semibold text-white">{episode.title}</div></div><div className="rounded-full border border-white/10 px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-white/62">{status}</div></div><div className="mt-2 text-sm text-white/56">{episode.slugline}</div></div>; })}</div></div>)}</div></section>

            <section className="rounded-[2.2rem] border border-white/10 bg-[rgba(6,10,17,0.54)] p-6"><div className="text-xs uppercase tracking-[0.2em] text-white/46">Decision Ledger</div><div className="mt-4 space-y-3">{progress.log.length === 0 ? <div className="rounded-[1.4rem] border border-dashed border-white/12 px-4 py-5 text-sm text-white/56">아직 기록된 선택이 없습니다. 첫 선택을 누르면 이 런의 로그와 시그니처가 누적됩니다.</div> : progress.log.map((entry) => <div key={`${entry.episodeId}-${entry.choiceId}-${entry.createdAt}`} className="rounded-[1.4rem] border border-white/10 bg-[#0d1520] p-4"><div className="text-[11px] uppercase tracking-[0.16em] text-[#ffb978]">{entry.episodeTitle}</div><div className="mt-2 text-lg font-semibold text-white">{entry.choiceLabel}</div><p className="mt-3 text-sm leading-7 text-white/66">{entry.resultDetail}</p></div>)}</div></section>
          </div>
        </section>
      </main>
    </div>
  );
}
