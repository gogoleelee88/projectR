import { Suspense } from "react";
import { ProductShell } from "@/components/product-shell";

function ProductShellFallback() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[var(--surface)] p-8 text-sm text-white/64">
      제품 모드를 불러오는 중입니다.
    </div>
  );
}

export default function AppPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10">
      <div className="rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.04)] px-6 py-5">
        <div className="text-xs uppercase tracking-[0.22em] text-[var(--accent-soft)]">
          Project R App
        </div>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold text-white">
          탐색, 플레이, 생성, 운영을 한 화면에서 검증하는 제품 셸
        </h1>
      </div>

      <Suspense fallback={<ProductShellFallback />}>
        <ProductShell />
      </Suspense>
    </main>
  );
}
