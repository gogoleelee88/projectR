"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  AUTH_TOKEN_KEY,
  fetchCurrentSession,
  type EconomyCatalogPayload,
  type EconomyInventoryItem,
  type EconomyOffer,
  type EconomyRedeemPayload,
  type EconomyRedemption,
  type EconomyStatePayload,
  type PaymentIntentEnvelope,
  type SessionState,
} from "@/lib/projectr-api";

type Props = { initialCatalog: EconomyCatalogPayload };
type Lane = "offers" | "exchange";

async function requestWithToken<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const response = await fetch(`http://127.0.0.1:8000${path}`, { ...init, headers });
    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      const detail =
        payload && typeof payload === "object" && "detail" in payload
          ? String(payload.detail)
          : "Request failed";
      return { data: null, error: detail };
    }
    return { data: payload as T, error: null };
  } catch {
    return { data: null, error: "Network request failed" };
  }
}

function formatWon(value: number): string {
  return `KRW ${value.toLocaleString("en-US")}`;
}

export function EconomyStoreShell({ initialCatalog }: Props) {
  const [lane, setLane] = useState<Lane>("offers");
  const [session, setSession] = useState<SessionState | null>(null);
  const [offers, setOffers] = useState(initialCatalog.offers);
  const [redemptions, setRedemptions] = useState(initialCatalog.redemptions);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [inventory, setInventory] = useState<EconomyInventoryItem[]>([]);
  const [ledger, setLedger] = useState<EconomyStatePayload["ledger"]>([]);
  const [payments, setPayments] = useState<PaymentIntentEnvelope[]>([]);
  const [membership, setMembership] = useState("Guest Preview");
  const [message, setMessage] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const premiumUnits = useMemo(
    () => inventory.reduce((sum, item) => sum + item.quantity, 0),
    [inventory],
  );
  const settlementVolume = useMemo(
    () =>
      payments
        .filter((entry) => entry.intent.status === "settled")
        .reduce((sum, entry) => sum + entry.intent.amount, 0),
    [payments],
  );

  async function refreshAccount(token: string, currentSession?: SessionState | null) {
    const [economyResult, paymentResult] = await Promise.all([
      requestWithToken<EconomyStatePayload>("/economy/state", token),
      requestWithToken<PaymentIntentEnvelope[]>("/payments/intents", token),
    ]);
    if (currentSession) setSession(currentSession);
    if (economyResult.data) {
      setOffers(economyResult.data.offers);
      setRedemptions(economyResult.data.redemptions);
      setWalletBalance(economyResult.data.walletBalance);
      setMembership(economyResult.data.membership);
      setInventory(economyResult.data.inventory);
      setLedger(economyResult.data.ledger);
    }
    setPayments(paymentResult.data ?? []);
  }

  useEffect(() => {
    async function load() {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return;
      const currentSession = await fetchCurrentSession(token);
      if (!currentSession) {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
        return;
      }
      await refreshAccount(token, currentSession);
    }
    void load();
  }, []);

  async function handleCheckout(offer: EconomyOffer) {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setMessage("Log in to create and settle a payment intent.");
      return;
    }
    const provider = process.env.NEXT_PUBLIC_WEB_PAYMENT_PROVIDER ?? "web-sandbox";
    setPendingId(offer.id);
    const created = await requestWithToken<PaymentIntentEnvelope>("/payments/intents", token, {
      method: "POST",
      body: JSON.stringify({ offerId: offer.id, provider, platform: "web" }),
    });
    if (!created.data) {
      setPendingId(null);
      setMessage(created.error ?? "Unable to create payment intent.");
      return;
    }
    const checkoutUrl =
      typeof created.data.intent.providerPayload?.checkoutUrl === "string"
        ? created.data.intent.providerPayload.checkoutUrl
        : null;
    if (checkoutUrl) {
      setPendingId(null);
      setMessage("Stripe checkout session created. Complete payment in the hosted checkout window.");
      window.open(checkoutUrl, "_blank", "noopener,noreferrer");
      await refreshAccount(token);
      return;
    }
    const ref = `web-${offer.id}-${Date.now()}`;
    const confirmed = await requestWithToken<PaymentIntentEnvelope>(
      `/payments/intents/${encodeURIComponent(created.data.intent.id)}/confirm`,
      token,
      {
        method: "POST",
        body: JSON.stringify({
          receiptToken: `${ref}-receipt`,
          providerReference: ref,
          verificationPayload: { channel: "web", mode: "sandbox-auto-approve" },
        }),
      },
    );
    setPendingId(null);
    if (!confirmed.data) {
      setMessage(confirmed.error ?? "Unable to confirm payment intent.");
      return;
    }
    setMessage(`${offer.name} ${confirmed.data.intent.status}.`);
    await refreshAccount(token);
  }

  async function handleRedeem(redemption: EconomyRedemption) {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setMessage("Log in to redeem sparks.");
      return;
    }
    setPendingId(redemption.id);
    const result = await requestWithToken<EconomyRedeemPayload>(
      `/economy/redemptions/${encodeURIComponent(redemption.id)}/redeem`,
      token,
      { method: "POST" },
    );
    setPendingId(null);
    if (!result.data) {
      setMessage(result.error ?? "Unable to redeem sparks.");
      return;
    }
    setMessage(`${redemption.title} redeemed.`);
    await refreshAccount(token);
  }

  const items = lane === "offers" ? offers : redemptions;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#071018_0%,#0b1520_45%,#05080c_100%)] text-white">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.26em] text-[#f6b271]">Economy Console</div>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#fff6ea] sm:text-5xl">Intent-based commerce for wallet, rewards, and premium unlocks.</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/66">Guests browse the catalog. Logged-in players create payment intents, confirm settlement, sync wallet balance, and unlock premium inventory that flows into story and character loops.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/" className="rounded-full border border-white/12 px-4 py-2 text-sm text-white/72">Home</Link>
              <Link href="/character/astra" className="rounded-full border border-white/12 px-4 py-2 text-sm text-white/72">Character loop</Link>
              <div className="rounded-full border border-[#79f0d6]/28 bg-[#0c171b] px-4 py-2 text-sm text-[#79f0d6]">{session ? `${session.name} · ${membership}` : "Guest Preview"}</div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              ["Wallet", walletBalance === null ? "Guest" : `${walletBalance.toLocaleString("en-US")} sparks`],
              ["Premium", premiumUnits.toLocaleString("en-US")],
              ["Payments", payments.length.toLocaleString("en-US")],
              ["Settled volume", formatWon(settlementVolume)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-white/42">{label}</div>
                <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {message ? <div className="mt-5 rounded-[1.2rem] border border-[#79f0d6]/20 bg-[#0c171b] px-4 py-3 text-sm text-[#d7fff6]">{message}</div> : null}

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-5">
            <div className="flex gap-3">
              <button type="button" onClick={() => setLane("offers")} className={`rounded-full px-4 py-2 text-sm font-semibold ${lane === "offers" ? "bg-[#fff4e5] text-[#10141a]" : "border border-white/12 text-white/66"}`}>Offers</button>
              <button type="button" onClick={() => setLane("exchange")} className={`rounded-full px-4 py-2 text-sm font-semibold ${lane === "exchange" ? "bg-[#79f0d6] text-[#081015]" : "border border-white/12 text-white/66"}`}>Exchange</button>
            </div>
            {items.map((entry) => (
              <article key={entry.id} className="rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-[#79f0d6]">{entry.badge}</div>
                <h2 className="mt-2 text-xl font-semibold text-white">{"offerType" in entry ? entry.name : entry.title}</h2>
                <p className="mt-2 text-sm leading-7 text-white/62">{entry.summary}</p>
                <div className="mt-4 text-sm text-[#f6b271]">{"offerType" in entry ? formatWon(entry.price) : `${entry.sparksCost.toLocaleString("en-US")} sparks`}</div>
                <button type="button" onClick={() => ("offerType" in entry ? void handleCheckout(entry) : void handleRedeem(entry))} disabled={pendingId === entry.id} className={`mt-5 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-60 ${"offerType" in entry ? "bg-[#fff4e5] text-[#10141a]" : "bg-[#79f0d6] text-[#081015]"}`}>
                  {pendingId === entry.id ? "Processing..." : "offerType" in entry ? "Create intent and settle" : "Redeem sparks"}
                </button>
              </article>
            ))}
          </section>

          <section className="space-y-5">
            <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-[#f6b271]">Payment timeline</div>
              <div className="mt-4 space-y-3">
                {payments.length === 0 ? <div className="rounded-[1rem] border border-dashed border-white/12 px-4 py-5 text-sm text-white/52">No payment intents yet.</div> : payments.map((entry) => <div key={entry.intent.id} className="rounded-[1rem] border border-white/10 bg-black/20 p-4"><div className="flex items-center justify-between gap-3"><div><div className="text-sm font-semibold text-white">{entry.offer.name}</div><div className="mt-1 text-xs uppercase tracking-[0.16em] text-white/40">{entry.intent.provider} · {entry.intent.platform}</div></div><div className="text-sm font-semibold text-[#79f0d6]">{entry.intent.status}</div></div><div className="mt-3 text-xs text-white/56">{entry.events.map((event) => event.eventType).join(" -> ")}</div></div>)}
              </div>
            </div>

            <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-[#79f0d6]">Unlock vault</div>
              <div className="mt-4 space-y-3">
                {inventory.length === 0 ? <div className="rounded-[1rem] border border-dashed border-white/12 px-4 py-5 text-sm text-white/52">No premium inventory unlocked yet.</div> : inventory.map((item) => <div key={item.id} className="rounded-[1rem] border border-white/10 bg-black/20 p-4"><div className="text-sm font-semibold text-white">{item.title}</div><div className="mt-1 text-xs text-white/56">{item.summary}</div><div className="mt-2 text-[11px] uppercase tracking-[0.16em] text-white/40">{item.category} · x{item.quantity}</div></div>)}
              </div>
            </div>

            <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-[#79f0d6]">Wallet ledger</div>
              <div className="mt-4 space-y-3">
                {ledger.length === 0 ? <div className="rounded-[1rem] border border-dashed border-white/12 px-4 py-5 text-sm text-white/52">No wallet activity synced yet.</div> : ledger.slice(0, 6).map((entry) => <div key={entry.id} className="rounded-[1rem] border border-white/10 bg-black/20 p-4"><div className="text-sm font-semibold text-white">{entry.title}</div><div className="mt-1 text-xs text-white/56">{entry.summary}</div><div className="mt-2 text-[11px] uppercase tracking-[0.16em] text-white/40">{entry.amountDelta > 0 ? "+" : ""}{entry.amountDelta} sparks · balance {entry.balanceAfter}</div></div>)}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
