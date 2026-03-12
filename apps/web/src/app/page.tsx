import Link from "next/link";
import {
  operatingLayers,
  releaseTracks,
  serviceModules,
  spotlightExperiences,
} from "@/data/catalog";

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.36em] text-[var(--accent-soft)]">
            Project R
          </div>
          <div className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold">
            AI Story Operating System
          </div>
        </div>
        <nav className="hidden gap-5 text-sm text-white/72 md:flex">
          <a href="#services">Services</a>
          <a href="#showcase">Showcase</a>
          <a href="#stack">Stack</a>
          <a href="#release">Release</a>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 pb-20 lg:px-10">
        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-8 backdrop-blur lg:p-12">
            <div className="mb-6 inline-flex rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/70">
              Web + Android + iOS
            </div>
            <h1 className="max-w-4xl font-[family-name:var(--font-display)] text-5xl leading-[0.95] font-semibold tracking-tight text-[#fff7ed] md:text-7xl">
              Crack의 핵심 서비스들을 하나의 글로벌 제품군으로 재구성하는 시작점
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/74 md:text-lg">
              현재 공개된 Crack의 스토리, 캐릭터, 파티챗, 이미지, 창작자 운영,
              장기 기억 축을 기준으로 웹 허브와 Android/iOS 앱을 동시에 설계한
              초기 프로덕션 셸입니다.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#services"
                className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[#130e09] transition-transform hover:-translate-y-0.5"
              >
                서비스 맵 보기
              </a>
              <a
                href="#release"
                className="rounded-full border border-white/14 bg-white/6 px-6 py-3 text-sm font-semibold text-white/86"
              >
                릴리즈 트랙 보기
              </a>
            </div>
          </div>

          <div className="grid gap-4">
            {[
              ["핵심 모듈", "6개", "스토리, 캐릭터, 파티챗, 이미지, 콘솔, 트러스트"],
              ["주요 타깃", "3개", "웹 허브, Android 앱, iOS 앱"],
              ["수익 루프", "4개", "채팅 업그레이드, 스토어, 구독, 시즌 패스"],
              ["운영 원칙", "24/7", "세이프티, 장기 기억, 모델 우회, 창작자 보호"],
            ].map(([label, value, detail]) => (
              <div
                key={label}
                className="rounded-[1.6rem] border border-white/10 bg-[var(--surface-strong)] p-6"
              >
                <div className="text-sm uppercase tracking-[0.2em] text-white/54">
                  {label}
                </div>
                <div className="mt-4 font-[family-name:var(--font-display)] text-5xl font-semibold text-[var(--highlight)]">
                  {value}
                </div>
                <p className="mt-4 text-sm leading-7 text-white/68">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="services"
          className="rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-7 lg:p-10"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.2em] text-[var(--accent-soft)]">
                Service Map
              </div>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold text-white md:text-4xl">
                모든 주요 서비스를 개별 성장축으로 분해
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-white/66">
              각 모듈은 독립적으로 확장되지만, 추천 피드와 결제 시스템, 장기 기억,
              세이프티 레이어를 공유하는 형태로 묶습니다.
            </p>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {serviceModules.map((service) => (
              <Link
                key={service.slug}
                href={`/service/${service.slug}`}
                className="group rounded-[1.7rem] border border-white/10 bg-[var(--surface)] p-6 transition-transform hover:-translate-y-1 hover:border-[var(--accent)]"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-[var(--accent-soft)]">
                      {service.label}
                    </div>
                    <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
                      {service.name}
                    </h3>
                  </div>
                  <div className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/70">
                    {service.targets.join(" / ")}
                  </div>
                </div>
                <p className="mt-4 text-lg leading-8 text-[#fff7ed]">
                  {service.headline}
                </p>
                <p className="mt-4 text-sm leading-7 text-white/66">
                  {service.summary}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {service.capabilities.map((capability) => (
                    <span
                      key={capability}
                      className="rounded-full bg-white/7 px-3 py-2 text-xs text-white/72"
                    >
                      {capability}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="showcase" className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-white/10 bg-[var(--surface)] p-7">
            <div className="text-sm uppercase tracking-[0.2em] text-[var(--accent-soft)]">
              Showcase
            </div>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-white">
              현재 Crack에서 보이는 강한 포맷들을 기준점으로 삼음
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/66">
              공식 파티챗, 대형 스토리 월드, 이미지 다량 탑재 작품 같은 실제 강점이
              제품 구조의 기준입니다.
            </p>
          </div>
          <div className="grid gap-4">
            {spotlightExperiences.map((experience) => (
              <div
                key={experience.title}
                className="rounded-[1.6rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="rounded-full border border-white/10 px-3 py-2 text-xs text-[var(--highlight)]">
                    {experience.category}
                  </span>
                  <span className="text-xs uppercase tracking-[0.16em] text-white/52">
                    {experience.owner}
                  </span>
                </div>
                <h3 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
                  {experience.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-white/68">
                  {experience.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="stack" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {operatingLayers.map((layer) => (
            <div
              key={layer.title}
              className="rounded-[1.6rem] border border-white/10 bg-[var(--surface-strong)] p-6"
            >
              <div className="font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
                {layer.title}
              </div>
              <p className="mt-4 text-sm leading-7 text-white/64">{layer.summary}</p>
            </div>
          ))}
        </section>

        <section
          id="release"
          className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(247,107,28,0.12),rgba(120,240,213,0.08))] p-7 lg:p-10"
        >
          <div className="flex flex-col gap-3">
            <div className="text-sm uppercase tracking-[0.2em] text-[var(--accent-soft)]">
              Release Tracks
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-white md:text-4xl">
              웹과 Android/iOS는 같은 브랜드 아래 다른 임무를 가진다
            </h2>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {releaseTracks.map((track) => (
              <div
                key={track.title}
                className="rounded-[1.7rem] border border-white/10 bg-[rgba(10,14,22,0.76)] p-6"
              >
                <div className="font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
                  {track.title}
                </div>
                <p className="mt-3 text-sm leading-7 text-white/68">
                  {track.subtitle}
                </p>
                <div className="mt-5 space-y-3">
                  {track.milestones.map((milestone) => (
                    <div
                      key={milestone}
                      className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white/76"
                    >
                      {milestone}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
