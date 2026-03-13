"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { BootstrapPayload } from "@/data/platform";
import {
  API_BASE,
  AUTH_TOKEN_KEY,
  fetchCurrentSession,
  requestApi,
  type PartyRealtimeSession,
  type SessionState,
} from "@/lib/projectr-api";

type PartyRoomShellProps = {
  initialData: BootstrapPayload;
};

function resolveWsBase(apiBase: string) {
  if (apiBase.startsWith("https://")) {
    return apiBase.replace("https://", "wss://");
  }

  return apiBase.replace("http://", "ws://");
}

export function PartyRoomShell({ initialData }: PartyRoomShellProps) {
  const searchParams = useSearchParams();
  const partySocketRef = useRef<WebSocket | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState("");
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [selectedScenarioId, setSelectedScenarioId] = useState(
    initialData.partyScenarios[0]?.id ?? "",
  );
  const [partySession, setPartySession] = useState<PartyRealtimeSession | null>(
    null,
  );
  const [partyConnection, setPartyConnection] = useState<
    "idle" | "connecting" | "live" | "offline"
  >("idle");
  const [partyMessage, setPartyMessage] = useState("");

  const scenarios = initialData.partyScenarios;
  const activeScenario =
    scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? scenarios[0];

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

      try {
        const socket = new window.WebSocket(
          `${resolveWsBase(API_BASE)}/party/ws/${sessionId}`,
        );
        partySocketRef.current = socket;
        setPartyConnection("connecting");

        socket.onopen = () => {
          setPartyConnection("live");
        };

        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data) as {
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
                current?.participantId ??
                liveSession.participantId ??
                null,
            }));
            setSelectedScenarioId(liveSession.scenarioId);
          } catch {
            setPartyConnection("offline");
          }
        };

        socket.onclose = () => {
          setPartyConnection("offline");
        };

        socket.onerror = () => {
          setPartyConnection("offline");
        };
      } catch {
        setPartyConnection("offline");
      }
    },
  );

  useEffect(() => {
    const storedToken = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (!storedToken) {
      return;
    }
    setAuthToken(storedToken);
  }, []);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    let alive = true;

    const restore = async () => {
      const me = await fetchCurrentSession(authToken);
      if (!alive || !me) {
        return;
      }

      setSession(me);
      setParticipantName((current) => current || me.name);
    };

    void restore();

    return () => {
      alive = false;
    };
  }, [authToken]);

  useEffect(() => {
    const scenarioParam = searchParams.get("scenario");
    if (scenarioParam && scenarios.some((scenario) => scenario.id === scenarioParam)) {
      setSelectedScenarioId(scenarioParam);
    }
  }, [scenarios, searchParams]);

  useEffect(() => () => disconnectPartySocket(), [disconnectPartySocket]);

  const createPartySession = useEffectEvent(async () => {
    if (!activeScenario || !participantName.trim()) {
      setPartyMessage("참가자 이름을 먼저 입력해 주세요.");
      return;
    }

    const created = await requestApi<PartyRealtimeSession>("/party/sessions", {
      method: "POST",
      body: JSON.stringify({
        scenarioId: activeScenario.id,
        participantName: participantName.trim(),
        userId: session?.id ?? null,
      }),
    });

    if (!created) {
      setPartyMessage("라이브 룸 생성에 실패했습니다.");
      return;
    }

    setPartySession(created);
    setPartyMessage(
      `초대 코드 ${created.inviteCode} 생성 완료. 바로 친구를 초대할 수 있습니다.`,
    );
    connectPartySocket(created.sessionId, created.participantId ?? null);
  });

  const joinPartySession = useEffectEvent(async () => {
    if (!participantName.trim() || !inviteCodeInput.trim()) {
      setPartyMessage("참가자 이름과 초대 코드를 입력해 주세요.");
      return;
    }

    const joined = await requestApi<PartyRealtimeSession>("/party/sessions/join", {
      method: "POST",
      body: JSON.stringify({
        inviteCode: inviteCodeInput.trim().toUpperCase(),
        participantName: participantName.trim(),
        userId: session?.id ?? null,
      }),
    });

    if (!joined) {
      setPartyMessage("초대 코드를 찾지 못했습니다.");
      return;
    }

    setPartySession(joined);
    setSelectedScenarioId(joined.scenarioId);
    setPartyMessage(`룸 ${joined.inviteCode}에 참가했습니다.`);
    connectPartySocket(joined.sessionId, joined.participantId ?? null);
  });

  const resolvePartyAction = useEffectEvent(async (action: string) => {
    if (!partySession?.participantId) {
      setPartyMessage("먼저 라이브 룸을 만들거나 참가해야 합니다.");
      return;
    }

    const updated = await requestApi<PartyRealtimeSession>(
      `/party/sessions/${partySession.sessionId}/actions`,
      {
        method: "POST",
        body: JSON.stringify({
          participantId: partySession.participantId,
          action,
        }),
      },
    );

    if (!updated) {
      setPartyMessage("액션 전송에 실패했습니다.");
      return;
    }

    setPartySession({
      ...updated,
      participantId: partySession.participantId,
    });
    setPartyMessage(`"${action}" 액션이 전송되었습니다.`);
  });

  const clearLiveParty = useEffectEvent(() => {
    disconnectPartySocket();
    setPartySession(null);
    setPartyMessage("");
    setInviteCodeInput("");
  });

  if (!activeScenario) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1e2737_0%,#0b0f16_58%,#06080d_100%)] text-white">
      <header className="sticky top-0 z-30 border-b border-white/8 bg-[rgba(8,10,16,0.86)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.34em] text-[#ffb978]">
              Party Chat
            </div>
            <div className="mt-1 text-lg font-semibold text-white">
              Crack-style live room flow
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/?tab=story"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/72"
            >
              홈으로
            </Link>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/72">
              {session ? `${session.name} · ${session.membership}` : "게스트 모드"}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
        <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#111825_0%,#17273d_48%,#f76b1c_130%)] p-6 lg:p-8">
          <div className="inline-flex rounded-full border border-white/14 bg-white/10 px-3 py-2 text-xs uppercase tracking-[0.22em] text-[#fff0dc]">
            Party Flow
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight text-[#fff7ed] md:text-5xl">
            초대 코드로 바로 입장하고, 턴을 제출해 장면을 이어가는 파티챗
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-white/76 md:text-base">
            `crack.wrtn.ai`에서 보이는 파티 중심 동선을 기준으로, 시나리오 선택,
            룸 생성, 코드 입장, 실시간 로그 확인까지 한 화면에서 이어 붙였습니다.
          </p>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-6">
              <div className="text-sm uppercase tracking-[0.18em] text-[#ffb978]">
                Scenario
              </div>
              <div className="mt-4 space-y-3">
                {scenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => setSelectedScenarioId(scenario.id)}
                    className={`w-full rounded-[1.5rem] border px-4 py-4 text-left transition ${
                      scenario.id === activeScenario.id
                        ? "border-[#f76b1c] bg-[rgba(247,107,28,0.12)]"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="font-semibold text-white">{scenario.title}</div>
                    <p className="mt-2 text-sm leading-7 text-white/68">
                      {scenario.premise}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-6">
              <div className="text-sm uppercase tracking-[0.18em] text-[#ffb978]">
                Join Live
              </div>
              <div className="mt-4 grid gap-3">
                <input
                  value={participantName}
                  onChange={(event) => setParticipantName(event.target.value)}
                  placeholder="참가자 이름"
                  className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                />
                <input
                  value={inviteCodeInput}
                  onChange={(event) => setInviteCodeInput(event.target.value.toUpperCase())}
                  placeholder="초대 코드"
                  className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      void createPartySession();
                    }}
                    className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-[#121722]"
                  >
                    룸 만들기
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void joinPartySession();
                    }}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/76"
                  >
                    코드로 입장
                  </button>
                </div>
              </div>
              {partyMessage && (
                <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/72">
                  {partyMessage}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm uppercase tracking-[0.18em] text-white/54">
                    Current Room
                  </div>
                  <h2 className="mt-2 text-3xl font-semibold text-white">
                    {activeScenario.title}
                  </h2>
                </div>
                <div className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/70">
                  Realtime {partyConnection}
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-white/68">
                {activeScenario.premise}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {activeScenario.playerRoles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/72"
                  >
                    {role}
                  </span>
                ))}
              </div>
              {partySession && partySession.scenarioId === activeScenario.id && (
                <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] text-white/54">
                        Invite Code
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-white">
                        {partySession.inviteCode}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearLiveParty}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70"
                    >
                      룸 종료
                    </button>
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
                {activeScenario.actions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => {
                      void resolvePartyAction(action);
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
                Live Log
              </div>
              <div className="mt-4 space-y-3">
                {!partySession && (
                  <div className="rounded-[1.4rem] border border-dashed border-white/12 px-4 py-5 text-sm text-white/52">
                    룸을 만들거나 참가하면 라이브 로그가 여기 쌓입니다.
                  </div>
                )}
                {partySession?.log.length === 0 && (
                  <div className="rounded-[1.4rem] border border-dashed border-white/12 px-4 py-5 text-sm text-white/52">
                    첫 액션이 들어오면 장면 로그가 실시간으로 갱신됩니다.
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
                    <div className="mt-2 text-xs uppercase tracking-[0.16em] text-[#ffb978]">
                      {round.actorName}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-white/66">
                      {round.summary}
                    </p>
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
