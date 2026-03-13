import { DetailEngagement } from "@/components/detail-engagement";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  crackTabs,
  resolveCrackDetail,
  type CrackDetailKind,
} from "@/data/crack-clone";
import { fetchBootstrapPayloadServer } from "@/lib/projectr-api";

type PageProps = {
  params: Promise<{
    kind: string;
    id: string;
  }>;
};

const validKinds: CrackDetailKind[] = [
  "work",
  "character",
  "style",
  "template",
  "release",
];

function isValidKind(value: string): value is CrackDetailKind {
  return validKinds.includes(value as CrackDetailKind);
}

export async function generateMetadata({ params }: PageProps) {
  const { kind, id } = await params;

  if (!isValidKind(kind)) {
    return {
      title: "Detail",
    };
  }

  const data = await fetchBootstrapPayloadServer();
  const detail = resolveCrackDetail(data, kind, id);

  if (!detail) {
    return {
      title: "Detail",
    };
  }

  return {
    title: detail.title,
    description: detail.summary,
  };
}

export default async function DetailPage({ params }: PageProps) {
  const { kind, id } = await params;

  if (!isValidKind(kind)) {
    notFound();
  }

  const data = await fetchBootstrapPayloadServer();
  const detail = resolveCrackDetail(data, kind, id);

  if (!detail) {
    notFound();
  }

  const tabLabel = crackTabs.find((tab) => tab.id === detail.tab)?.label ?? "홈";
  const detailClassName =
    detail.kind === "style" ? "" : `bg-gradient-to-br ${detail.accent}`;
  const detailStyle =
    detail.kind === "style" ? { backgroundImage: detail.accent } : undefined;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 lg:px-10">
      <Link
        href={`/?tab=${detail.tab}`}
        className="inline-flex w-fit rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm text-white/72"
      >
        {tabLabel}로 돌아가기
      </Link>

      <section
        className={`rounded-[2rem] border border-white/10 p-[1px] ${detailClassName}`}
        style={detailStyle}
      >
        <div className="rounded-[1.95rem] bg-[rgba(11,15,22,0.92)] p-8 lg:p-10">
          <div className="text-sm uppercase tracking-[0.2em] text-[var(--accent-soft)]">
            {detail.eyebrow}
          </div>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold text-[#fff7ed] md:text-6xl">
            {detail.title}
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-white/72">
            {detail.summary}
          </p>
          <div className="mt-4 text-sm text-white/58">{detail.meta}</div>
          <div className="mt-6 flex flex-wrap gap-2">
            {detail.chips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70"
              >
                {chip}
              </span>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={detail.primaryCta.href}
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#130e09]"
            >
              {detail.primaryCta.label}
            </Link>
            <Link
              href={detail.secondaryCta.href}
              className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/72"
            >
              {detail.secondaryCta.label}
            </Link>
          </div>
          <DetailEngagement kind={detail.kind} id={detail.id} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {detail.stats.map((metric) => (
          <div
            key={metric.label}
            className="rounded-[1.8rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-6"
          >
            <div className="text-xs uppercase tracking-[0.16em] text-white/48">
              {metric.label}
            </div>
            <div className="mt-3 text-3xl font-semibold text-white">{metric.value}</div>
            <p className="mt-3 text-sm leading-7 text-white/64">{metric.detail}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {detail.sections.map((section) => (
          <div
            key={section.title}
            className="rounded-[1.8rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-7"
          >
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
              {section.title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/68">{section.body}</p>
            {section.items.length > 0 && (
              <div className="mt-5 space-y-3">
                {section.items.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/8 bg-white/4 px-4 py-4 text-sm text-white/76"
                  >
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}
