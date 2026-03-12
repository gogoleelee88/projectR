"use client";

import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  characterProfiles,
  creatorTemplates,
  featuredWorks,
  imageStylePresets,
  opsSignals,
  partyScenarios,
  productViews,
  storyEpisodes,
  type ProductView,
  type UserPreset,
  userPresets,
} from "@/data/platform";

type SessionState = {
  name: string;
  role: "player" | "creator" | "operator";
  membership: string;
  sparks: number;
  focus: string;
};

type StoryLog = {
  title: string;
  detail: string;
};

type ChatMessage = {
  id: string;
  sender: "user" | "character";
  text: string;
};

type PartyRound = {
  id: string;
  action: string;
  summary: string;
};

type GeneratedShot = {
  id: string;
  title: string;
  prompt: string;
  styleId: string;
  tagline: string;
};

type CreatorRelease = {
  id: string;
  title: string;
  module: string;
  pitch: string;
  price: string;
  projection: string;
  status: string;
};

type Snapshot = {
  session: SessionState | null;
  activeView: ProductView;
  selectedWorkId: string;
  selectedCharacterId: string;
  selectedPartyId: string;
  storyIndex: number;
  trustScore: number;
  hypeScore: number;
  storyLogs: StoryLog[];
  chatMessages: Record<string, ChatMessage[]>;
  partyRounds: PartyRound[];
  generatedShots: GeneratedShot[];
  creatorReleases: CreatorRelease[];
};

const STORAGE_KEY = "projectr.product-shell.v2";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

const moduleToView: Record<string, ProductView> = {
  story: "story",
  character: "character",
  "party-chat": "party",
  "image-studio": "studio",
  "creator-console": "creator",
  "trust-layer": "ops",
};

function createSession(preset: UserPreset): SessionState {
  return {
    name: preset.name,
    role: preset.role,
    membership: preset.membership,
    sparks: preset.sparks,
    focus: preset.focus,
  };
}

function createInitialStoryLogs(): StoryLog[] {
  const episode = storyEpisodes[0];
  return [
    {
      title: episode.title,
      detail: episode.scene,
    },
  ];
}

function createInitialChatState() {
  return Object.fromEntries(
    characterProfiles.map((character) => [
      character.id,
      [
        {
          id: `${character.id}-opening`,
          sender: "character",
          text: character.opener,
        },
      ],
    ]),
  ) as Record<string, ChatMessage[]>;
}

async function requestApi<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function ProductShell() {
  const searchParams = useSearchParams();
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<SessionState | null>(
    createSession(userPresets[0]),
  );
  const [activeView, setActiveView] = useState<ProductView>("discover");
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">(
    "checking",
  );
  const [feedWorks, setFeedWorks] = useState(featuredWorks);
  const [opsBoard, setOpsBoard] = useState(opsSignals);
  const [discoverSearch, setDiscoverSearch] = useState("");
  const [selectedWorkId, setSelectedWorkId] = useState(featuredWorks[0].id);
  const [selectedCharacterId, setSelectedCharacterId] = useState(
    characterProfiles[0].id,
  );
  const [selectedPartyId, setSelectedPartyId] = useState(partyScenarios[0].id);
  const [storyIndex, setStoryIndex] = useState(0);
  const [trustScore, setTrustScore] = useState(52);
  const [hypeScore, setHypeScore] = useState(48);
  const [storyLogs, setStoryLogs] = useState<StoryLog[]>(createInitialStoryLogs);
  const [chatMessages, setChatMessages] = useState(createInitialChatState);
  const [chatDraft, setChatDraft] = useState("");
  const [partyRounds, setPartyRounds] = useState<PartyRound[]>([]);
  const [imagePrompt, setImagePrompt] = useState("");
  const [selectedStyleId, setSelectedStyleId] = useState(imageStylePresets[0].id);
  const [generatedShots, setGeneratedShots] = useState<GeneratedShot[]>([]);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftPitch, setDraftPitch] = useState("");
  const [draftPrice, setDraftPrice] = useState("4900");
  const [draftModule, setDraftModule] = useState<ProductView>("creator");
  const [creatorReleases, setCreatorReleases] = useState<CreatorRelease[]>([]);
  const deferredSearch = useDeferredValue(discoverSearch);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (raw) {
      try {
        const snapshot = JSON.parse(raw) as Snapshot;
        setSession(snapshot.session);
        setActiveView(snapshot.activeView);
        setSelectedWorkId(snapshot.selectedWorkId);
        setSelectedCharacterId(snapshot.selectedCharacterId);
        setSelectedPartyId(snapshot.selectedPartyId);
        setStoryIndex(snapshot.storyIndex);
        setTrustScore(snapshot.trustScore);
        setHypeScore(snapshot.hypeScore);
        setStoryLogs(snapshot.storyLogs);
        setChatMessages(snapshot.chatMessages);
        setPartyRounds(snapshot.partyRounds);
        setGeneratedShots(snapshot.generatedShots);
        setCreatorReleases(snapshot.creatorReleases);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const snapshot: Snapshot = {
      session,
      activeView,
      selectedWorkId,
      selectedCharacterId,
      selectedPartyId,
      storyIndex,
      trustScore,
      hypeScore,
      storyLogs,
      chatMessages,
      partyRounds,
      generatedShots,
      creatorReleases,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [
    activeView,
    chatMessages,
    creatorReleases,
    generatedShots,
    hydrated,
    hypeScore,
    partyRounds,
    selectedCharacterId,
    selectedPartyId,
    selectedWorkId,
    session,
    storyIndex,
    storyLogs,
    trustScore,
  ]);

  useEffect(() => {
    const moduleParam = searchParams.get("module");

    if (!moduleParam) {
      return;
    }

    const nextView = moduleToView[moduleParam];

    if (nextView) {
      setActiveView(nextView);
    }
  }, [searchParams]);

  useEffect(() => {
    let alive = true;

    const bootstrapApi = async () => {
      const health = await requestApi<{ status: string }>("/health");

      if (!alive) {
        return;
      }

      if (!health) {
        setApiStatus("offline");
        return;
      }

      setApiStatus("online");

      const [remoteFeed, remoteOps, remoteReleases] = await Promise.all([
        requestApi<typeof featuredWorks>("/catalog/feed"),
        requestApi<typeof opsSignals>("/ops/signals"),
        requestApi<CreatorRelease[]>("/creator/releases"),
      ]);

      if (!alive) {
        return;
      }

      if (remoteFeed && remoteFeed.length > 0) {
        setFeedWorks(remoteFeed);
        setSelectedWorkId((current) =>
          remoteFeed.some((work) => work.id === current) ? current : remoteFeed[0].id,
        );
      }

      if (remoteOps && remoteOps.length > 0) {
        setOpsBoard(remoteOps);
      }

      if (remoteReleases) {
        setCreatorReleases(
          remoteReleases.map((release) => ({
            ...release,
            projection:
              "projection" in release ? release.projection : "월 수익 예측 준비 중",
            status: "status" in release ? release.status : "심사 대기",
          })),
        );
      }
    };

    void bootstrapApi();

    return () => {
      alive = false;
    };
  }, []);

  const filteredWorks = feedWorks.filter((work) => {
    const query = deferredSearch.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return [work.title, work.genre, work.summary, work.tags.join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  const selectedWork = feedWorks.find((work) => work.id === selectedWorkId) ?? feedWorks[0];
  const activeEpisode = storyEpisodes[Math.min(storyIndex, storyEpisodes.length - 1)];
  const activeCharacter =
    characterProfiles.find((character) => character.id === selectedCharacterId) ??
    characterProfiles[0];
  const activeChat = chatMessages[selectedCharacterId] ?? [];
  const activeParty =
    partyScenarios.find((scenario) => scenario.id === selectedPartyId) ??
    partyScenarios[0];
  const activeStyle =
    imageStylePresets.find((style) => style.id === selectedStyleId) ??
    imageStylePresets[0];

  const summaryMetrics = [
    {
      label: "오늘의 매출 잠재력",
      value: session
        ? `₩${(session.sparks * 128).toLocaleString("ko-KR")}`
        : "₩0",
      detail: "활성 상품, 시즌 패스, 스토어 구매 기반 예측",
    },
    {
      label: "실시간 작품 체험 수",
      value: "412,884",
      detail: "스토리, 캐릭터, 파티챗 동시 실행 기준",
    },
    {
      label: "UGC 발행 준비",
      value: `${creatorReleases.length + 14}개`,
      detail: "로컬 발행작과 추천 템플릿 합산",
    },
  ];

  const changeView = (view: ProductView) => {
    startTransition(() => {
      setActiveView(view);
    });
  };

  const activatePreset = async (preset: UserPreset) => {
    const remoteSession = await requestApi<SessionState>("/auth/session", {
      method: "POST",
      body: JSON.stringify({ presetId: preset.id }),
    });

    setSession(remoteSession ?? createSession(preset));

    if (preset.role === "creator") {
      changeView("creator");
      return;
    }

    if (preset.role === "operator") {
      changeView("ops");
      return;
    }

    changeView("discover");
  };

  const chooseStory = async (choiceId: string) => {
    const choice = activeEpisode.choices.find((entry) => entry.id === choiceId);

    if (!choice) {
      return;
    }

    const remoteResult = await requestApi<{
      title: string;
      detail: string;
      trustScore: number;
      hypeScore: number;
      nextEpisodeId: string;
    }>("/story/advance", {
      method: "POST",
      body: JSON.stringify({
        episodeId: activeEpisode.id,
        choiceId: choice.id,
        trustScore,
        hypeScore,
      }),
    });

    if (remoteResult) {
      setTrustScore(remoteResult.trustScore);
      setHypeScore(remoteResult.hypeScore);
      setStoryLogs((current) => [
        ...current,
        {
          title: remoteResult.title,
          detail: remoteResult.detail,
        },
      ]);
      setStoryIndex((current) => {
        const nextIndex = storyEpisodes.findIndex(
          (episode) => episode.id === remoteResult.nextEpisodeId,
        );
        return nextIndex >= 0 ? nextIndex : current;
      });
      return;
    }

    setTrustScore((current) => current + choice.trustDelta);
    setHypeScore((current) => current + choice.hypeDelta);
    setStoryLogs((current) => [
      ...current,
      {
        title: choice.label,
        detail: choice.result,
      },
    ]);
    setStoryIndex((current) =>
      Math.min(current + 1, storyEpisodes.length - 1),
    );
  };

  const resetStory = () => {
    setStoryIndex(0);
    setTrustScore(52);
    setHypeScore(48);
    setStoryLogs(createInitialStoryLogs());
  };

  const sendChat = async () => {
    const message = chatDraft.trim();

    if (!message) {
      return;
    }

    const remoteReply = await requestApi<{
      characterId: string;
      characterName: string;
      reply: string;
      tone: string;
    }>("/chat/respond", {
      method: "POST",
      body: JSON.stringify({
        characterId: selectedCharacterId,
        message,
        turnIndex: activeChat.length,
      }),
    });

    if (remoteReply) {
      setChatMessages((current) => ({
        ...current,
        [selectedCharacterId]: [
          ...(current[selectedCharacterId] ?? []),
          {
            id: `user-${Date.now()}`,
            sender: "user",
            text: message,
          },
          {
            id: `character-${Date.now() + 1}`,
            sender: "character",
            text: remoteReply.reply,
          },
        ],
      }));
      setChatDraft("");
      return;
    }

    const tone: keyof typeof activeCharacter.responsePools =
      message.includes("!") || message.length > 32
        ? "intense"
        : /좋아|보고|기억|비밀|사랑/.test(message)
          ? "intimate"
          : "calm";

    const pool = activeCharacter.responsePools[tone];
    const response = pool[activeChat.length % pool.length];

    setChatMessages((current) => ({
      ...current,
      [selectedCharacterId]: [
        ...(current[selectedCharacterId] ?? []),
        {
          id: `user-${Date.now()}`,
          sender: "user",
          text: message,
        },
        {
          id: `character-${Date.now() + 1}`,
          sender: "character",
          text: response,
        },
      ],
    }));
    setChatDraft("");
  };

  const resolveParty = async (action: string) => {
    const remoteResolution = await requestApi<{
      scenarioId: string;
      summary: string;
    }>("/party/resolve", {
      method: "POST",
      body: JSON.stringify({
        scenarioId: activeParty.id,
        action,
        turnIndex: partyRounds.length,
      }),
    });

    if (remoteResolution) {
      setPartyRounds((current) => [
        ...current,
        {
          id: `${Date.now()}-${current.length}`,
          action,
          summary: remoteResolution.summary,
        },
      ]);
      return;
    }

    const twist = activeParty.twists[partyRounds.length % activeParty.twists.length];
    const role = activeParty.playerRoles[partyRounds.length % activeParty.playerRoles.length];
    const summary = `${role} 포지션으로 "${action}"을 선택했습니다. ${twist}`;

    setPartyRounds((current) => [
      ...current,
      {
        id: `${Date.now()}-${current.length}`,
        action,
        summary,
      },
    ]);
  };

  const generateShot = async () => {
    const prompt = imagePrompt.trim();

    if (!prompt) {
      return;
    }

    const remoteShot = await requestApi<{
      title: string;
      prompt: string;
      styleId: string;
      tagline: string;
    }>("/studio/generate", {
      method: "POST",
      body: JSON.stringify({
        prompt,
        styleId: activeStyle.id,
        index: generatedShots.length,
      }),
    });

    if (remoteShot) {
      startTransition(() => {
        setGeneratedShots((current) => [
          {
            id: `${Date.now()}`,
            title: remoteShot.title,
            prompt: remoteShot.prompt,
            styleId: remoteShot.styleId,
            tagline: remoteShot.tagline,
          },
          ...current,
        ]);
      });
      setImagePrompt("");
      return;
    }

    startTransition(() => {
      setGeneratedShots((current) => [
        {
          id: `${Date.now()}`,
          title: `${activeStyle.name} Scene ${current.length + 1}`,
          prompt,
          styleId: activeStyle.id,
          tagline: `${activeStyle.palette} 기반의 공유용 키비주얼`,
        },
        ...current,
      ]);
    });

    setImagePrompt("");
  };

  const publishRelease = async () => {
    const title = draftTitle.trim();
    const pitch = draftPitch.trim();

    if (!title || !pitch) {
      return;
    }

    const remoteRelease = await requestApi<{
      id: string;
      title: string;
      module: string;
      pitch: string;
      price: number;
      projection: string;
      status: string;
    }>("/creator/releases", {
      method: "POST",
      body: JSON.stringify({
        title,
        module: draftModule,
        pitch,
        price: Number(draftPrice),
      }),
    });

    if (remoteRelease) {
      startTransition(() => {
        setCreatorReleases((current) => [
          {
            id: remoteRelease.id,
            title: remoteRelease.title,
            module: remoteRelease.module,
            pitch: remoteRelease.pitch,
            price: `${remoteRelease.price}`,
            projection: remoteRelease.projection,
            status: remoteRelease.status,
          },
          ...current,
        ]);
      });

      setDraftTitle("");
      setDraftPitch("");
      return;
    }

    const forecast = `월 ${(Number(draftPrice) * 1840).toLocaleString("ko-KR")}원 예상`;

    startTransition(() => {
      setCreatorReleases((current) => [
        {
          id: `${Date.now()}`,
          title,
          module: draftModule,
          pitch,
          price: draftPrice,
          projection: forecast,
          status: "심사 대기",
        },
        ...current,
      ]);
    });

    setDraftTitle("");
    setDraftPitch("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="space-y-4 rounded-[2rem] border border-white/10 bg-[var(--surface)] p-5">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-[var(--accent-soft)]">
            Live Product
          </div>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
            지금 바로 쓸 수 있는 로컬 제품 모드
          </h2>
          <p className="mt-3 text-sm leading-7 text-white/64">
            실제 API 대신 로컬 상태로 제품 흐름을 검증하는 단계입니다.
          </p>
        </div>

        <div className="rounded-[1.6rem] border border-white/10 bg-[var(--surface-strong)] p-4">
          <div className="text-sm text-white/60">세션</div>
          <div className="mt-2 font-[family-name:var(--font-display)] text-2xl text-white">
            {session?.name ?? "Guest"}
          </div>
          <div className="mt-1 text-sm text-white/64">
            {session?.membership ?? "무료 탐색 모드"}
          </div>
          <div className="mt-4 rounded-2xl bg-black/20 px-4 py-3 text-sm text-white/76">
            {session?.focus ?? "로그인하면 역할별 플로우로 바로 이동합니다."}
          </div>
          <div className="mt-4 inline-flex rounded-full border border-white/10 px-3 py-2 text-xs text-white/72">
            API {apiStatus}
          </div>
        </div>

        <div className="space-y-2">
          {productViews.map((view) => (
            <button
              key={view.id}
              type="button"
              onClick={() => changeView(view.id)}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                activeView === view.id
                  ? "border-[var(--accent)] bg-[rgba(247,107,28,0.16)] text-white"
                  : "border-white/10 bg-white/5 text-white/70"
              }`}
            >
              <div className="font-semibold">{view.label}</div>
              <div className="mt-1 text-xs text-white/54">{view.summary}</div>
            </button>
          ))}
        </div>

        <div className="rounded-[1.6rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-4">
          <div className="text-sm uppercase tracking-[0.2em] text-white/54">
            Quick Login
          </div>
          <div className="mt-3 space-y-2">
            {userPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  void activatePreset(preset);
                }}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-white">{preset.name}</div>
                  <div className="text-xs uppercase text-[var(--highlight)]">
                    {preset.role}
                  </div>
                </div>
                <div className="mt-1 text-xs text-white/56">{preset.membership}</div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="space-y-6">
        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-white/10 bg-[var(--surface)] p-6 lg:p-8">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/70">
              Production Candidate
            </div>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold leading-[0.98] text-[#fff7ed] md:text-5xl">
              설명용 랜딩을 넘어서 실제 사용자 행동이 발생하는 제품 셸
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-white/68 md:text-base">
              계정 역할 변경, 작품 탐색, 스토리 분기, 캐릭터 채팅, 파티 세션,
              이미지 장면 생성, 창작물 발행까지 모두 이 화면에서 체험할 수 있습니다.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => changeView("story")}
                className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#130e09]"
              >
                스토리 바로 시작
              </button>
              <button
                type="button"
                onClick={() => changeView("creator")}
                className="rounded-full border border-white/12 bg-white/6 px-5 py-3 text-sm font-semibold text-white/82"
              >
                작품 발행 모드
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            {summaryMetrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-[1.6rem] border border-white/10 bg-[var(--surface-strong)] p-5"
              >
                <div className="text-sm uppercase tracking-[0.18em] text-white/52">
                  {metric.label}
                </div>
                <div className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--highlight)]">
                  {metric.value}
                </div>
                <p className="mt-3 text-sm leading-7 text-white/64">{metric.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {activeView === "discover" && (
          <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
            <div className="rounded-[2rem] border border-white/10 bg-[var(--surface)] p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm uppercase tracking-[0.2em] text-[var(--accent-soft)]">
                    Discover Feed
                  </div>
                  <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold text-white">
                    실제 유저가 들어와서 고를 수 있는 발견 화면
                  </h2>
                </div>
                <input
                  value={discoverSearch}
                  onChange={(event) => setDiscoverSearch(event.target.value)}
                  placeholder="장르, 작품명, 태그 검색"
                  className="w-full rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none md:max-w-xs"
                />
              </div>
              <div className="mt-6 grid gap-4">
                {filteredWorks.map((work) => (
                  <button
                    key={work.id}
                    type="button"
                    onClick={() => {
                      setSelectedWorkId(work.id);
                      changeView(work.module);
                    }}
                    className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-left transition hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-[var(--accent-soft)]">
                          {work.label}
                        </div>
                        <div className="mt-2 font-[family-name:var(--font-display)] text-2xl text-white">
                          {work.title}
                        </div>
                      </div>
                      <div className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/68">
                        {work.genre}
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-white/68">{work.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {work.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-white/7 px-3 py-2 text-xs text-white/72"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[2rem] border border-white/10 bg-[var(--surface-strong)] p-6">
                <div className="text-sm uppercase tracking-[0.18em] text-white/54">
                  Selected Work
                </div>
                <h3 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-white">
                  {selectedWork.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-white/68">
                  {selectedWork.summary}
                </p>
                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl bg-black/20 px-4 py-4 text-sm text-white/74">
                    {selectedWork.metrics.concurrent}
                  </div>
                  <div className="rounded-2xl bg-black/20 px-4 py-4 text-sm text-white/74">
                    {selectedWork.metrics.conversion}
                  </div>
                  <div className="rounded-2xl bg-black/20 px-4 py-4 text-sm text-white/74">
                    {selectedWork.metrics.retention}
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {selectedWork.hooks.map((hook) => (
                    <span
                      key={hook}
                      className="rounded-full border border-white/10 px-3 py-2 text-xs text-[var(--highlight)]"
                    >
                      {hook}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeView === "story" && (
          <section className="grid gap-4 xl:grid-cols-[1fr_0.82fr]">
            <div className="rounded-[2rem] border border-white/10 bg-[var(--surface)] p-6">
              <div className="text-sm uppercase tracking-[0.18em] text-[var(--accent-soft)]">
                Story Runtime
              </div>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-white">
                {activeEpisode.title}
              </h2>
              <p className="mt-4 text-base leading-8 text-white/72">
                {activeEpisode.scene}
              </p>
              <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-white/5 p-5 text-sm leading-7 text-white/70">
                {activeEpisode.stakes}
              </div>
              <div className="mt-6 grid gap-3">
                {activeEpisode.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => {
                      void chooseStory(choice.id);
                    }}
                    className="rounded-[1.4rem] border border-white/10 bg-[rgba(255,255,255,0.04)] px-5 py-4 text-left transition hover:border-[var(--accent)]"
                  >
                    <div className="font-semibold text-white">{choice.label}</div>
                    <div className="mt-1 text-xs text-white/56">
                      신뢰 {choice.trustDelta >= 0 ? "+" : ""}
                      {choice.trustDelta} / 화제 {choice.hypeDelta >= 0 ? "+" : ""}
                      {choice.hypeDelta}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[2rem] border border-white/10 bg-[var(--surface-strong)] p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm uppercase tracking-[0.18em] text-white/54">
                    Story Signals
                  </div>
                  <button
                    type="button"
                    onClick={resetStory}
                    className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/72"
                  >
                    리셋
                  </button>
                </div>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl bg-black/20 px-4 py-4">
                    <div className="text-xs uppercase text-white/54">Trust</div>
                    <div className="mt-2 text-3xl font-semibold text-[var(--highlight)]">
                      {trustScore}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-black/20 px-4 py-4">
                    <div className="text-xs uppercase text-white/54">Hype</div>
                    <div className="mt-2 text-3xl font-semibold text-[var(--accent-soft)]">
                      {hypeScore}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-6">
                <div className="text-sm uppercase tracking-[0.18em] text-white/54">
                  Timeline
                </div>
                <div className="mt-4 space-y-3">
                  {storyLogs.map((entry, index) => (
                    <div
                      key={`${entry.title}-${index}`}
                      className="rounded-2xl border border-white/8 bg-white/4 px-4 py-4"
                    >
                      <div className="font-semibold text-white">{entry.title}</div>
                      <p className="mt-2 text-sm leading-7 text-white/66">
                        {entry.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeView === "character" && (
          <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="rounded-[2rem] border border-white/10 bg-[var(--surface)] p-6">
              <div className="text-sm uppercase tracking-[0.18em] text-[var(--accent-soft)]">
                Character Lineup
              </div>
              <div className="mt-4 space-y-3">
                {characterProfiles.map((character) => (
                  <button
                    key={character.id}
                    type="button"
                    onClick={() => setSelectedCharacterId(character.id)}
                    className={`w-full rounded-[1.4rem] border px-4 py-4 text-left ${
                      selectedCharacterId === character.id
                        ? "border-[var(--accent)] bg-[rgba(247,107,28,0.12)]"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="font-semibold text-white">{character.name}</div>
                    <div className="mt-1 text-sm text-white/60">{character.role}</div>
                    <p className="mt-3 text-sm leading-7 text-white/66">{character.vibe}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[var(--surface-strong)] p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm uppercase tracking-[0.18em] text-white/54">
                    Live Chat
                  </div>
                  <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-white">
                    {activeCharacter.name}
                  </h2>
                </div>
                <div className="rounded-full border border-white/10 px-4 py-2 text-xs text-[var(--highlight)]">
                  {activeCharacter.role}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {activeChat.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[88%] rounded-[1.4rem] px-4 py-3 text-sm leading-7 ${
                      message.sender === "user"
                        ? "ml-auto bg-[rgba(247,107,28,0.16)] text-[#fff7ed]"
                        : "bg-black/20 text-white/78"
                    }`}
                  >
                    {message.text}
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-3 md:flex-row">
                <textarea
                  value={chatDraft}
                  onChange={(event) => setChatDraft(event.target.value)}
                  placeholder="대사를 입력하면 캐릭터가 반응합니다."
                  className="min-h-28 flex-1 rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4 text-sm text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    void sendChat();
                  }}
                  className="rounded-[1.4rem] bg-[var(--accent)] px-5 py-4 text-sm font-semibold text-[#130e09] md:w-36"
                >
                  전송
                </button>
              </div>
            </div>
          </section>
        )}

        {activeView === "party" && (
          <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
            <div className="rounded-[2rem] border border-white/10 bg-[var(--surface)] p-6">
              <div className="text-sm uppercase tracking-[0.18em] text-[var(--accent-soft)]">
                Party Rooms
              </div>
              <div className="mt-4 space-y-3">
                {partyScenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => {
                      setSelectedPartyId(scenario.id);
                      setPartyRounds([]);
                    }}
                    className={`w-full rounded-[1.4rem] border px-4 py-4 text-left ${
                      selectedPartyId === scenario.id
                        ? "border-[var(--accent)] bg-[rgba(247,107,28,0.12)]"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="font-semibold text-white">{scenario.title}</div>
                    <p className="mt-3 text-sm leading-7 text-white/66">
                      {scenario.premise}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[2rem] border border-white/10 bg-[var(--surface-strong)] p-6">
                <div className="text-sm uppercase tracking-[0.18em] text-white/54">
                  Current Room
                </div>
                <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-white">
                  {activeParty.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-white/68">
                  {activeParty.premise}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {activeParty.playerRoles.map((role) => (
                    <span
                      key={role}
                      className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/72"
                    >
                      {role}
                    </span>
                  ))}
                </div>
                <div className="mt-6 grid gap-3">
                  {activeParty.actions.map((action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => {
                        void resolveParty(action);
                      }}
                      className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4 text-left text-sm text-white/78"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-6">
                <div className="text-sm uppercase tracking-[0.18em] text-white/54">
                  Resolution Log
                </div>
                <div className="mt-4 space-y-3">
                  {partyRounds.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/12 px-4 py-5 text-sm text-white/52">
                      행동을 선택하면 AI 턴 결과 로그가 쌓입니다.
                    </div>
                  )}
                  {partyRounds.map((round) => (
                    <div
                      key={round.id}
                      className="rounded-[1.4rem] border border-white/8 bg-white/4 px-4 py-4"
                    >
                      <div className="font-semibold text-white">{round.action}</div>
                      <p className="mt-2 text-sm leading-7 text-white/66">
                        {round.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeView === "studio" && (
          <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[2rem] border border-white/10 bg-[var(--surface)] p-6">
              <div className="text-sm uppercase tracking-[0.18em] text-[var(--accent-soft)]">
                Prompt Studio
              </div>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-white">
                장면 생성과 공유 카드 제작
              </h2>
              <textarea
                value={imagePrompt}
                onChange={(event) => setImagePrompt(event.target.value)}
                placeholder="예: 새벽의 네온 항구, 왕좌를 점화한 주인공, 비에 젖은 검"
                className="mt-5 min-h-36 w-full rounded-[1.6rem] border border-white/10 bg-black/20 px-4 py-4 text-sm text-white outline-none"
              />
              <div className="mt-5 grid gap-3">
                {imageStylePresets.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setSelectedStyleId(style.id)}
                    className={`rounded-[1.4rem] border px-4 py-4 text-left ${
                      selectedStyleId === style.id
                        ? "border-[var(--accent)] bg-[rgba(247,107,28,0.12)]"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="font-semibold text-white">{style.name}</div>
                    <div className="mt-1 text-xs text-white/54">{style.palette}</div>
                    <p className="mt-2 text-sm leading-7 text-white/66">{style.summary}</p>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  void generateShot();
                }}
                className="mt-5 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#130e09]"
              >
                장면 생성
              </button>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[var(--surface-strong)] p-6">
              <div className="text-sm uppercase tracking-[0.18em] text-white/54">
                Generated Shots
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {generatedShots.length === 0 && (
                  <div className="rounded-[1.6rem] border border-dashed border-white/12 px-5 py-6 text-sm leading-7 text-white/52">
                    프롬프트를 입력하면 스타일별 공유용 비주얼 카드가 생성됩니다.
                  </div>
                )}
                {generatedShots.map((shot) => {
                  const style =
                    imageStylePresets.find((entry) => entry.id === shot.styleId) ??
                    imageStylePresets[0];

                  return (
                    <div
                      key={shot.id}
                      className="rounded-[1.6rem] border border-white/10 p-5"
                      style={{ backgroundImage: style.gradient }}
                    >
                      <div className="rounded-full bg-black/20 px-3 py-2 text-xs uppercase tracking-[0.16em] text-white/70">
                        {style.name}
                      </div>
                      <div className="mt-12 font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
                        {shot.title}
                      </div>
                      <p className="mt-3 text-sm leading-7 text-white/86">{shot.prompt}</p>
                      <div className="mt-4 text-xs uppercase tracking-[0.16em] text-[#fff7ed]">
                        {shot.tagline}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {activeView === "creator" && (
          <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4">
              <div className="rounded-[2rem] border border-white/10 bg-[var(--surface)] p-6">
                <div className="text-sm uppercase tracking-[0.18em] text-[var(--accent-soft)]">
                  Creator Console
                </div>
                <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-white">
                  작품을 바로 조합하고 발행 대기열에 넣기
                </h2>
                <div className="mt-5 grid gap-3">
                  <input
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    placeholder="작품명"
                    className="rounded-[1.3rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                  />
                  <textarea
                    value={draftPitch}
                    onChange={(event) => setDraftPitch(event.target.value)}
                    placeholder="작품 한 줄 설명과 핵심 갈등"
                    className="min-h-32 rounded-[1.3rem] border border-white/10 bg-black/20 px-4 py-4 text-sm text-white outline-none"
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <select
                      value={draftModule}
                      onChange={(event) => setDraftModule(event.target.value as ProductView)}
                      className="rounded-[1.3rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                    >
                      <option value="story">Story</option>
                      <option value="character">Character</option>
                      <option value="party">Party Chat</option>
                      <option value="creator">Creator IP</option>
                    </select>
                    <input
                      value={draftPrice}
                      onChange={(event) => setDraftPrice(event.target.value)}
                      placeholder="가격"
                      className="rounded-[1.3rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void publishRelease();
                  }}
                  className="mt-5 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#130e09]"
                >
                  발행 큐에 추가
                </button>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-6">
                <div className="text-sm uppercase tracking-[0.18em] text-white/54">
                  Launch Templates
                </div>
                <div className="mt-4 space-y-3">
                  {creatorTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="rounded-[1.4rem] border border-white/8 bg-white/4 px-4 py-4"
                    >
                      <div className="font-semibold text-white">{template.title}</div>
                      <div className="mt-1 text-sm text-white/54">{template.audience}</div>
                      <p className="mt-2 text-sm leading-7 text-white/66">
                        {template.monetization}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {template.outline.map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/70"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[var(--surface-strong)] p-6">
              <div className="text-sm uppercase tracking-[0.18em] text-white/54">
                Release Queue
              </div>
              <div className="mt-4 space-y-3">
                {creatorReleases.length === 0 && (
                  <div className="rounded-[1.4rem] border border-dashed border-white/12 px-4 py-5 text-sm text-white/52">
                    아직 발행 대기열이 없습니다. 작품을 추가하면 예상 수익과 상태가 표시됩니다.
                  </div>
                )}
                {creatorReleases.map((release) => (
                  <div
                    key={release.id}
                    className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-[family-name:var(--font-display)] text-2xl text-white">
                          {release.title}
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--highlight)]">
                          {release.module}
                        </div>
                      </div>
                      <div className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/72">
                        {release.status}
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-white/66">{release.pitch}</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl bg-black/20 px-4 py-3 text-sm text-white/74">
                        판매가 ₩{Number(release.price).toLocaleString("ko-KR")}
                      </div>
                      <div className="rounded-2xl bg-black/20 px-4 py-3 text-sm text-white/74">
                        {release.projection}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeView === "ops" && (
          <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[2rem] border border-white/10 bg-[var(--surface)] p-6">
              <div className="text-sm uppercase tracking-[0.18em] text-[var(--accent-soft)]">
                Ops Board
              </div>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-white">
                라이브 운영과 세이프티를 위한 관제 화면
              </h2>
              <div className="mt-5 grid gap-3">
                {opsBoard.map((signal) => (
                  <div
                    key={signal.label}
                    className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4"
                  >
                    <div className="text-sm text-white/58">{signal.label}</div>
                    <div className="mt-2 font-[family-name:var(--font-display)] text-3xl text-white">
                      {signal.value}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--highlight)]">
                      {signal.tone}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[var(--surface-strong)] p-6">
              <div className="text-sm uppercase tracking-[0.18em] text-white/54">
                Operational Focus
              </div>
              <div className="mt-4 space-y-3">
                {[
                  "신고 큐를 모듈별로 분배하고 심각도별 응답 시간을 다르게 설정",
                  "모델 장애 시 대체 모델과 대체 UX를 동시에 라우팅",
                  "신예 작품 상승률을 감지해 홈 피드와 푸시 실험에 자동 반영",
                  "고가 상품 이탈 구간을 찾아 가격과 보상 세트를 실험",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.4rem] border border-white/8 bg-white/4 px-4 py-4 text-sm leading-7 text-white/68"
                  >
                    {item}
                  </div>
                ))}
              </div>
              {session?.role !== "operator" && (
                <div className="mt-5 rounded-[1.5rem] border border-dashed border-[var(--accent)] px-4 py-5 text-sm leading-7 text-[#fff0dd]">
                  현재 계정은 운영자 전용 기능을 읽기 전용으로 보고 있습니다. Quick
                  Login에서 `Mina`를 선택하면 운영자 관점 세션으로 전환됩니다.
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
