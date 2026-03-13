import {
  billingPlans,
  characterProfiles,
  creatorTemplates,
  featuredWorks,
  imageStylePresets,
  opsSignals,
  partyScenarios,
  storyEpisodes,
  type BootstrapPayload,
  type CharacterProfile,
  type PartyScenario,
} from "@/data/platform";

export type SessionState = {
  id: string;
  email?: string | null;
  name: string;
  role: "player" | "creator" | "operator";
  membership: string;
  sparks: number;
  focus: string;
};

export type AuthSessionPayload = {
  token: string;
  expiresAt: string;
  user: SessionState;
};

export type PartyParticipant = {
  id: string;
  name: string;
  role: string;
};

export type PartyRealtimeLogEntry = {
  id: string;
  actorName: string;
  action: string;
  summary: string;
  createdAt: string;
};

export type PartyRealtimeSession = {
  sessionId: string;
  inviteCode: string;
  scenarioId: string;
  scenarioTitle: string;
  status: string;
  participants: PartyParticipant[];
  log: PartyRealtimeLogEntry[];
  participantId?: string | null;
};

export type UserProfile = SessionState & {
  handle: string;
  bio: string;
  location: string;
  avatarGradient: string;
  favoriteGenres: string[];
  createdAt: string;
  updatedAt: string;
};

export type SavedItemRecord = {
  id: string;
  userId: string;
  itemKind: string;
  itemId: string;
  title: string;
  summary: string;
  href: string;
  meta: string;
  chips: string[];
  createdAt: string;
};

type ApiCharacter = Partial<CharacterProfile> & {
  id: string;
  name: string;
  role: string;
  responses?: CharacterProfile["responsePools"];
};

type ApiPartyScenario = {
  id: string;
  title: string;
  premise: string;
  actions?: string[];
  twists?: string[];
  playerRoles?: string[];
  player_roles?: string[];
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export const API_BASE = API_BASE_URL.replace(/\/$/, "");
export const AUTH_TOKEN_KEY = "projectr.auth-token.v1";

function fallbackBootstrap(): BootstrapPayload {
  return {
    presets: [],
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
}

function mergeCharacters(
  incoming: Array<ApiCharacter | CharacterProfile> | undefined,
): CharacterProfile[] {
  if (!incoming || incoming.length === 0) {
    return characterProfiles;
  }

  return incoming.map((character) => {
    const fallback =
      characterProfiles.find((entry) => entry.id === character.id) ??
      characterProfiles[0];

    const responsePools =
      "responsePools" in character && character.responsePools
        ? character.responsePools
        : "responses" in character && character.responses
          ? character.responses
          : fallback.responsePools;

    return {
      id: character.id,
      name: character.name ?? fallback.name,
      role: character.role ?? fallback.role,
      vibe: character.vibe?.trim() || fallback.vibe,
      opener: character.opener?.trim() || fallback.opener,
      responsePools,
    };
  });
}

function mergePartyScenarios(
  incoming: Array<ApiPartyScenario | PartyScenario> | undefined,
): PartyScenario[] {
  if (!incoming || incoming.length === 0) {
    return partyScenarios;
  }

  return incoming.map((scenario) => {
    const fallback =
      partyScenarios.find((entry) => entry.id === scenario.id) ?? partyScenarios[0];
    const playerRoles =
      "playerRoles" in scenario && Array.isArray(scenario.playerRoles)
        ? scenario.playerRoles
        : "player_roles" in scenario && Array.isArray(scenario.player_roles)
          ? scenario.player_roles
          : fallback.playerRoles;

    return {
      id: scenario.id,
      title: scenario.title ?? fallback.title,
      premise: scenario.premise ?? fallback.premise,
      playerRoles,
      actions:
        "actions" in scenario &&
        Array.isArray(scenario.actions) &&
        scenario.actions.length > 0
          ? scenario.actions
          : fallback.actions,
      twists:
        "twists" in scenario &&
        Array.isArray(scenario.twists) &&
        scenario.twists.length > 0
          ? scenario.twists
          : fallback.twists,
    };
  });
}

export function mergeBootstrapPayload(
  payload?: Partial<BootstrapPayload> | null,
): BootstrapPayload {
  const fallback = fallbackBootstrap();

  if (!payload) {
    return fallback;
  }

  return {
    presets:
      payload.presets && payload.presets.length > 0
        ? payload.presets
        : fallback.presets,
    feed: payload.feed && payload.feed.length > 0 ? payload.feed : fallback.feed,
    episodes:
      payload.episodes && payload.episodes.length > 0
        ? payload.episodes
        : fallback.episodes,
    characters: mergeCharacters(payload.characters),
    partyScenarios: mergePartyScenarios(payload.partyScenarios),
    styles:
      payload.styles && payload.styles.length > 0
        ? payload.styles
        : fallback.styles,
    creatorTemplates:
      payload.creatorTemplates && payload.creatorTemplates.length > 0
        ? payload.creatorTemplates
        : fallback.creatorTemplates,
    opsSignals:
      payload.opsSignals && payload.opsSignals.length > 0
        ? payload.opsSignals
        : fallback.opsSignals,
    plans:
      payload.plans && payload.plans.length > 0 ? payload.plans : fallback.plans,
    subscriptions: payload.subscriptions ?? fallback.subscriptions,
    releases: payload.releases ?? fallback.releases,
  };
}

async function fetchServerJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchBootstrapPayloadServer(
  userId?: string | null,
): Promise<BootstrapPayload> {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  const payload = await fetchServerJson<BootstrapPayload>(`/bootstrap${query}`);

  return mergeBootstrapPayload(payload);
}

export async function requestApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  try {
    const headers = new Headers(init?.headers);
    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
    });

    if (!response.ok || response.status === 204) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchCurrentSession(
  token: string,
): Promise<SessionState | null> {
  return requestApi<SessionState>("/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function requestAuthorizedApi<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T | null> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return requestApi<T>(path, {
    ...init,
    headers,
  });
}
