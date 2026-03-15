import { EconomyStoreShell } from "@/components/economy-store-shell";
import { fetchEconomyCatalogServer } from "@/lib/projectr-api";

export default async function StorePage() {
  const catalog = await fetchEconomyCatalogServer();

  return <EconomyStoreShell initialCatalog={catalog} />;
}
