import { Suspense } from "react";
import { CrackHomeShell } from "@/components/crack-home-shell";
import { fetchBootstrapPayloadServer } from "@/lib/projectr-api";

export default async function Home() {
  const initialData = await fetchBootstrapPayloadServer();

  return (
    <Suspense fallback={null}>
      <CrackHomeShell initialData={initialData} />
    </Suspense>
  );
}
