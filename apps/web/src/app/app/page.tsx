import { Suspense } from "react";
import { ProductShell } from "@/components/product-shell";
import type { BootstrapPayload } from "@/data/platform";

function ProductShellFallback() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[var(--surface)] p-8 text-sm text-white/64">
      서버 bootstrap을 불러오는 중입니다.
    </div>
  );
}

async function getBootstrapPayload(): Promise<{
  initialData: BootstrapPayload | null;
  initialApiStatus: "online" | "offline";
}> {
  const apiBase =
    process.env.PROJECTR_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://127.0.0.1:8000";

  try {
    const response = await fetch(`${apiBase}/bootstrap`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        initialData: null,
        initialApiStatus: "offline",
      };
    }

    return {
      initialData: (await response.json()) as BootstrapPayload,
      initialApiStatus: "online",
    };
  } catch {
    return {
      initialData: null,
      initialApiStatus: "offline",
    };
  }
}

export default async function AppPage() {
  const { initialData, initialApiStatus } = await getBootstrapPayload();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10">
      <div className="rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.04)] px-6 py-5">
        <div className="text-xs uppercase tracking-[0.22em] text-[var(--accent-soft)]">
          Project R App
        </div>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold text-white">
          탐색, 플레이, 생성, 구독 운영까지 한 화면에서 검증하는 제품 런타임
        </h1>
      </div>

      <Suspense fallback={<ProductShellFallback />}>
        <ProductShell
          initialData={initialData}
          initialApiStatus={initialApiStatus}
        />
      </Suspense>
    </main>
  );
}
