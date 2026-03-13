import { Suspense } from "react";
import { PartyRoomShell } from "@/components/party-room-shell";
import { fetchBootstrapPayloadServer } from "@/lib/projectr-api";

export const metadata = {
  title: "Party Chat",
  description:
    "Create or join live party rooms and submit turns with a Crack-style party flow.",
};

export default async function PartyPage() {
  const initialData = await fetchBootstrapPayloadServer();

  return (
    <Suspense fallback={null}>
      <PartyRoomShell initialData={initialData} />
    </Suspense>
  );
}
