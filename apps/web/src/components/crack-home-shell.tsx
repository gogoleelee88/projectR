"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from "react";
import type { BootstrapPayload } from "@/data/platform";
import {
  buildCrackSections,
  crackPartyHighlight,
  crackQuickFilters,
  crackTabs,
  type CrackCard,
  type CrackTabId,
} from "@/data/crack-clone";
import {
  AUTH_TOKEN_KEY,
  fetchCurrentSession,
  requestApi,
  type AuthSessionPayload,
  type SessionState,
} from "@/lib/projectr-api";

type CrackHomeShellProps = {
  initialData: BootstrapPayload;
};

type AuthMode = "login" | "register";

const filterPredicates: Record<string, (card: CrackCard) => boolean> = {
  "공식 추천": () => true,
  파티챗: (card) =>
    card.eyebrow.includes("파티") ||
    card.summary.includes("파티") ||
    card.title.includes("파티"),
  "지금 인기": (card) => card.meta.includes("동시") || card.meta.includes("인기"),
  신작: (card) => card.summary.includes("신작") || card.chips.includes("신작"),
  완결: (card) => card.summary.includes("완결"),
  스토어: (card) =>
    card.summary.includes("스토어") || card.chips.some((chip) => chip.includes("스토어")),
  이벤트: (card) =>
    card.summary.includes("이벤트") || card.chips.some((chip) => chip.includes("이벤트")),
};

function filterCards(cards: CrackCard[], query: string, activeFilter: string) {
  const normalized = query.trim().toLowerCase();
  const predicate = filterPredicates[activeFilter] ?? (() => true);

  return cards.filter((card) => {
    if (!predicate(card)) {
      return false;
    }

    if (!normalized) {
      return true;
    }

    return [card.title, card.eyebrow, card.summary, card.meta, card.chips.join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(normalized);
  });
}

export function CrackHomeShell({ initialData }: CrackHomeShellProps) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<CrackTabId>("story");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("공식 추천");
  const [session, setSession] = useState<SessionState | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authRole, setAuthRole] = useState<SessionState["role"]>("player");
  const [authPending, setAuthPending] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam &&
      crackTabs.some((tab) => tab.id === (tabParam as CrackTabId))
    ) {
      setActiveTab(tabParam as CrackTabId);
    }
  }, [searchParams]);

  useEffect(() => {
    const shouldOpenLogin = searchParams.get("login");
    if (shouldOpenLogin === "1") {
      setAuthOpen(true);
      setAuthMode("login");
    }
  }, [searchParams]);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (storedToken) {
      setAuthToken(storedToken);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!authToken) {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      return;
    }

    window.localStorage.setItem(AUTH_TOKEN_KEY, authToken);
  }, [authToken, hydrated]);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    let alive = true;

    const restore = async () => {
      const me = await fetchCurrentSession(authToken);
      if (!alive) {
        return;
      }

      if (!me) {
        setAuthToken(null);
        setSession(null);
        return;
      }

      setSession(me);
    };

    void restore();

    return () => {
      alive = false;
    };
  }, [authToken]);

  const sectionMap = useMemo(
    () => buildCrackSections(initialData, session),
    [initialData, session],
  );
  const section = sectionMap[activeTab];
  const featuredCards = useMemo(
    () => filterCards(section.featured, deferredSearch, activeFilter),
    [activeFilter, deferredSearch, section.featured],
  );
  const continueCard =
    sectionMap.story.featured[0] ?? sectionMap.character.featured[0] ?? null;
  const activePartyScenario = initialData.partyScenarios[0];

  const submitAuth = useEffectEvent(async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthMessage("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    if (authMode === "register" && !authName.trim()) {
      setAuthMessage("회원가입에는 이름이 필요합니다.");
      return;
    }

    setAuthPending(true);
    setAuthMessage("");

    const path = authMode === "login" ? "/auth/login" : "/auth/register";
    const payload =
      authMode === "login"
        ? {
            email: authEmail.trim(),
            password: authPassword,
          }
        : {
            name: authName.trim(),
            email: authEmail.trim(),
            password: authPassword,
            role: authRole,
          };

    const result = await requestApi<AuthSessionPayload>(path, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setAuthPending(false);

    if (!result) {
      setAuthMessage(
        authMode === "login"
          ? "로그인에 실패했습니다. 계정을 다시 확인해 주세요."
          : "회원가입에 실패했습니다. 이미 사용 중인 이메일일 수 있습니다.",
      );
      return;
    }

    startTransition(() => {
      setAuthToken(result.token);
      setSession(result.user);
      setAuthMessage("");
      setAuthOpen(false);
      setAuthPassword("");
      if (authMode === "register") {
        setAuthName("");
      }
    });
  });

  const logout = useEffectEvent(async () => {
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
    setAuthMessage("");
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1e2737_0%,#0b0f16_58%,#06080d_100%)] text-white">
      <header className="sticky top-0 z-30 border-b border-white/8 bg-[rgba(8,10,16,0.86)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.34em] text-[#ffb978]">
                Project R
              </div>
              <div className="mt-1 text-lg font-semibold text-white">
                Crack Clone Baseline
              </div>
            </div>
            <div className="flex items-center gap-3">
              {session ? (
                <>
                  <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/76 md:block">
                    {session.name} · {session.membership}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void logout();
                    }}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/76"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setAuthOpen(true);
                  }}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/76"
                >
                  로그인
                </button>
              )}
              <Link
                href={activePartyScenario ? `/party?scenario=${activePartyScenario.id}` : "/party"}
                className="rounded-full bg-[#f76b1c] px-4 py-2 text-sm font-semibold text-[#130e09]"
              >
                파티챗 입장
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <nav className="flex flex-wrap gap-2">
              {crackTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? "bg-white text-[#0f1522]"
                      : "border border-white/10 bg-white/5 text-white/72"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <div className="flex w-full gap-2 lg:max-w-xl">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="스토리, 캐릭터, 태그 검색"
                className="w-full rounded-full border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-white/36"
              />
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/76"
              >
                검색
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {crackQuickFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`rounded-full px-3 py-2 text-xs transition ${
                  activeFilter === filter
                    ? "bg-[rgba(247,107,28,0.18)] text-[#fff0dc]"
                    : "border border-white/10 bg-white/5 text-white/60"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 lg:px-8 lg:py-8">
        <section className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
          <div className="grid gap-4">
            <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,#161f2c,#0c1119)] p-6">
              <div className="text-xs uppercase tracking-[0.2em] text-white/44">
                {session ? "내 계정" : "계정"}
              </div>
              <h2 className="mt-3 text-3xl font-semibold text-[#fff7ed]">
                {session ? `${session.name}님, 이어서 볼까요?` : "로그인하고 이어보기"}
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/68">
                {session
                  ? `${session.focus}. 현재 멤버십은 ${session.membership}이고 보유 Spark는 ${session.sparks.toLocaleString("ko-KR")}입니다.`
                  : "최근 읽던 스토리, 찜한 캐릭터, 보관한 이미지 세트를 한 번에 이어서 볼 수 있습니다."}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {session ? (
                  <>
                    <Link
                      href="/?tab=works"
                      className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#121722]"
                    >
                      내 작품 보기
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        void logout();
                      }}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/72"
                    >
                      로그아웃
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setAuthOpen(true);
                    }}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#121722]"
                  >
                    로그인
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,#2c1a12,#19171d)] p-6">
              <div className="text-xs uppercase tracking-[0.2em] text-white/44">
                이어보기
              </div>
              <h2 className="mt-3 text-3xl font-semibold text-[#fff7ed]">
                {continueCard?.title ?? "대표 작품 상세"}
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/68">
                {continueCard?.summary ??
                  "카드를 눌러 상세로 들어가고, 다시 홈 피드나 파티챗 동선으로 돌아올 수 있습니다."}
              </p>
              {continueCard && (
                <Link
                  href={continueCard.href}
                  className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#121722]"
                >
                  카드 상세 보기
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#111825_0%,#17273d_48%,#f76b1c_130%)] p-6 lg:p-8">
            <div className="inline-flex rounded-full border border-white/14 bg-white/10 px-3 py-2 text-xs uppercase tracking-[0.22em] text-[#fff0dc]">
              {crackPartyHighlight.badge}
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight text-[#fff7ed] md:text-5xl">
              {crackPartyHighlight.title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-white/76 md:text-base">
              {crackPartyHighlight.summary}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {crackPartyHighlight.details.map((detail) => (
                <span
                  key={detail}
                  className="rounded-full border border-white/12 bg-[rgba(255,255,255,0.08)] px-3 py-2 text-xs text-white/80"
                >
                  {detail}
                </span>
              ))}
            </div>
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {[
                ["실시간 룸", `${initialData.partyScenarios.length}개`, "라이브 시나리오 선택"],
                ["초대 코드", "즉시", "코드로 바로 입장"],
                ["로그인", session ? "연결됨" : "선택", "계정 없이도 시작 가능"],
              ].map(([label, value, detail]) => (
                <div
                  key={label}
                  className="rounded-[1.4rem] border border-white/10 bg-[rgba(7,10,17,0.28)] p-4"
                >
                  <div className="text-xs uppercase tracking-[0.16em] text-white/48">
                    {label}
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
                  <div className="mt-2 text-sm leading-6 text-white/60">{detail}</div>
                </div>
              ))}
            </div>
            <Link
              href={activePartyScenario ? `/party?scenario=${activePartyScenario.id}` : "/party"}
              className="mt-8 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#121722]"
            >
              파티챗 시작
            </Link>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#ffb978]">
                {crackTabs.find((tab) => tab.id === activeTab)?.label}
              </div>
              <h2 className="mt-2 text-3xl font-semibold text-white">{section.heading}</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-white/66">
              {section.description}
            </p>
          </div>

          {activeTab === "works" && !session && (
            <div className="mt-6 rounded-[1.6rem] border border-dashed border-[#f76b1c] bg-[rgba(247,107,28,0.08)] px-5 py-5 text-sm leading-7 text-[#fff0dc]">
              로그인하면 내 작품과 발행 대기열이 상단에 붙습니다.
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthOpen(true);
                }}
                className="ml-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#121722]"
              >
                로그인
              </button>
            </div>
          )}

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {featuredCards.map((card) => (
              <Link
                key={`${card.kind}-${card.id}`}
                href={card.href}
                className={`rounded-[1.8rem] border border-white/10 bg-gradient-to-br ${card.accent} p-[1px]`}
              >
                <article className="h-full rounded-[1.75rem] bg-[rgba(9,12,18,0.88)] p-5 transition hover:bg-[rgba(12,15,22,0.94)]">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#ffb978]">
                    {card.eyebrow}
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold text-[#fff7ed]">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/68">{card.summary}</p>
                  <div className="mt-4 text-sm font-medium text-[#79f0d6]">{card.meta}</div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {card.chips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/72"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 text-sm font-semibold text-white">상세 보기</div>
                </article>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          {section.rails.map((rail) => (
            <div
              key={rail.title}
              className="rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-6"
            >
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-white/44">
                    Feed Rail
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{rail.title}</h2>
                </div>
                <div className="text-sm text-white/54">{rail.description}</div>
              </div>
              <div className="mt-5 space-y-3">
                {filterCards(rail.items, deferredSearch, activeFilter).map((item) => (
                  <Link
                    key={`${item.kind}-${item.id}`}
                    href={item.href}
                    className="block rounded-[1.5rem] border border-white/8 bg-[#0e141f] p-4 transition hover:bg-[#121a27]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-[#ffb978]">
                          {item.eyebrow}
                        </div>
                        <div className="mt-2 text-xl font-semibold text-white">{item.title}</div>
                      </div>
                      <div className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/56">
                        {item.meta}
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-white/64">{item.summary}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>

      {authOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#0f1522] p-6 shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[#ffb978]">
                  {authMode === "login" ? "Login" : "Register"}
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {authMode === "login" ? "계정으로 이어보기" : "새 계정 만들기"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setAuthOpen(false)}
                className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/70"
              >
                닫기
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              {authMode === "register" && (
                <input
                  value={authName}
                  onChange={(event) => setAuthName(event.target.value)}
                  placeholder="이름"
                  className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                />
              )}
              <input
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="이메일"
                className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
              />
              <input
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                placeholder="비밀번호"
                className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
              />
              {authMode === "register" && (
                <select
                  value={authRole}
                  onChange={(event) =>
                    setAuthRole(event.target.value as SessionState["role"])
                  }
                  className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="player">플레이어</option>
                  <option value="creator">크리에이터</option>
                  <option value="operator">운영자</option>
                </select>
              )}
            </div>

            {authMessage && (
              <div className="mt-4 rounded-[1.3rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/72">
                {authMessage}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                void submitAuth();
              }}
              disabled={authPending}
              className="mt-5 w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-[#121722] disabled:opacity-60"
            >
              {authPending
                ? "처리 중..."
                : authMode === "login"
                  ? "로그인"
                  : "회원가입"}
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode((current) => (current === "login" ? "register" : "login"));
                setAuthMessage("");
              }}
              className="mt-3 w-full rounded-full border border-white/10 px-4 py-3 text-sm text-white/70"
            >
              {authMode === "login"
                ? "새 계정 만들기"
                : "이미 계정이 있으면 로그인"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
