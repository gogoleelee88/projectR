"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CharacterProfile, FeaturedWork } from "@/data/platform";
import {
  AUTH_TOKEN_KEY,
  fetchCurrentSession,
  requestAuthorizedApi,
} from "@/lib/projectr-api";

type CharacterChatShellProps = {
  character: CharacterProfile;
  relatedWork?: FeaturedWork | null;
};

type ChatMessage = {
  id: string;
  sender: "user" | "character";
  text: string;
  tone: string;
  createdAt: string;
};

type RewardUnlock = {
  id: string;
  rewardId: string;
  title: string;
  summary: string;
  affinityThreshold: number;
  sparksAwarded: number;
  unlockedAt: string;
};

type NextReward = {
  rewardId: string;
  title: string;
  summary: string;
  affinityThreshold: number;
  remainingAffinity: number;
  sparksAwarded: number;
};

type RewardGrant = {
  awarded: boolean;
  rewardId: string;
  title: string;
  summary: string;
  sparksAwarded: number;
  affinityThreshold: number;
  grantedAt: string;
};

type CharacterChatState = {
  characterId: string;
  characterName: string;
  role: string;
  vibe: string;
  opener: string;
  affinityScore: number;
  bondLevel: string;
  conversationCount: number;
  streakCount: number;
  lastTone: string;
  lastMessageAt: string;
  messages: ChatMessage[];
  unlockedRewards: RewardUnlock[];
  nextReward: NextReward | null;
  totalSparks: number;
  latestRewardGrant: RewardGrant | null;
  syncedAt: string;
};

type CharacterChatSendResponse = {
  characterId: string;
  characterName: string;
  reply: string;
  tone: string;
  affinityDelta: number;
  state: CharacterChatState;
  latestRewardGrant: RewardGrant | null;
};

type RewardCatalogEntry = {
  id: string;
  title: string;
  summary: string;
  affinityThreshold: number;
  sparksAwarded: number;
};

const STORAGE_PREFIX = "projectr.character-chat.v1";

const rewardCatalog: Record<string, RewardCatalogEntry[]> = {
  astra: [
    {
      id: "orbit-key",
      title: "Orbit Key Memory",
      summary: "Private orbit notes and a locked callback scene open.",
      affinityThreshold: 18,
      sparksAwarded: 180,
    },
    {
      id: "inner-ring",
      title: "Inner Ring Voice Drop",
      summary: "Astra opens the intimate voice-note lane.",
      affinityThreshold: 42,
      sparksAwarded: 320,
    },
    {
      id: "zero-g-vow",
      title: "Zero-G Vow Route",
      summary: "The premium vow route is now available.",
      affinityThreshold: 72,
      sparksAwarded: 560,
    },
  ],
  noir: [
    {
      id: "black-card",
      title: "Black Card Pass",
      summary: "After-hours market access is now open.",
      affinityThreshold: 16,
      sparksAwarded: 160,
    },
    {
      id: "velvet-deal",
      title: "Velvet Deal",
      summary: "Noir opens the risk-heavy premium room.",
      affinityThreshold: 40,
      sparksAwarded: 300,
    },
    {
      id: "midnight-contract",
      title: "Midnight Contract",
      summary: "The top-tier contract route has been unlocked.",
      affinityThreshold: 70,
      sparksAwarded: 540,
    },
  ],
};

function storageKey(characterId: string) {
  return `${STORAGE_PREFIX}.${characterId}`;
}

function catalogForCharacter(characterId: string): RewardCatalogEntry[] {
  return (
    rewardCatalog[characterId] ?? [
      {
        id: "warm-signal",
        title: "Warm Signal",
        summary: "A personal callback route opens for this character.",
        affinityThreshold: 18,
        sparksAwarded: 160,
      },
      {
        id: "inner-circle",
        title: "Inner Circle",
        summary: "A stronger memory callback set unlocks.",
        affinityThreshold: 42,
        sparksAwarded: 300,
      },
      {
        id: "signature-route",
        title: "Signature Route",
        summary: "The premium relationship route is unlocked.",
        affinityThreshold: 70,
        sparksAwarded: 520,
      },
    ]
  );
}

function detectTone(message: string): "calm" | "intense" | "intimate" {
  if (message.includes("!") || message.length > 32) {
    return "intense";
  }
  if (
    /trust|remember|secret|again|promise|always|좋아|기억|비밀|약속|사랑/i.test(
      message,
    )
  ) {
    return "intimate";
  }
  return "calm";
}

function getAffinityGain(
  message: string,
  tone: ChatMessage["tone"],
  conversationCount: number,
) {
  const baseGain = tone === "intimate" ? 11 : tone === "intense" ? 8 : 6;
  let bonus = 0;

  if (message.trim().length >= 40) {
    bonus += 2;
  }
  if (message.includes("?")) {
    bonus += 1;
  }
  if (conversationCount === 0) {
    bonus += 2;
  }
  if (
    /trust|remember|secret|again|promise|always|좋아|기억|비밀|약속|사랑/i.test(
      message,
    )
  ) {
    bonus += 3;
  }

  return Math.min(16, baseGain + bonus);
}

function getBondLevel(score: number) {
  if (score >= 70) return "Locked Constellation";
  if (score >= 42) return "Inner Ring";
  if (score >= 18) return "Open Orbit";
  return "Signal Warm-up";
}

function formatTime(value: string) {
  if (!value) return "Not synced yet";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildInitialState(character: CharacterProfile): CharacterChatState {
  const rewards = catalogForCharacter(character.id);
  const firstReward = rewards[0] ?? null;
  return {
    characterId: character.id,
    characterName: character.name,
    role: character.role,
    vibe: character.vibe,
    opener: character.opener,
    affinityScore: 0,
    bondLevel: "Signal Warm-up",
    conversationCount: 0,
    streakCount: 0,
    lastTone: "calm",
    lastMessageAt: "",
    messages: [],
    unlockedRewards: [],
    nextReward:
      firstReward === null
        ? null
        : {
            rewardId: firstReward.id,
            title: firstReward.title,
            summary: firstReward.summary,
            affinityThreshold: firstReward.affinityThreshold,
            remainingAffinity: firstReward.affinityThreshold,
            sparksAwarded: firstReward.sparksAwarded,
          },
    totalSparks: 0,
    latestRewardGrant: null,
    syncedAt: "",
  };
}

function sanitizeState(
  character: CharacterProfile,
  candidate: CharacterChatState,
): CharacterChatState {
  const initial = buildInitialState(character);
  return {
    ...initial,
    ...candidate,
    characterId: character.id,
    characterName: candidate.characterName || character.name,
    role: candidate.role || character.role,
    vibe: candidate.vibe || character.vibe,
    opener: candidate.opener || character.opener,
    messages: Array.isArray(candidate.messages) ? candidate.messages.slice(-48) : [],
    unlockedRewards: Array.isArray(candidate.unlockedRewards)
      ? candidate.unlockedRewards
      : [],
  };
}

function applyGuestSend(
  current: CharacterChatState,
  character: CharacterProfile,
  message: string,
) {
  const tone = detectTone(message);
  const pool = character.responsePools[tone];
  const reply = pool[current.conversationCount % pool.length] ?? character.opener;
  const affinityDelta = getAffinityGain(message, tone, current.conversationCount);
  const affinityScore = Math.min(100, current.affinityScore + affinityDelta);
  const now = new Date().toISOString();
  const unlockedIds = new Set(current.unlockedRewards.map((entry) => entry.rewardId));
  const unlockedRewards = [...current.unlockedRewards];
  let totalSparks = current.totalSparks;
  let latestRewardGrant: RewardGrant | null = null;

  for (const reward of catalogForCharacter(character.id)) {
    if (affinityScore < reward.affinityThreshold || unlockedIds.has(reward.id)) {
      continue;
    }
    unlockedRewards.unshift({
      id: `${character.id}-${reward.id}`,
      rewardId: reward.id,
      title: reward.title,
      summary: reward.summary,
      affinityThreshold: reward.affinityThreshold,
      sparksAwarded: reward.sparksAwarded,
      unlockedAt: now,
    });
    totalSparks += reward.sparksAwarded;
    latestRewardGrant = {
      awarded: true,
      rewardId: reward.id,
      title: reward.title,
      summary: reward.summary,
      sparksAwarded: reward.sparksAwarded,
      affinityThreshold: reward.affinityThreshold,
      grantedAt: now,
    };
  }

  const nextRewardEntry =
    catalogForCharacter(character.id).find(
      (entry) =>
        !unlockedRewards.some((reward) => reward.rewardId === entry.id) &&
        entry.affinityThreshold > affinityScore,
    ) ?? null;

  const nextState: CharacterChatState = {
    ...current,
    affinityScore,
    bondLevel: getBondLevel(affinityScore),
    conversationCount: current.conversationCount + 1,
    streakCount: Math.min(current.streakCount + 1, 7),
    lastTone: tone,
    lastMessageAt: now,
    messages: [
      ...current.messages,
      {
        id: `user-${now}`,
        sender: "user" as const,
        text: message,
        tone,
        createdAt: now,
      },
      {
        id: `character-${now}`,
        sender: "character" as const,
        text: reply,
        tone,
        createdAt: now,
      },
    ].slice(-48),
    unlockedRewards,
    nextReward:
      nextRewardEntry === null
        ? null
        : {
            rewardId: nextRewardEntry.id,
            title: nextRewardEntry.title,
            summary: nextRewardEntry.summary,
            affinityThreshold: nextRewardEntry.affinityThreshold,
            remainingAffinity: Math.max(
              0,
              nextRewardEntry.affinityThreshold - affinityScore,
            ),
            sparksAwarded: nextRewardEntry.sparksAwarded,
          },
    totalSparks,
    latestRewardGrant,
    syncedAt: now,
  };

  return {
    nextState,
    reply,
    tone,
    affinityDelta,
    latestRewardGrant,
  };
}

export function CharacterChatShell({
  character,
  relatedWork,
}: CharacterChatShellProps) {
  const [chatState, setChatState] = useState<CharacterChatState>(() =>
    buildInitialState(character),
  );
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [syncMode, setSyncMode] = useState<
    "guest" | "syncing" | "synced" | "offline"
  >("guest");
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [messageNotice, setMessageNotice] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey(character.id));
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CharacterChatState;
        setChatState(sanitizeState(character, parsed));
      } catch {
        window.localStorage.removeItem(storageKey(character.id));
      }
    } else {
      setChatState(buildInitialState(character));
    }

    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setAuthToken(null);
      setSyncMode("guest");
      return;
    }

    let active = true;
    setSyncMode("syncing");

    void (async () => {
      const session = await fetchCurrentSession(token);
      if (!active) return;

      if (!session) {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
        setAuthToken(null);
        setSyncMode("guest");
        return;
      }

      setAuthToken(token);
      const payload = await requestAuthorizedApi<CharacterChatState>(
        `/chat/state?characterId=${encodeURIComponent(character.id)}`,
        token,
      );

      if (!active) return;

      if (!payload) {
        setSyncMode("offline");
        return;
      }

      const sanitized = sanitizeState(character, payload);
      setChatState(sanitized);
      window.localStorage.setItem(storageKey(character.id), JSON.stringify(sanitized));
      setSyncMode("synced");
    })();

    return () => {
      active = false;
    };
  }, [character]);

  useEffect(() => {
    window.localStorage.setItem(storageKey(character.id), JSON.stringify(chatState));
  }, [character.id, chatState]);

  const quickPrompts = useMemo(
    () => [
      `${character.name}, what did you hide from everyone else?`,
      `Tell me the next move you trust only me with.`,
      `What would make tonight unforgettable for us?`,
    ],
    [character.name],
  );

  const sendMessage = async () => {
    const message = draft.trim();
    if (!message || pending) {
      return;
    }

    setPending(true);
    setMessageNotice("");

    if (authToken) {
      const result = await requestAuthorizedApi<CharacterChatSendResponse>(
        "/chat/sessions/respond",
        authToken,
        {
          method: "POST",
          body: JSON.stringify({
            characterId: character.id,
            message,
          }),
        },
      );

      if (result) {
        const sanitized = sanitizeState(character, result.state);
        setChatState({
          ...sanitized,
          latestRewardGrant: result.latestRewardGrant,
        });
        setSyncMode("synced");
        setDraft("");
        setPending(false);
        return;
      }

      setSyncMode("offline");
    }

    const fallback = applyGuestSend(chatState, character, message);
    setChatState(fallback.nextState);
    setDraft("");
    setPending(false);
    setMessageNotice(
      authToken
        ? "Server sync failed. This turn was saved to local preview only."
        : "Guest preview mode is active. Login to sync bond progress.",
    );
  };

  const affinityProgress = Math.min(chatState.affinityScore, 100);
  const messageList: ChatMessage[] =
    chatState.messages.length > 0
      ? chatState.messages
      : [
          {
            id: "opener",
            sender: "character" as const,
            text: character.opener,
            tone: "calm" as const,
            createdAt: "",
          },
        ];

  return (
    <div
      className="min-h-screen text-white"
      style={{
        backgroundImage:
          "radial-gradient(circle at top, rgba(121,240,214,0.16) 0%, rgba(7,11,18,0) 32%), linear-gradient(180deg, #071018 0%, #090d16 100%)",
      }}
    >
      <main className="mx-auto flex w-full max-w-[1480px] flex-col gap-8 px-4 py-6 lg:px-8 lg:py-8">
        <section className="rounded-[2.6rem] border border-white/10 bg-[rgba(8,11,17,0.58)] px-5 py-6 shadow-[0_40px_120px_rgba(0,0,0,0.36)] backdrop-blur lg:px-8 lg:py-8">
          <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <div>
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.24em] text-white/50">
                <span>Character Signal</span>
                <span className="rounded-full border border-white/10 px-3 py-2 text-[11px] tracking-[0.18em] text-[#9ef5df]">
                  {syncMode === "synced"
                    ? "Cloud Bond"
                    : syncMode === "syncing"
                      ? "Syncing"
                      : syncMode === "offline"
                        ? "Offline Cache"
                        : "Guest Preview"}
                </span>
              </div>
              <h1 className="mt-4 text-4xl font-semibold leading-tight text-[#f4fff9] md:text-[3.4rem]">
                {character.name}
              </h1>
              <p className="mt-4 max-w-4xl text-sm leading-8 text-white/72 md:text-base">
                {character.vibe}
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-8 text-[#c6fff0]">
                Bond progression, reward drops, and return hooks are all tied to this conversation lane.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[character.role, chatState.bondLevel, relatedWork?.title ?? "Character Route"].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs text-white/76"
                    >
                      {tag}
                    </span>
                  ),
                )}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/detail/character/${character.id}`}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#121722]"
                >
                  Detail
                </Link>
                <Link
                  href="/?tab=character"
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/74"
                >
                  Character Home
                </Link>
                {!authToken ? (
                  <Link
                    href="/?login=1&tab=character"
                    className="rounded-full border border-[#79f0d6]/28 px-4 py-2 text-sm text-[#bafcf0]"
                  >
                    Login to Sync
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Bond Level", chatState.bondLevel, "The current relationship lane unlocked for this character."],
                ["Affinity", String(chatState.affinityScore), "Conversation quality raises affinity and unlock thresholds."],
                ["Spark Bank", String(chatState.totalSparks), "Rewards from this character accumulate in your account."],
                ["Unlocks", String(chatState.unlockedRewards.length), "Memories, premium drops, and route gates already earned."],
              ].map(([label, value, detail]) => (
                <div
                  key={label}
                  className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_100%)] p-5"
                >
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/46">
                    {label}
                  </div>
                  <div className="mt-4 text-3xl font-semibold text-white">{value}</div>
                  <div className="mt-2 text-sm leading-7 text-white/62">{detail}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            {chatState.latestRewardGrant ? (
              <section className="rounded-[2.2rem] border border-[#79f0d6]/28 bg-[linear-gradient(145deg,rgba(16,55,48,0.86)_0%,rgba(8,17,22,0.9)_100%)] p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-[#8df3db]">
                      Reward Drop
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold text-white">
                      {chatState.latestRewardGrant.title}
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-white/72">
                      {chatState.latestRewardGrant.summary}
                    </p>
                  </div>
                  <div className="rounded-[1.4rem] border border-white/12 bg-black/12 px-4 py-3 text-sm text-white/74">
                    +{chatState.latestRewardGrant.sparksAwarded} sparks
                  </div>
                </div>
              </section>
            ) : null}

            <section className="rounded-[2.2rem] border border-white/10 bg-[rgba(6,10,17,0.54)] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-white/46">
                    Live Chat
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Build the bond, unlock the route
                  </h2>
                </div>
                <div className="text-sm text-white/54">
                  Last sync {formatTime(chatState.syncedAt)}
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {messageList.map((entry) => (
                  <div
                    key={entry.id}
                    className={`max-w-[88%] rounded-[1.8rem] px-5 py-4 text-sm leading-8 ${
                      entry.sender === "user"
                        ? "ml-auto border border-[#79f0d6]/24 bg-[rgba(121,240,214,0.10)] text-[#ecfffb]"
                        : "border border-white/10 bg-[#0d1520] text-white/76"
                    }`}
                  >
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
                      {entry.sender === "user" ? "You" : character.name}
                      {entry.createdAt ? ` · ${formatTime(entry.createdAt)}` : ""}
                    </div>
                    <div className="mt-2">{entry.text}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setDraft(prompt)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/68"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Send a message that deepens trust, tension, or intimacy."
                  className="min-h-[132px] rounded-[1.7rem] border border-white/10 bg-[#0d1520] px-5 py-4 text-sm leading-7 text-white outline-none placeholder:text-white/30"
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={pending}
                  className="rounded-[1.7rem] bg-[#79f0d6] px-5 py-4 text-sm font-semibold text-[#08110f] disabled:opacity-60"
                >
                  {pending ? "Sending..." : "Send Signal"}
                </button>
              </div>

              {messageNotice ? (
                <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/72">
                  {messageNotice}
                </div>
              ) : null}
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[2.2rem] border border-white/10 bg-[rgba(6,10,17,0.54)] p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.2em] text-white/46">
                  Bond Meter
                </div>
                <div className="text-sm text-white/48">{chatState.affinityScore}/100</div>
              </div>
              <div className="mt-4 h-3 rounded-full bg-white/6">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#79f0d6_0%,#ffb978_100%)]"
                  style={{ width: `${affinityProgress}%` }}
                />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/10 bg-[#0d1520] p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/44">
                    Session Streak
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-white">
                    {chatState.streakCount}
                  </div>
                  <div className="mt-2 text-sm leading-7 text-white/60">
                    Consecutive high-intent turns in this relationship lane.
                  </div>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-[#0d1520] p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/44">
                    Last Tone
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-white">
                    {chatState.lastTone}
                  </div>
                  <div className="mt-2 text-sm leading-7 text-white/60">
                    The current response mode shaping the next reward window.
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2.2rem] border border-white/10 bg-[rgba(6,10,17,0.54)] p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.2em] text-white/46">
                  Reward Track
                </div>
                <div className="text-sm text-white/48">
                  {chatState.nextReward ? `${chatState.nextReward.remainingAffinity} to go` : "Complete"}
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {catalogForCharacter(character.id).map((reward) => {
                  const unlocked = chatState.unlockedRewards.some(
                    (entry) => entry.rewardId === reward.id,
                  );
                  return (
                    <div
                      key={reward.id}
                      className={`rounded-[1.4rem] border p-4 ${
                        unlocked
                          ? "border-[#79f0d6]/24 bg-[rgba(121,240,214,0.10)]"
                          : "border-white/10 bg-[#0d1520]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {reward.title}
                          </div>
                          <div className="mt-2 text-sm leading-7 text-white/66">
                            {reward.summary}
                          </div>
                        </div>
                        <div className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/68">
                          {reward.affinityThreshold}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[2.2rem] border border-white/10 bg-[rgba(6,10,17,0.54)] p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.2em] text-white/46">
                  Unlock Vault
                </div>
                <div className="text-sm text-white/48">
                  {chatState.unlockedRewards.length} unlocked
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {chatState.unlockedRewards.length === 0 ? (
                  <div className="rounded-[1.4rem] border border-dashed border-white/12 px-4 py-5 text-sm text-white/56">
                    Your first bond reward will unlock when affinity reaches the opening threshold.
                  </div>
                ) : (
                  chatState.unlockedRewards.map((reward) => (
                    <div
                      key={reward.id}
                      className="rounded-[1.4rem] border border-white/10 bg-[#0d1520] p-4"
                    >
                      <div className="text-sm font-semibold text-white">{reward.title}</div>
                      <div className="mt-2 text-sm leading-7 text-white/64">
                        {reward.summary}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/68">
                          +{reward.sparksAwarded} sparks
                        </span>
                        <span className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/68">
                          {formatTime(reward.unlockedAt)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {relatedWork ? (
              <section className="rounded-[2.2rem] border border-white/10 bg-[rgba(6,10,17,0.54)] p-6">
                <div className="text-xs uppercase tracking-[0.2em] text-white/46">
                  Linked Story
                </div>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  {relatedWork.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-white/66">
                  {relatedWork.summary}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/detail/work/${relatedWork.id}`}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/74"
                  >
                    Detail
                  </Link>
                  {relatedWork.module === "story" ? (
                    <a
                      href={`/story/${relatedWork.id}`}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/74"
                    >
                      Story Play
                    </a>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
