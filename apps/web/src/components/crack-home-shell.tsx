"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  crackHeroCards,
  crackPartyHighlight,
  crackQuickFilters,
  crackSections,
  crackTabs,
  type CrackCard,
  type CrackTabId,
} from "@/data/crack-clone";

function filterCards(cards: CrackCard[], query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return cards;
  }

  return cards.filter((card) =>
    [card.title, card.eyebrow, card.summary, card.meta, card.chips.join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
}

export function CrackHomeShell() {
  const [activeTab, setActiveTab] = useState<CrackTabId>("story");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("공식 추천");

  const section = crackSections[activeTab];
  const featuredCards = useMemo(
    () => filterCards(section.featured, search),
    [search, section.featured],
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1e2737_0%,#0b0f16_58%,#06080d_100%)] text-white">
      <header className="sticky top-0 z-30 border-b border-white/8 bg-[rgba(8,10,16,0.86)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.34em] text-[#ffb978]">
                Project R
              </div>
              <div className="mt-1 text-lg font-semibold text-white">Crack Clone Baseline</div>
            </div>
            <div className="hidden items-center gap-3 md:flex">
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/76"
              >
                로그인
              </button>
              <Link
                href="/app"
                className="rounded-full bg-[#f76b1c] px-4 py-2 text-sm font-semibold text-[#130e09]"
              >
                앱 보기
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
            {crackHeroCards.map((card, index) => (
              <div
                key={card.title}
                className={`rounded-[2rem] border border-white/10 p-6 ${
                  index === 0
                    ? "bg-[linear-gradient(145deg,#161f2c,#0c1119)]"
                    : "bg-[linear-gradient(145deg,#2c1a12,#19171d)]"
                }`}
              >
                <div className="text-xs uppercase tracking-[0.2em] text-white/44">
                  {index === 0 ? "계정" : "이벤트"}
                </div>
                <h2 className="mt-3 text-3xl font-semibold text-[#fff7ed]">{card.title}</h2>
                <p className="mt-3 text-sm leading-7 text-white/68">{card.summary}</p>
                <button
                  type="button"
                  className="mt-5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#121722]"
                >
                  {card.cta}
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#111825_0%,#17273d_48%,#f76b1c 130%)] p-6 lg:p-8">
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
                ["라이브 룸", "1,280", "지금 동시에 도는 파티 룸"],
                ["초대 코드", "즉시", "링크와 코드로 바로 합류"],
                ["공식 시즌", "4개", "이벤트형 파티챗 운영"],
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
            <p className="max-w-2xl text-sm leading-7 text-white/66">{section.description}</p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {featuredCards.map((card) => (
              <article
                key={card.id}
                className={`rounded-[1.8rem] border border-white/10 bg-gradient-to-br ${card.accent} p-[1px]`}
              >
                <div className="h-full rounded-[1.75rem] bg-[rgba(9,12,18,0.88)] p-5">
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
                </div>
              </article>
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
                {rail.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[1.5rem] border border-white/8 bg-[#0e141f] p-4"
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
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-white/44">Baseline</div>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                공개 Crack의 웹 홈 구조를 기준으로 다시 맞춘 시작점
              </h2>
            </div>
            <div className="text-sm text-white/56">
              다음 단계: 상세 카드, 실제 피드, 로그인 플로우, 작품 상세 재현
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
