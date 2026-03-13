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
import { ProfileSheet, type ProfileDraft } from "@/components/profile-sheet";
import {
  buildCrackSections,
  crackPartyHighlight,
  crackQuickFilters,
  crackTabs,
  type CrackCard,
  type CrackTabId,
} from "@/data/crack-clone";
import type { BootstrapPayload } from "@/data/platform";
import {
  AUTH_TOKEN_KEY,
  fetchCurrentSession,
  requestApi,
  requestAuthorizedApi,
  type AuthSessionPayload,
  type SavedItemRecord,
  type SessionState,
  type UserProfile,
} from "@/lib/projectr-api";

type Props = { initialData: BootstrapPayload };
type AuthMode = "login" | "register";

const allFilter = crackQuickFilters[0] ?? "All";

function savedKey(kind: string, id: string) {
  return `${kind}:${id}`;
}

function matches(card: CrackCard, keyword: string) {
  const haystack = [card.title, card.eyebrow, card.summary, card.meta, card.chips.join(" ")]
    .join(" ")
    .toLowerCase();
  return haystack.includes(keyword);
}

function filterCards(cards: CrackCard[], query: string, filter: string) {
  const normalized = query.trim().toLowerCase();
  const filtered = cards.filter((card) => {
    if (!filter || filter === allFilter) {
      return true;
    }
    if (filter === crackQuickFilters[1]) {
      return ["파티", "party", "라이브"].some((keyword) => matches(card, keyword));
    }
    if (filter === crackQuickFilters[2]) {
      return ["실시간", "hot", "지금", "live"].some((keyword) => matches(card, keyword));
    }
    if (filter === crackQuickFilters[3]) {
      return ["신작", "new", "drop"].some((keyword) => matches(card, keyword));
    }
    if (filter === crackQuickFilters[4]) {
      return ["완결", "ending", "finale"].some((keyword) => matches(card, keyword));
    }
    if (filter === crackQuickFilters[5]) {
      return ["스토리", "story", "episode"].some((keyword) => matches(card, keyword));
    }
    if (filter === crackQuickFilters[6]) {
      return ["이벤트", "event", "reward"].some((keyword) => matches(card, keyword));
    }
    return true;
  });

  if (!normalized) {
    return filtered;
  }

  return filtered.filter((card) =>
    [card.title, card.eyebrow, card.summary, card.meta, card.chips.join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
}

export function CrackHomeShell({ initialData }: Props) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<CrackTabId>("story");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState(allFilter);
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [profilePending, setProfilePending] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [savedItems, setSavedItems] = useState<SavedItemRecord[]>([]);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && crackTabs.some((tab) => tab.id === (tabParam as CrackTabId))) {
      setActiveTab(tabParam as CrackTabId);
    }
    if (searchParams.get("login") === "1") {
      setAuthMode("login");
      setAuthOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (storedToken) {
      setAuthToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (!authToken) {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      return;
    }
    window.localStorage.setItem(AUTH_TOKEN_KEY, authToken);
  }, [authToken]);

  const syncAccount = useEffectEvent(async (token: string) => {
    const [me, nextProfile, nextSaves] = await Promise.all([
      fetchCurrentSession(token),
      requestAuthorizedApi<UserProfile>("/profile/me", token),
      requestAuthorizedApi<SavedItemRecord[]>("/library/saves", token),
    ]);

    if (!me) {
      setAuthToken(null);
      setSession(null);
      setProfile(null);
      setSavedItems([]);
      return false;
    }

    setSession(
      nextProfile
        ? {
            ...me,
            email: nextProfile.email,
            name: nextProfile.name,
            role: nextProfile.role,
            membership: nextProfile.membership,
            sparks: nextProfile.sparks,
            focus: nextProfile.focus,
          }
        : me,
    );
    setProfile(nextProfile);
    setSavedItems(nextSaves ?? []);
    return true;
  });

  useEffect(() => {
    if (!authToken) {
      setProfile(null);
      setSavedItems([]);
      return;
    }
    void syncAccount(authToken);
  }, [authToken, syncAccount]);

  const sectionMap = useMemo(() => buildCrackSections(initialData, session), [initialData, session]);
  const section = sectionMap[activeTab];
  const featuredCards = useMemo(
    () => filterCards(section.featured, deferredSearch, activeFilter),
    [activeFilter, deferredSearch, section.featured],
  );
  const continueCard = sectionMap.story.featured[0] ?? sectionMap.character.featured[0] ?? null;
  const activePartyScenario = initialData.partyScenarios[0];
  const storyWorkIds = useMemo(
    () =>
      new Set(
        initialData.feed
          .filter((work) => work.module === "story")
          .map((work) => work.id),
      ),
    [initialData.feed],
  );
  const savedLookup = useMemo(
    () => new Set(savedItems.map((item) => savedKey(item.itemKind, item.itemId))),
    [savedItems],
  );

  const openLogin = useEffectEvent(() => {
    setAuthMode("login");
    setAuthOpen(true);
    setAuthMessage("");
  });

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
    const result = await requestApi<AuthSessionPayload>(authMode === "login" ? "/auth/login" : "/auth/register", {
      method: "POST",
      body: JSON.stringify(
        authMode === "login"
          ? { email: authEmail.trim(), password: authPassword }
          : {
              name: authName.trim(),
              email: authEmail.trim(),
              password: authPassword,
              role: authRole,
            },
      ),
    });
    setAuthPending(false);

    if (!result) {
      setAuthMessage(
        authMode === "login" ? "로그인에 실패했습니다." : "회원가입에 실패했습니다.",
      );
      return;
    }

    startTransition(() => {
      setAuthToken(result.token);
      setSession(result.user);
      setAuthOpen(false);
      setAuthPassword("");
      setAuthMessage("");
      if (authMode === "register") {
        setAuthName("");
      }
    });
    await syncAccount(result.token);
  });

  const logout = useEffectEvent(async () => {
    if (authToken) {
      await requestApi("/auth/session", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });
    }
    setAuthToken(null);
    setSession(null);
    setProfile(null);
    setSavedItems([]);
    setProfileOpen(false);
  });

  const saveProfile = useEffectEvent(async (draft: ProfileDraft) => {
    if (!authToken) {
      openLogin();
      return;
    }
    setProfilePending(true);
    const response = await requestAuthorizedApi<UserProfile>("/profile/me", authToken, {
      method: "PATCH",
      body: JSON.stringify(draft),
    });
    setProfilePending(false);
    if (!response) {
      setProfileMessage("프로필 저장에 실패했습니다.");
      return;
    }
    setProfile(response);
    setSession((current) =>
      current
        ? { ...current, name: response.name, focus: response.focus, membership: response.membership }
        : current,
    );
    setProfileMessage("프로필을 저장했습니다.");
  });

  const removeSaved = useEffectEvent(async (item: SavedItemRecord) => {
    if (!authToken) {
      openLogin();
      return;
    }
    const response = await requestAuthorizedApi<{ status: string }>(
      `/library/saves/${item.itemKind}/${item.itemId}`,
      authToken,
      { method: "DELETE" },
    );
    if (!response) {
      setProfileMessage("저장 항목을 제거하지 못했습니다.");
      return;
    }
    setSavedItems((current) => current.filter((entry) => entry.id !== item.id));
    setProfileMessage("라이브러리에서 항목을 제거했습니다.");
  });

  const toggleSave = useEffectEvent(async (card: CrackCard) => {
    if (!authToken) {
      openLogin();
      return;
    }
    const key = savedKey(card.kind, card.id);
    if (savedLookup.has(key)) {
      const response = await requestAuthorizedApi<{ status: string }>(
        `/library/saves/${card.kind}/${card.id}`,
        authToken,
        { method: "DELETE" },
      );
      if (!response) {
        setProfileMessage("저장 해제에 실패했습니다.");
        return;
      }
      setSavedItems((current) =>
        current.filter((item) => !(item.itemKind === card.kind && item.itemId === card.id)),
      );
      return;
    }

    const response = await requestAuthorizedApi<SavedItemRecord>("/library/saves", authToken, {
      method: "POST",
      body: JSON.stringify({ itemKind: card.kind, itemId: card.id }),
    });
    if (!response) {
      setProfileMessage("저장에 실패했습니다.");
      return;
    }
    setSavedItems((current) => [response, ...current.filter((item) => item.id !== response.id)]);
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1e2737_0%,#0b0f16_58%,#06080d_100%)] text-white">
      <header className="sticky top-0 z-30 border-b border-white/8 bg-[rgba(8,10,16,0.86)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.34em] text-[#ffb978]">Project R</div>
              <div className="mt-1 text-lg font-semibold text-white">Crack Clone Baseline</div>
            </div>
            <div className="flex items-center gap-3">
              {session ? (
                <>
                  <button
                    type="button"
                    onClick={() => setProfileOpen(true)}
                    className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/78 md:block"
                  >
                    {session.name} · 프로필/저장
                  </button>
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/76"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => openLogin()}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/76"
                >
                  로그인
                </button>
              )}
              <Link href={activePartyScenario ? `/party?scenario=${activePartyScenario.id}` : "/party"} className="rounded-full bg-[#f76b1c] px-4 py-2 text-sm font-semibold text-[#130e09]">
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
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === tab.id ? "bg-white text-[#0f1522]" : "border border-white/10 bg-white/5 text-white/72"}`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <div className="flex w-full gap-2 lg:max-w-xl">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="스토리, 캐릭터, 태그를 검색해 보세요"
                className="w-full rounded-full border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-white/36"
              />
              <button type="button" className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/76">검색</button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {crackQuickFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`rounded-full px-3 py-2 text-xs transition ${activeFilter === filter ? "bg-[rgba(247,107,28,0.18)] text-[#fff0dc]" : "border border-white/10 bg-white/5 text-white/60"}`}
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
              <div className="text-xs uppercase tracking-[0.2em] text-white/44">{session ? "내 계정" : "계정"}</div>
              <h2 className="mt-3 text-3xl font-semibold text-[#fff7ed]">{session ? `${session.name}님, 다음 플레이를 이어가 볼까요?` : "로그인하고 프로필과 저장을 시작하세요"}</h2>
              <p className="mt-3 text-sm leading-7 text-white/68">
                {session ? `${session.focus}. 저장한 항목은 ${savedItems.length}개입니다.` : "이번 단계는 프로필 편집과 저장 라이브러리를 실제 동작 상태로 올리는 것입니다."}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {session ? (
                  <>
                    <button type="button" onClick={() => setProfileOpen(true)} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#121722]">프로필/저장 열기</button>
                    <Link href="/?tab=works" className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/72">내 작품 보기</Link>
                  </>
                ) : (
                  <button type="button" onClick={() => openLogin()} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#121722]">로그인</button>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {savedItems.slice(0, 3).map((item) => (
                  <Link key={item.id} href={item.href} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">{item.title}</Link>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,#2c1a12,#19171d)] p-6">
              <div className="text-xs uppercase tracking-[0.2em] text-white/44">이어보기</div>
              <h2 className="mt-3 text-3xl font-semibold text-[#fff7ed]">{continueCard?.title ?? "대표 작품 상세"}</h2>
              <p className="mt-3 text-sm leading-7 text-white/68">{continueCard?.summary ?? "카드 상세와 저장을 이어서 확인할 수 있습니다."}</p>
              {continueCard && (
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={continueCard.href} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#121722]">카드 상세 보기</Link>
                  {storyWorkIds.has(continueCard.id) && (
                    <Link
                      href={`/story/${continueCard.id}`}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/72"
                    >
                      스토리 플레이
                    </Link>
                  )}
                  <button type="button" onClick={() => void toggleSave(continueCard)} className={`rounded-full px-4 py-2 text-sm ${savedLookup.has(savedKey(continueCard.kind, continueCard.id)) ? "bg-[rgba(247,107,28,0.18)] text-[#fff0dc]" : "border border-white/10 text-white/72"}`}>{savedLookup.has(savedKey(continueCard.kind, continueCard.id)) ? "저장됨" : "저장"}</button>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#111825_0%,#17273d_48%,#f76b1c_130%)] p-6 lg:p-8">
            <div className="inline-flex rounded-full border border-white/14 bg-white/10 px-3 py-2 text-xs uppercase tracking-[0.22em] text-[#fff0dc]">{crackPartyHighlight.badge}</div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight text-[#fff7ed] md:text-5xl">{crackPartyHighlight.title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-white/76 md:text-base">{crackPartyHighlight.summary}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {crackPartyHighlight.details.map((detail) => (
                <span key={detail} className="rounded-full border border-white/12 bg-[rgba(255,255,255,0.08)] px-3 py-2 text-xs text-white/80">{detail}</span>
              ))}
            </div>
            <Link href={activePartyScenario ? `/party?scenario=${activePartyScenario.id}` : "/party"} className="mt-8 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#121722]">파티챗 시작</Link>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#ffb978]">{crackTabs.find((tab) => tab.id === activeTab)?.label}</div>
              <h2 className="mt-2 text-3xl font-semibold text-white">{section.heading}</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-white/66">{section.description}</p>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {featuredCards.map((card) => {
              const isSaved = savedLookup.has(savedKey(card.kind, card.id));
              return (
                <div key={`${card.kind}-${card.id}`} className={`rounded-[1.8rem] border border-white/10 bg-gradient-to-br ${card.accent} p-[1px]`}>
                  <article className="h-full rounded-[1.75rem] bg-[rgba(9,12,18,0.88)] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-[#ffb978]">{card.eyebrow}</div>
                      <button type="button" onClick={() => void toggleSave(card)} className={`rounded-full px-3 py-2 text-xs ${isSaved ? "bg-[rgba(247,107,28,0.18)] text-[#fff0dc]" : "border border-white/10 bg-white/5 text-white/72"}`}>{isSaved ? "저장됨" : "저장"}</button>
                    </div>
                    <Link href={card.href} className="mt-3 block">
                      <h3 className="text-2xl font-semibold text-[#fff7ed]">{card.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-white/68">{card.summary}</p>
                      <div className="mt-4 text-sm font-medium text-[#79f0d6]">{card.meta}</div>
                    </Link>
                    {storyWorkIds.has(card.id) && (
                      <Link
                        href={`/story/${card.id}`}
                        className="mt-4 inline-flex rounded-full border border-white/10 px-3 py-2 text-xs text-white/72"
                      >
                        플레이
                      </Link>
                    )}
                  </article>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          {section.rails.map((rail) => (
            <div key={rail.title} className="rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-white/44">Feed Rail</div>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{rail.title}</h2>
                </div>
                <div className="text-sm text-white/54">{rail.description}</div>
              </div>
              <div className="mt-5 space-y-3">
                {filterCards(rail.items, deferredSearch, activeFilter).map((item) => {
                  const isSaved = savedLookup.has(savedKey(item.kind, item.id));
                  return (
                    <div key={`${item.kind}-${item.id}`} className="rounded-[1.5rem] border border-white/8 bg-[#0e141f] p-4">
                      <div className="flex items-start justify-between gap-4">
                        <Link href={item.href} className="min-w-0 flex-1">
                          <div className="text-xs uppercase tracking-[0.16em] text-[#ffb978]">{item.eyebrow}</div>
                          <div className="mt-2 text-xl font-semibold text-white">{item.title}</div>
                          <p className="mt-3 text-sm leading-7 text-white/64">{item.summary}</p>
                        </Link>
                        <button type="button" onClick={() => void toggleSave(item)} className={`rounded-full px-3 py-2 text-xs ${isSaved ? "bg-[rgba(247,107,28,0.18)] text-[#fff0dc]" : "border border-white/10 bg-white/5 text-white/72"}`}>{isSaved ? "저장됨" : "저장"}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      </main>

      <ProfileSheet
        isOpen={profileOpen}
        session={session}
        profile={profile}
        savedItems={savedItems}
        pending={profilePending}
        message={profileMessage}
        onClose={() => setProfileOpen(false)}
        onSave={(draft) => void saveProfile(draft)}
        onRemoveSavedItem={(item) => void removeSaved(item)}
      />

      {authOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#0f1522] p-6 shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[#ffb978]">{authMode === "login" ? "Login" : "Register"}</div>
                <h2 className="mt-2 text-2xl font-semibold text-white">{authMode === "login" ? "계정으로 이어보기" : "새 계정 만들기"}</h2>
              </div>
              <button type="button" onClick={() => setAuthOpen(false)} className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/70">닫기</button>
            </div>
            <div className="mt-5 grid gap-3">
              {authMode === "register" && <input value={authName} onChange={(event) => setAuthName(event.target.value)} placeholder="이름" className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none" />}
              <input value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="이메일" className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none" />
              <input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="비밀번호" className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none" />
              {authMode === "register" && (
                <select value={authRole} onChange={(event) => setAuthRole(event.target.value as SessionState["role"])} className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none">
                  <option value="player">플레이어</option>
                  <option value="creator">크리에이터</option>
                  <option value="operator">운영자</option>
                </select>
              )}
            </div>
            {authMessage && <div className="mt-4 rounded-[1.3rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/72">{authMessage}</div>}
            <button type="button" onClick={() => void submitAuth()} disabled={authPending} className="mt-5 w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-[#121722] disabled:opacity-60">{authPending ? "처리 중..." : authMode === "login" ? "로그인" : "회원가입"}</button>
            <button type="button" onClick={() => { setAuthMode((current) => (current === "login" ? "register" : "login")); setAuthMessage(""); }} className="mt-3 w-full rounded-full border border-white/10 px-4 py-3 text-sm text-white/70">{authMode === "login" ? "새 계정 만들기" : "이미 계정이 있으면 로그인"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
