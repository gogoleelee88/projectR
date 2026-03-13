"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FeaturedWork, StoryChoice, StoryEpisode } from "@/data/platform";
import { requestApi } from "@/lib/projectr-api";

type StoryPlayerShellProps = {
  work: FeaturedWork;
  episodes: StoryEpisode[];
};

type StoryAdvanceResult = {
  title: string;
  detail: string;
  trustScore: number;
  hypeScore: number;
  nextEpisodeId: string;
};

type StoryLogEntry = {
  episodeId: string;
  episodeTitle: string;
  choiceId: string;
  choiceLabel: string;
  resultTitle: string;
  resultDetail: string;
  trustScore: number;
  hypeScore: number;
  createdAt: string;
};

type StoryProgress = {
  currentEpisodeId: string;
  trustScore: number;
  hypeScore: number;
  log: StoryLogEntry[];
  updatedAt: string;
};

const STORAGE_PREFIX = "projectr.story-progress.v1";

function storageKey(workId: string) {
  return `${STORAGE_PREFIX}.${workId}`;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

function createInitialProgress(episodes: StoryEpisode[]): StoryProgress {
  return {
    currentEpisodeId: episodes[0]?.id ?? "",
    trustScore: 50,
    hypeScore: 50,
    log: [],
    updatedAt: "",
  };
}

function formatUpdatedAt(value: string) {
  if (!value) {
    return "이번 세션에서 아직 저장된 진행 기록이 없습니다.";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function resolveLocalAdvanceResult(
  choice: StoryChoice,
  currentEpisode: StoryEpisode,
  episodes: StoryEpisode[],
  currentIndex: number,
  progress: StoryProgress,
): StoryAdvanceResult {
  return {
    title: choice.label,
    detail: choice.result,
    trustScore: clampScore(progress.trustScore + choice.trustDelta),
    hypeScore: clampScore(progress.hypeScore + choice.hypeDelta),
    nextEpisodeId:
      choice.nextEpisodeId ??
      episodes[Math.min(currentIndex + 1, episodes.length - 1)]?.id ??
      currentEpisode.id,
  };
}

export function StoryPlayerShell({ work, episodes }: StoryPlayerShellProps) {
  const [progress, setProgress] = useState<StoryProgress>(() =>
    createInitialProgress(episodes),
  );
  const [pendingChoiceId, setPendingChoiceId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey(work.id));
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as StoryProgress;
      if (
        parsed.currentEpisodeId &&
        episodes.some((episode) => episode.id === parsed.currentEpisodeId)
      ) {
        setProgress(parsed);
        return;
      }
    } catch {
      // Ignore invalid persisted state and reset below.
    }

    const initial = createInitialProgress(episodes);
    setProgress(initial);
    window.localStorage.setItem(storageKey(work.id), JSON.stringify(initial));
  }, [episodes, work.id]);

  const currentEpisode = useMemo(
    () =>
      episodes.find((episode) => episode.id === progress.currentEpisodeId) ??
      episodes[0] ??
      null,
    [episodes, progress.currentEpisodeId],
  );
  const currentIndex = currentEpisode
    ? Math.max(episodes.findIndex((episode) => episode.id === currentEpisode.id), 0)
    : 0;
  const completion =
    episodes.length > 0 ? Math.round(((currentIndex + 1) / episodes.length) * 100) : 0;
  const latestLog = progress.log[0] ?? null;
  const finaleReached =
    Boolean(currentEpisode) &&
    currentIndex === episodes.length - 1 &&
    progress.log.some((entry) => entry.episodeId === currentEpisode?.id);

  const persistProgress = (nextProgress: StoryProgress) => {
    setProgress(nextProgress);
    window.localStorage.setItem(storageKey(work.id), JSON.stringify(nextProgress));
  };

  const choose = async (choice: StoryChoice) => {
    if (!currentEpisode || pendingChoiceId) {
      return;
    }

    setPendingChoiceId(choice.id);
    setMessage("");

    const response = await requestApi<StoryAdvanceResult>("/story/advance", {
      method: "POST",
      body: JSON.stringify({
        episodeId: currentEpisode.id,
        choiceId: choice.id,
        trustScore: progress.trustScore,
        hypeScore: progress.hypeScore,
      }),
    });

    setPendingChoiceId(null);

    const resolvedResponse =
      response ??
      resolveLocalAdvanceResult(choice, currentEpisode, episodes, currentIndex, progress);

    setMessage(
      response
        ? ""
        : "백엔드 연결이 없어도 로컬 스토리 엔진으로 이어서 진행합니다.",
    );

    const nextEpisode =
      episodes.find((episode) => episode.id === resolvedResponse.nextEpisodeId) ??
      currentEpisode;
    const nextProgress: StoryProgress = {
      currentEpisodeId: nextEpisode.id,
      trustScore: resolvedResponse.trustScore,
      hypeScore: resolvedResponse.hypeScore,
      updatedAt: new Date().toISOString(),
      log: [
        {
          episodeId: currentEpisode.id,
          episodeTitle: currentEpisode.title,
          choiceId: choice.id,
          choiceLabel: choice.label,
          resultTitle: resolvedResponse.title,
          resultDetail: resolvedResponse.detail,
          trustScore: resolvedResponse.trustScore,
          hypeScore: resolvedResponse.hypeScore,
          createdAt: new Date().toISOString(),
        },
        ...progress.log,
      ].slice(0, 18),
    };

    persistProgress(nextProgress);
  };

  const restart = () => {
    const nextProgress = createInitialProgress(episodes);
    setMessage("");
    persistProgress(nextProgress);
  };

  if (!currentEpisode) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#221d33_0%,#0c1018_55%,#07090e_100%)] text-white">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 lg:px-8">
        <section className="rounded-[2.2rem] border border-white/10 bg-[linear-gradient(135deg,#1a2030_0%,#1b2a45_40%,#7b4dff_135%)] p-7 lg:p-9">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-xs uppercase tracking-[0.24em] text-[#f7dcbf]">
                Story Runtime
              </div>
              <h1 className="mt-3 text-4xl font-semibold text-[#fff7ed] md:text-5xl">
                {work.title}
              </h1>
              <p className="mt-4 text-sm leading-8 text-white/78 md:text-base">
                {work.summary}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {work.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/12 bg-white/10 px-3 py-2 text-xs text-white/82"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["진행률", `${completion}%`, `${currentIndex + 1} / ${episodes.length} 장면`],
                ["신뢰", String(progress.trustScore), "캐릭터와 세계가 당신을 믿는 정도"],
                ["하이프", String(progress.hypeScore), "서사의 긴장감과 폭발력"],
              ].map(([label, value, detail]) => (
                <div
                  key={label}
                  className="rounded-[1.4rem] border border-white/12 bg-[rgba(7,10,17,0.28)] p-4"
                >
                  <div className="text-xs uppercase tracking-[0.18em] text-white/52">
                    {label}
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
                  <div className="mt-2 text-sm text-white/64">{detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-7 h-2 rounded-full bg-black/25">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#ffd38b_0%,#f76b1c_50%,#7c62ff_100%)]"
              style={{ width: `${completion}%` }}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/detail/work/${work.id}`}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#121722]"
            >
              작품 상세
            </Link>
            <a
              href="/?tab=story"
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/74"
            >
              스토리 홈
            </a>
            <button
              type="button"
              onClick={restart}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/74"
            >
              처음부터 다시
            </button>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[#ffb978]">
                    Chapter {currentIndex + 1}
                  </div>
                  <h2 className="mt-2 text-3xl font-semibold text-white">
                    {currentEpisode.title}
                  </h2>
                </div>
                <div className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/64">
                  마지막 저장 {formatUpdatedAt(progress.updatedAt)}
                </div>
              </div>
              <p className="mt-5 text-base leading-9 text-white/78">{currentEpisode.scene}</p>
              <div className="mt-5 rounded-[1.4rem] border border-[#f76b1c]/30 bg-[rgba(247,107,28,0.08)] px-4 py-4 text-sm leading-7 text-[#fff0dc]">
                Stakes: {currentEpisode.stakes}
              </div>
            </div>

            {latestLog && (
              <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,#171824,#121f37)] p-6">
                <div className="text-xs uppercase tracking-[0.2em] text-[#79f0d6]">
                  Latest Beat
                </div>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {latestLog.choiceLabel}
                </h3>
                <p className="mt-3 text-sm leading-8 text-white/72">{latestLog.resultDetail}</p>
              </div>
            )}

            <div className="rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-6">
              <div className="text-xs uppercase tracking-[0.2em] text-white/46">Choices</div>
              <div className="mt-4 grid gap-4">
                {currentEpisode.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => {
                      void choose(choice);
                    }}
                    disabled={Boolean(pendingChoiceId)}
                    className="rounded-[1.6rem] border border-white/10 bg-[#0d1520] p-5 text-left transition hover:border-[#f76b1c]/40 hover:bg-[#131b29] disabled:opacity-60"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xl font-semibold text-white">{choice.label}</div>
                      <div className="flex gap-2 text-xs">
                        <span className="rounded-full border border-white/10 px-3 py-2 text-white/72">
                          Trust {choice.trustDelta >= 0 ? `+${choice.trustDelta}` : choice.trustDelta}
                        </span>
                        <span className="rounded-full border border-white/10 px-3 py-2 text-white/72">
                          Hype {choice.hypeDelta >= 0 ? `+${choice.hypeDelta}` : choice.hypeDelta}
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-white/62">{choice.result}</p>
                  </button>
                ))}
              </div>
              {message && <div className="mt-4 text-sm text-[#ffd8c2]">{message}</div>}
              {finaleReached && (
                <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-7 text-white/72">
                  마지막 장면까지 도달했습니다. 다음 단계에서는 엔딩 분기 리포트와 결과
                  보드를 붙여 시즌 단위 리텐션 루프까지 확장할 수 있습니다.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-6">
              <div className="text-xs uppercase tracking-[0.2em] text-white/46">Runboard</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.4rem] border border-white/10 bg-[#0d1520] p-4">
                  <div className="text-sm text-white/52">장르</div>
                  <div className="mt-2 text-lg font-semibold text-white">{work.genre}</div>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-[#0d1520] p-4">
                  <div className="text-sm text-white/52">선택 수</div>
                  <div className="mt-2 text-lg font-semibold text-white">{progress.log.length}</div>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-[#0d1520] p-4">
                  <div className="text-sm text-white/52">동시 체감</div>
                  <div className="mt-2 text-lg font-semibold text-white">{work.metrics.concurrent}</div>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-[#0d1520] p-4">
                  <div className="text-sm text-white/52">전환율</div>
                  <div className="mt-2 text-lg font-semibold text-white">{work.metrics.conversion}</div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-6">
              <div className="text-xs uppercase tracking-[0.2em] text-white/46">
                Decision Ledger
              </div>
              <div className="mt-4 space-y-3">
                {progress.log.length === 0 && (
                  <div className="rounded-[1.4rem] border border-dashed border-white/12 px-4 py-5 text-sm text-white/56">
                    아직 기록된 선택이 없습니다. 첫 선택을 누르면 로그와 이어보기가
                    저장됩니다.
                  </div>
                )}
                {progress.log.map((entry) => (
                  <div
                    key={`${entry.episodeId}-${entry.choiceId}-${entry.createdAt}`}
                    className="rounded-[1.4rem] border border-white/10 bg-[#0d1520] p-4"
                  >
                    <div className="text-xs uppercase tracking-[0.16em] text-[#ffb978]">
                      {entry.episodeTitle}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">{entry.choiceLabel}</div>
                    <p className="mt-3 text-sm leading-7 text-white/66">{entry.resultDetail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
