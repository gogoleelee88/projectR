import Link from "next/link";
import { notFound } from "next/navigation";
import { serviceModules } from "@/data/catalog";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return serviceModules.map((service) => ({
    slug: service.slug,
  }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const service = serviceModules.find((entry) => entry.slug === slug);

  if (!service) {
    return {
      title: "Service",
    };
  }

  return {
    title: service.name,
    description: service.summary,
  };
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const service = serviceModules.find((entry) => entry.slug === slug);

  if (!service) {
    notFound();
  }

  const related = serviceModules
    .filter((entry) => entry.slug !== service.slug)
    .slice(0, 3);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 lg:px-10">
      <Link
        href="/"
        className="inline-flex w-fit rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm text-white/72"
      >
        Home
      </Link>

      <section className="rounded-[2rem] border border-white/10 bg-[var(--surface)] p-8 lg:p-10">
        <div className="text-sm uppercase tracking-[0.2em] text-[var(--accent-soft)]">
          {service.label}
        </div>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold text-[#fff7ed] md:text-6xl">
          {service.name}
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-white/72">
          {service.headline}
        </p>
        <p className="mt-6 max-w-3xl text-sm leading-7 text-white/64">
          {service.summary}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {service.targets.map((target) => (
            <span
              key={target}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70"
            >
              {target}
            </span>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[1.8rem] border border-white/10 bg-[var(--surface-strong)] p-7">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
            Core Capabilities
          </h2>
          <div className="mt-5 space-y-3">
            {service.capabilities.map((capability) => (
              <div
                key={capability}
                className="rounded-2xl border border-white/8 bg-white/4 px-4 py-4 text-sm text-white/76"
              >
                {capability}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[1.8rem] border border-white/10 bg-[rgba(247,107,28,0.12)] p-7">
            <div className="text-sm uppercase tracking-[0.2em] text-[var(--accent-soft)]">
              Monetization
            </div>
            <p className="mt-4 text-sm leading-7 text-white/76">
              {service.monetization}
            </p>
          </div>
          <div className="rounded-[1.8rem] border border-white/10 bg-[rgba(120,240,213,0.08)] p-7">
            <div className="text-sm uppercase tracking-[0.2em] text-[var(--highlight)]">
              Trust & Safety
            </div>
            <p className="mt-4 text-sm leading-7 text-white/76">{service.safety}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.2em] text-[var(--accent-soft)]">
              Demo Jump
            </div>
            <p className="mt-2 text-sm leading-7 text-white/68">
              이 모듈은 제품 모드에서 바로 체험할 수 있습니다.
            </p>
          </div>
          <Link
            href={`/app?module=${service.slug}`}
            className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#130e09]"
          >
            {service.name} 체험하기
          </Link>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-7">
        <div className="text-sm uppercase tracking-[0.2em] text-white/54">
          Related Modules
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {related.map((entry) => (
            <Link
              key={entry.slug}
              href={`/service/${entry.slug}`}
              className="rounded-[1.5rem] border border-white/10 bg-[var(--surface)] p-5"
            >
              <div className="font-[family-name:var(--font-display)] text-xl font-semibold text-white">
                {entry.name}
              </div>
              <p className="mt-3 text-sm leading-7 text-white/64">{entry.headline}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
