"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  billingPlans,
  type BillingPlan,
  type BootstrapPayload,
  type CharacterProfile,
  characterProfiles,
  creatorTemplates,
  featuredWorks,
  imageStylePresets,
  opsSignals,
  partyScenarios,
  productViews,
  type ReleaseRecord,
  type StoryEpisode,
  type SubscriptionRecord,
  storyEpisodes,
  type ProductView,
  type UserPreset,
  userPresets,
} from "@/data/platform";

type SessionState = {
  id: string;
  email?: string | null;
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

type CreatorRelease = ReleaseRecord;

type AuthSessionPayload = {
  token: string;
  expiresAt: string;
  user: SessionState;
};

type CheckoutPayload = {
  purchaseId: string;
  subscriptionId: string;
  status: string;
  planId: string;
  renewalAt: string;
  checkoutUrl?: string | null;
  provider?: string;
};

type ProductShellProps = {
  initialData?: BootstrapPayload | null;
  initialApiStatus?: "online" | "offline";
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

type AuthMode = "login" | "register";

type PartyParticipant = {
  id: string;
  name: string;
  role: string;
};

type PartyRealtimeLogEntry = {
  id: string;
  actorName: string;
  action: string;
  summary: string;
  createdAt: string;
};

type PartyRealtimeSession = {
  sessionId: string;
  inviteCode: string;
  scenarioId: string;
  scenarioTitle: string;
  status: string;
  participants: PartyParticipant[];
  log: PartyRealtimeLogEntry[];
  participantId?: string | null;
};

const STORAGE_KEY = "projectr.product-shell.v2";
const AUTH_TOKEN_KEY = "projectr.auth-token.v1";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
const FALLBACK_BOOTSTRAP: BootstrapPayload = {
  presets: userPresets,
  feed: featuredWorks,
  episodes: storyEpisodes,
  characters: characterProfiles,
  partyScenarios,
  styles: imageStylePresets,
  creatorTemplates,
  opsSignals,
  plans: billingPlans,
  subscriptions: [],
  releases: [],
};

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
    id: preset.id,
    email: preset.email ?? null,
    name: preset.name,
    role: preset.role,
    membership: preset.membership,
    sparks: preset.sparks,
    focus: preset.focus,
  };
}

function resolveBootstrap(initialData?: BootstrapPayload | null): BootstrapPayload {
  if (!initialData) {
    return FALLBACK_BOOTSTRAP;
  }

  return {
    presets: initialData.presets.length > 0 ? initialData.presets : FALLBACK_BOOTSTRAP.presets,
    feed: initialData.feed.length > 0 ? initialData.feed : FALLBACK_BOOTSTRAP.feed,
    episodes:
      initialData.episodes.length > 0 ? initialData.episodes : FALLBACK_BOOTSTRAP.episodes,
    characters:
      initialData.characters.length > 0
        ? initialData.characters
        : FALLBACK_BOOTSTRAP.characters,
    partyScenarios:
      initialData.partyScenarios.length > 0
        ? initialData.partyScenarios
        : FALLBACK_BOOTSTRAP.partyScenarios,
    styles: initialData.styles.length > 0 ? initialData.styles : FALLBACK_BOOTSTRAP.styles,
    creatorTemplates:
      initialData.creatorTemplates.length > 0
        ? initialData.creatorTemplates
        : FALLBACK_BOOTSTRAP.creatorTemplates,
    opsSignals:
      initialData.opsSignals.length > 0
        ? initialData.opsSignals
        : FALLBACK_BOOTSTRAP.opsSignals,
    plans: initialData.plans.length > 0 ? initialData.plans : FALLBACK_BOOTSTRAP.plans,
    subscriptions: initialData.subscriptions,
    releases: initialData.releases,
  };
}

function createInitialStoryLogs(episodes: StoryEpisode[]): StoryLog[] {
  const episode = episodes[0];

  if (!episode) {
    return [];
  }

  return [
    {
      title: episode.title,
      detail: episode.scene,
    },
  ];
}

function createInitialChatState(characters: CharacterProfile[]) {
  return Object.fromEntries(
    characters.map((character) => [
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

function normalizeRelease(
  release: Pick<
    CreatorRelease,
    "id" | "title" | "module" | "pitch" | "price" | "projection" | "status"
  > &
    Partial<Pick<CreatorRelease, "createdAt">>,
): CreatorRelease {
  return {
    ...release,
    price: Number(release.price),
    createdAt: release.createdAt ?? new Date().toISOString(),
  };
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

    if (response.status === 204) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function ProductShell({
  initialData,
  initialApiStatus = initialData ? "online" : "offline",
}: ProductShellProps) {
  const initialBootstrap = resolveBootstrap(initialData);
  const searchParams = useSearchParams();
  const partySocketRef = useRef<WebSocket | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authRole, setAuthRole] = useState<SessionState["role"]>("player");
  const [authMessage, setAuthMessage] = useState("");
  const [authPending, setAuthPending] = useState(false);
  const [activeView, setActiveView] = useState<ProductView>("discover");
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">(
    initialApiStatus,
  );
  const [presetUsers, setPresetUsers] = useState(initialBootstrap.presets);
  const [feedWorks, setFeedWorks] = useState(initialBootstrap.feed);
  const [storyArc, setStoryArc] = useState(initialBootstrap.episodes);
  const [characterRoster, setCharacterRoster] = useState(initialBootstrap.characters);
  const [partyRooms, setPartyRooms] = useState(initialBootstrap.partyScenarios);
  const [styleLibrary, setStyleLibrary] = useState(initialBootstrap.styles);
  const [templateLibrary, setTemplateLibrary] = useState(initialBootstrap.creatorTemplates);
  const [opsBoard, setOpsBoard] = useState(initialBootstrap.opsSignals);
  const [billingCatalog, setBillingCatalog] = useState(initialBootstrap.plans);
  const [subscriptions, setSubscriptions] = useState(initialBootstrap.subscriptions);
  const [discoverSearch, setDiscoverSearch] = useState("");
  const [selectedWorkId, setSelectedWorkId] = useState(initialBootstrap.feed[0].id);
  const [selectedCharacterId, setSelectedCharacterId] = useState(
    initialBootstrap.characters[0].id,
  );
  const [selectedPartyId, setSelectedPartyId] = useState(initialBootstrap.partyScenarios[0].id);
  const [storyIndex, setStoryIndex] = useState(0);
  const [trustScore, setTrustScore] = useState(52);
  const [hypeScore, setHypeScore] = useState(48);
  const [storyLogs, setStoryLogs] = useState<StoryLog[]>(() =>
    createInitialStoryLogs(initialBootstrap.episodes),
  );
  const [chatMessages, setChatMessages] = useState(() =>
    createInitialChatState(initialBootstrap.characters),
  );
  const [chatDraft, setChatDraft] = useState("");
  const [partyRounds, setPartyRounds] = useState<PartyRound[]>([]);
  const [imagePrompt, setImagePrompt] = useState("");
  const [selectedStyleId, setSelectedStyleId] = useState(initialBootstrap.styles[0].id);
  const [generatedShots, setGeneratedShots] = useState<GeneratedShot[]>([]);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftPitch, setDraftPitch] = useState("");
  const [draftPrice, setDraftPrice] = useState("4900");
  const [draftModule, setDraftModule] = useState<ProductView>("creator");
  const [creatorReleases, setCreatorReleases] = useState<CreatorRelease[]>(
    initialBootstrap.releases.map(normalizeRelease),
  );
  const [selectedPlanId, setSelectedPlanId] = useState(
    initialBootstrap.plans.find((plan) => plan.id !== "free")?.id ??
      initialBootstrap.plans[0].id,
  );
  const [billingMessage, setBillingMessage] = useState("");
  const [partyParticipantName, setPartyParticipantName] = useState("");
  const [partyInviteCodeInput, setPartyInviteCodeInput] = useState("");
  const [partySession, setPartySession] = useState<PartyRealtimeSession | null>(null);
  const [partyConnection, setPartyConnection] = useState<
    "idle" | "connecting" | "live" | "offline"
  >("idle");
  const [partyMessage, setPartyMessage] = useState("");
  const deferredSearch = useDeferredValue(discoverSearch);

  const applyBootstrapPayload = useEffectEvent((payload: BootstrapPayload) => {
    setPresetUsers(payload.presets);
    setFeedWorks(payload.feed);
    setStoryArc(payload.episodes);
    setCharacterRoster(payload.characters);
    setPartyRooms(payload.partyScenarios);
    setStyleLibrary(payload.styles);
    setTemplateLibrary(payload.creatorTemplates);
    setOpsBoard(payload.opsSignals);
    setBillingCatalog(payload.plans);
    setSubscriptions(payload.subscriptions);
    setCreatorReleases(payload.releases.map(normalizeRelease));
    setSelectedWorkId((current) =>
      payload.feed.some((work) => work.id === current) ? current : payload.feed[0].id,
    );
    setSelectedCharacterId((current) =>
      payload.characters.some((character) => character.id === current)
        ? current
        : payload.characters[0].id,
    );
    setSelectedPartyId((current) =>
      payload.partyScenarios.some((scenario) => scenario.id === current)
        ? current
        : payload.partyScenarios[0].id,
    );
    setSelectedStyleId((current) =>
      payload.styles.some((style) => style.id === current) ? current : payload.styles[0].id,
    );
    setSelectedPlanId((current) =>
      payload.plans.some((plan) => plan.id === current)
        ? current
        : payload.plans.find((plan) => plan.id !== "free")?.id ?? payload.plans[0].id,
    );
  });

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const storedToken = window.localStorage.getItem(AUTH_TOKEN_KEY);

    if (raw) {
      try {
        const snapshot = JSON.parse(raw) as Snapshot;
        const restoredPreset =
          initialBootstrap.presets.find((preset) => preset.name === snapshot.session?.name) ??
          initialBootstrap.presets[0];

        setSession(
          snapshot.session
            ? {
                id: snapshot.session.id ?? restoredPreset.id,
                email: snapshot.session.email ?? restoredPreset.email ?? null,
                name: snapshot.session.name,
                role: snapshot.session.role,
                membership: snapshot.session.membership,
                sparks: snapshot.session.sparks,
                focus: snapshot.session.focus,
              }
            : null,
        );
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
        setCreatorReleases(snapshot.creatorReleases.map(normalizeRelease));
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    if (storedToken) {
      setAuthToken(storedToken);
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (authToken) {
      window.localStorage.setItem(AUTH_TOKEN_KEY, authToken);
      return;
    }

    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }, [authToken, hydrated]);

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
    if (!hydrated || !authToken) {
      return;
    }

    let alive = true;

    const restoreAuthSession = async () => {
      const me = await requestApi<SessionState>("/auth/me", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!alive) {
        return;
      }

      if (!me) {
        setAuthToken(null);
        setSession(null);
        return;
      }

      setSession(me);
      setPartyParticipantName((current) => current || me.name);
    };

    void restoreAuthSession();

    return () => {
      alive = false;
    };
  }, [authToken, hydrated]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const matchingPlan = billingCatalog.find((plan) => plan.name === session.membership);

    if (matchingPlan) {
      setSelectedPlanId(matchingPlan.id);
    }
  }, [billingCatalog, session]);

  useEffect(() => {
    if (!partyParticipantName && session?.name) {
      setPartyParticipantName(session.name);
    }
  }, [partyParticipantName, session?.name]);

  useEffect(() => {
    let alive = true;

    const bootstrapApi = async () => {
      const query = session?.id ? `?userId=${encodeURIComponent(session.id)}` : "";
      const bootstrap = await requestApi<BootstrapPayload>(`/bootstrap${query}`);

      if (!alive) {
        return;
      }

      if (!bootstrap) {
        setApiStatus("offline");
        return;
      }

      setApiStatus("online");
      applyBootstrapPayload(resolveBootstrap(bootstrap));
    };

    if (hydrated) {
      void bootstrapApi();
    }

    return () => {
      alive = false;
    };
  }, [hydrated, session?.id]);

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
  const activeEpisode = storyArc[Math.min(storyIndex, storyArc.length - 1)];
  const activeCharacter =
    characterRoster.find((character) => character.id === selectedCharacterId) ??
    characterRoster[0];
  const activeChat = chatMessages[selectedCharacterId] ?? [];
  const activeParty =
    partyRooms.find((scenario) => scenario.id === selectedPartyId) ?? partyRooms[0];
  const activeStyle =
    styleLibrary.find((style) => style.id === selectedStyleId) ?? styleLibrary[0];
  const selectedPlan =
    billingCatalog.find((plan) => plan.id === selectedPlanId) ?? billingCatalog[0];
  const activeSubscription =
    session == null
      ? null
      : subscriptions.find(
          (subscription) =>
            subscription.userId === session.id && subscription.status === "active",
        ) ?? null;

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

  const disconnectPartySocket = useEffectEvent(() => {
    if (partySocketRef.current) {
      partySocketRef.current.close();
      partySocketRef.current = null;
    }
    setPartyConnection("idle");
  });

  const connectPartySocket = useEffectEvent(
    (sessionId: string, knownParticipantId?: string | null) => {
    if (typeof window === "undefined") {
      return;
    }

    if (partySocketRef.current) {
      partySocketRef.current.close();
    }

    const wsBase = API_BASE.startsWith("https://")
      ? API_BASE.replace("https://", "wss://")
      : API_BASE.replace("http://", "ws://");

    try {
      setPartyConnection("connecting");
      const socket = new window.WebSocket(`${wsBase}/party/ws/${sessionId}`);
      partySocketRef.current = socket;

      socket.onopen = () => {
        setPartyConnection("live");
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as {
            type?: string;
            session?: PartyRealtimeSession;
          };
          const liveSession = payload.session;
          if (!liveSession) {
            return;
          }

          setPartySession((current) => ({
            ...liveSession,
            participantId:
              knownParticipantId ??
              (current?.sessionId === liveSession.sessionId
                ? current.participantId ?? liveSession.participantId
                : liveSession.participantId),
          }));
          setSelectedPartyId(liveSession.scenarioId);
        } catch {
          setPartyConnection("offline");
        }
      };

      socket.onerror = () => {
        setPartyConnection("offline");
      };

      socket.onclose = () => {
        setPartyConnection((current) => (current === "idle" ? current : "offline"));
      };
    } catch {
      setPartyConnection("offline");
    }
    },
  );

  const clearLiveParty = () => {
    disconnectPartySocket();
    setPartySession(null);
    setPartyMessage("");
  };

  useEffect(() => {
    return () => {
      disconnectPartySocket();
    };
  }, [disconnectPartySocket]);

  const changeView = (view: ProductView) => {
    startTransition(() => {
      setActiveView(view);
    });
  };

  const routeRoleHome = (role: SessionState["role"]) => {
    if (role === "creator") {
      changeView("creator");
      return;
    }

    if (role === "operator") {
      changeView("ops");
      return;
    }

    changeView("discover");
  };

  const submitAuth = async () => {
    const email = authEmail.trim().toLowerCase();
    const password = authPassword.trim();
    const name = authName.trim();

    if (!email || !password || (authMode === "register" && !name)) {
      setAuthMessage("이름, 이메일, 비밀번호를 모두 입력해 주세요.");
      return;
    }

    setAuthPending(true);
    setAuthMessage("");

    const payload =
      authMode === "register"
        ? {
            name,
            email,
            password,
            role: authRole,
          }
        : {
            email,
            password,
          };

    const response = await requestApi<AuthSessionPayload>(
      authMode === "register" ? "/auth/register" : "/auth/login",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );

    setAuthPending(false);

    if (!response) {
      setAuthMessage(
        authMode === "register"
          ? "회원가입에 실패했습니다. 이미 사용 중인 이메일인지 확인해 주세요."
          : "로그인에 실패했습니다. 이메일과 비밀번호를 확인해 주세요.",
      );
      return;
    }

    setAuthToken(response.token);
    setSession(response.user);
    setPartyParticipantName(response.user.name);
    setAuthMessage(
      authMode === "register"
        ? `${response.user.name} 계정이 생성되었습니다.`
        : `${response.user.name} 계정으로 로그인했습니다.`,
    );
    setAuthPassword("");
    routeRoleHome(response.user.role);
  };

  const logoutSession = async () => {
    if (authToken) {
      await requestApi("/auth/session", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
    }

    setAuthToken(null);
    setSession(null);
    setAuthMessage("로그아웃되었습니다.");
    setBillingMessage("");
    clearLiveParty();
  };

  const activatePreset = async (preset: UserPreset) => {
    const remoteSession = await requestApi<AuthSessionPayload>("/auth/session", {
      method: "POST",
      body: JSON.stringify({ presetId: preset.id }),
    });

    const nextSession = remoteSession?.user ?? createSession(preset);
    setAuthToken(remoteSession?.token ?? null);
    setSession(nextSession);
    setPartyParticipantName(nextSession.name);
    setBillingMessage("");
    routeRoleHome(preset.role);
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
        const nextIndex = storyArc.findIndex(
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
    setStoryIndex((current) => Math.min(current + 1, storyArc.length - 1));
  };

  const resetStory = () => {
    setStoryIndex(0);
    setTrustScore(52);
    setHypeScore(48);
    setStoryLogs(createInitialStoryLogs(storyArc));
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
    if (partySession?.participantId && partySession.sessionId) {
      const remoteSession = await requestApi<PartyRealtimeSession>(
        `/party/sessions/${partySession.sessionId}/actions`,
        {
          method: "POST",
          body: JSON.stringify({
            participantId: partySession.participantId,
            action,
          }),
        },
      );

      if (remoteSession) {
        setPartySession(remoteSession);
        setPartyMessage(`"${action}" 액션이 룸에 반영되었습니다.`);
        return;
      }
    }

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
      createdAt: string;
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
          normalizeRelease(remoteRelease),
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
          price: Number(draftPrice),
          projection: forecast,
          status: "심사 대기",
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);
    });

    setDraftTitle("");
    setDraftPitch("");
  };

  const createLiveParty = async () => {
    const participantName = partyParticipantName.trim() || session?.name;

    if (!participantName) {
      setPartyMessage("파티 참가 이름을 먼저 입력해 주세요.");
      return;
    }

    const response = await requestApi<PartyRealtimeSession>("/party/sessions", {
      method: "POST",
      body: JSON.stringify({
        scenarioId: activeParty.id,
        participantName,
        userId: session?.id ?? null,
      }),
    });

    if (!response) {
      setPartyMessage("라이브 파티 룸을 만들지 못했습니다.");
      return;
    }

    setPartySession(response);
    setPartyMessage(`초대 코드 ${response.inviteCode}로 참가자를 초대할 수 있습니다.`);
    connectPartySocket(response.sessionId, response.participantId);
  };

  const joinLiveParty = async () => {
    const inviteCode = partyInviteCodeInput.trim().toUpperCase();
    const participantName = partyParticipantName.trim() || session?.name;

    if (!inviteCode || !participantName) {
      setPartyMessage("초대 코드와 참가 이름을 입력해 주세요.");
      return;
    }

    const response = await requestApi<PartyRealtimeSession>("/party/sessions/join", {
      method: "POST",
      body: JSON.stringify({
        inviteCode,
        participantName,
        userId: session?.id ?? null,
      }),
    });

    if (!response) {
      setPartyMessage("파티 룸에 참가하지 못했습니다. 초대 코드를 확인해 주세요.");
      return;
    }

    setPartySession(response);
    setSelectedPartyId(response.scenarioId);
    setPartyMessage(`${response.scenarioTitle} 룸에 참가했습니다.`);
    connectPartySocket(response.sessionId, response.participantId);
  };

  const checkoutPlan = async (plan: BillingPlan) => {
    if (!session) {
      setBillingMessage("먼저 로그인한 뒤 멤버십을 시작할 수 있습니다.");
      return;
    }

    if (plan.price === 0) {
      setSession((current) =>
        current
          ? {
              ...current,
              membership: plan.name,
            }
          : current,
      );
      setBillingMessage("Explorer 플랜이 활성화되었습니다.");
      return;
    }

    const checkout = await requestApi<CheckoutPayload>("/billing/checkout", {
      method: "POST",
      body: JSON.stringify({
        userId: session.id,
        planId: plan.id,
        sku: `${plan.id}-monthly`,
        category: "subscription",
        amount: plan.price,
        currency: "KRW",
      }),
    });

    if (!checkout) {
      setBillingMessage("결제 세션을 만들지 못했습니다.");
      return;
    }

    if (checkout.checkoutUrl && typeof window !== "undefined") {
      window.open(checkout.checkoutUrl, "_blank", "noopener,noreferrer");
    }

    if (checkout.status === "paid") {
      setSession((current) =>
        current
          ? {
              ...current,
              membership: plan.name,
            }
          : current,
      );
    }

    const remoteBootstrap = await requestApi<BootstrapPayload>(
      `/bootstrap?userId=${encodeURIComponent(session.id)}`,
    );

    if (remoteBootstrap) {
      applyBootstrapPayload(resolveBootstrap(remoteBootstrap));
    } else {
      const remoteSubscriptions = await requestApi<SubscriptionRecord[]>(
        `/billing/subscriptions?userId=${encodeURIComponent(session.id)}`,
      );

      if (remoteSubscriptions) {
        setSubscriptions(remoteSubscriptions);
      }
    }

    setBillingMessage(
      `${
        checkout.status === "paid" ? `${plan.name} 결제가 완료되었습니다.` : `${plan.name} 결제가 ${checkout.status} 상태입니다.`
      }${
        checkout.provider ? ` (${checkout.provider})` : ""
      } 다음 갱신일 ${new Date(checkout.renewalAt).toLocaleDateString("ko-KR")}`,
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="space-y-4 rounded-[2rem] border border-white/10 bg-[var(--surface)] p-5">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-[var(--accent-soft)]">
            Live Product
          </div>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
            서버 데이터로 구동되는 제품 콘솔
          </h2>
          <p className="mt-3 text-sm leading-7 text-white/64">
            인증, 피드, 릴리즈, 구독 상태를 같은 런타임 안에서 검증하는 단계입니다.
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
          {session?.email && (
            <div className="mt-3 text-xs text-white/52">{session.email}</div>
          )}
          {session && (
            <button
              type="button"
              onClick={() => {
                void logoutSession();
              }}
              className="mt-4 w-full rounded-full border border-white/10 px-4 py-3 text-sm text-white/76"
            >
              로그아웃
            </button>
          )}
        </div>

        <div className="rounded-[1.6rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm uppercase tracking-[0.2em] text-white/54">
              Account
            </div>
            <button
              type="button"
              onClick={() => {
                setAuthMode((current) => (current === "login" ? "register" : "login"));
                setAuthMessage("");
              }}
              className="text-xs text-[var(--highlight)]"
            >
              {authMode === "login" ? "회원가입" : "로그인"}
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {authMode === "register" && (
              <>
                <input
                  value={authName}
                  onChange={(event) => setAuthName(event.target.value)}
                  placeholder="이름"
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                />
                <select
                  value={authRole}
                  onChange={(event) => setAuthRole(event.target.value as SessionState["role"])}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="player">Player</option>
                  <option value="creator">Creator</option>
                  <option value="operator">Operator</option>
                </select>
              </>
            )}
            <input
              value={authEmail}
              onChange={(event) => setAuthEmail(event.target.value)}
              placeholder="이메일"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
            />
            <input
              type="password"
              value={authPassword}
              onChange={(event) => setAuthPassword(event.target.value)}
              placeholder="비밀번호"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
            />
            <button
              type="button"
              onClick={() => {
                void submitAuth();
              }}
              disabled={authPending}
              className="w-full rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#130e09] disabled:opacity-50"
            >
              {authPending
                ? "처리 중..."
                : authMode === "login"
                  ? "이메일 로그인"
                  : "계정 만들기"}
            </button>
          </div>
          {authMessage && (
            <div className="mt-3 rounded-2xl bg-black/20 px-4 py-3 text-sm text-white/76">
              {authMessage}
            </div>
          )}
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
            {presetUsers.map((preset) => (
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

        <div className="rounded-[1.6rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm uppercase tracking-[0.2em] text-white/54">
              Membership
            </div>
            <div className="text-xs text-white/56">
              {activeSubscription?.planName ?? session?.membership ?? "Guest"}
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {billingCatalog.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlanId(plan.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  selectedPlanId === plan.id
                    ? "border-[var(--accent)] bg-[rgba(247,107,28,0.12)]"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-white">{plan.name}</div>
                  <div className="text-xs uppercase text-[var(--highlight)]">
                    {plan.price === 0 ? "Free" : `₩${plan.price.toLocaleString("ko-KR")}`}
                  </div>
                </div>
                <div className="mt-1 text-xs text-white/56">{plan.billingInterval}</div>
              </button>
            ))}
          </div>
          {selectedPlan && (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedPlan.perks.slice(0, 3).map((perk) => (
                  <span
                    key={perk}
                    className="rounded-full border border-white/10 px-3 py-2 text-[11px] text-white/72"
                  >
                    {perk}
                  </span>
                ))}
              </div>
              <div className="mt-4 text-xs leading-6 text-white/58">
                {activeSubscription
                  ? `다음 갱신일 ${new Date(activeSubscription.renewalAt).toLocaleDateString(
                      "ko-KR",
                    )}`
                  : "활성 구독이 없으면 선택한 플랜으로 즉시 결제할 수 있습니다."}
              </div>
              <button
                type="button"
                onClick={() => {
                  void checkoutPlan(selectedPlan);
                }}
                className="mt-4 w-full rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#130e09]"
              >
                {selectedPlan.price === 0
                  ? "Explorer 활성화"
                  : `${selectedPlan.name} 시작`}
              </button>
            </>
          )}
          {billingMessage && (
            <div className="mt-3 rounded-2xl bg-black/20 px-4 py-3 text-sm text-white/76">
              {billingMessage}
            </div>
          )}
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
                {characterRoster.map((character) => (
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
                {partyRooms.map((scenario) => (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => {
                      if (partySession && partySession.scenarioId !== scenario.id) {
                        clearLiveParty();
                      }
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

              <div className="mt-4 rounded-[1.6rem] border border-white/10 bg-black/20 p-4">
                <div className="text-sm uppercase tracking-[0.18em] text-white/54">
                  Live Session
                </div>
                <div className="mt-3 space-y-3">
                  <input
                    value={partyParticipantName}
                    onChange={(event) => setPartyParticipantName(event.target.value)}
                    placeholder="참가 이름"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        void createLiveParty();
                      }}
                      className="rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[#130e09]"
                    >
                      룸 만들기
                    </button>
                    <input
                      value={partyInviteCodeInput}
                      onChange={(event) => setPartyInviteCodeInput(event.target.value.toUpperCase())}
                      placeholder="초대 코드"
                      className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void joinLiveParty();
                    }}
                    className="w-full rounded-full border border-white/10 px-4 py-3 text-sm text-white/78"
                  >
                    초대 코드로 참가
                  </button>
                  <div className="inline-flex rounded-full border border-white/10 px-3 py-2 text-xs text-white/70">
                    Realtime {partyConnection}
                  </div>
                  {partyMessage && (
                    <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/72">
                      {partyMessage}
                    </div>
                  )}
                  {partySession && (
                    <button
                      type="button"
                      onClick={clearLiveParty}
                      className="w-full rounded-full border border-white/10 px-4 py-3 text-sm text-white/70"
                    >
                      라이브 룸 종료
                    </button>
                  )}
                </div>
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
                {partySession && partySession.scenarioId === activeParty.id && (
                  <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-white/54">
                          Invite
                        </div>
                        <div className="mt-1 font-[family-name:var(--font-display)] text-2xl text-white">
                          {partySession.inviteCode}
                        </div>
                      </div>
                      <div className="text-sm text-white/58">
                        {partySession.participants.length} participants
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {partySession.participants.map((participant) => (
                        <span
                          key={participant.id}
                          className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/72"
                        >
                          {participant.name} · {participant.role}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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
                  {partySession && partySession.log.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/12 px-4 py-5 text-sm text-white/52">
                      라이브 참가자가 액션을 고르면 룸 로그가 여기 쌓입니다.
                    </div>
                  )}
                  {!partySession && partyRounds.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/12 px-4 py-5 text-sm text-white/52">
                      행동을 선택하면 AI 턴 결과 로그가 쌓입니다.
                    </div>
                  )}
                  {partySession?.log.map((round) => (
                    <div
                      key={round.id}
                      className="rounded-[1.4rem] border border-white/8 bg-white/4 px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold text-white">{round.action}</div>
                        <div className="text-xs text-white/48">
                          {new Date(round.createdAt).toLocaleTimeString("ko-KR")}
                        </div>
                      </div>
                      <div className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--highlight)]">
                        {round.actorName}
                      </div>
                      <p className="mt-2 text-sm leading-7 text-white/66">
                        {round.summary}
                      </p>
                    </div>
                  ))}
                  {!partySession &&
                    partyRounds.map((round) => (
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
                {styleLibrary.map((style) => (
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
                    styleLibrary.find((entry) => entry.id === shot.styleId) ??
                    styleLibrary[0];

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
                  {templateLibrary.map((template) => (
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
