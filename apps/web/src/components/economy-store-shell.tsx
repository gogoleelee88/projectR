"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";

import {
  AUTH_TOKEN_KEY,
  fetchCurrentSession,
  type EconomyCatalogPayload,
  type EconomyCheckoutPayload,
  type EconomyInventoryItem,
  type EconomyOffer,
  type EconomyRedeemPayload,
  type EconomyRedemption,
  type EconomyStatePayload,
  type SessionState,
} from "@/lib/projectr-api";

type EconomyStoreShellProps = {
  initialCatalog: EconomyCatalogPayload;
};

type SyncMode = "guest" | "syncing" | "synced";

function formatWon(value: number): string {
  return `KRW ${value.toLocaleString("en-US")}`;
}

function formatSigned(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toLocaleString("en-US")}`;
}

async function requestWithToken<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`http://127.0.0.1:8000${path}`, {
      ...init,
      headers,
    });
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

export function EconomyStoreShell({
  initialCatalog,
}: EconomyStoreShellProps) {
  const [syncMode, setSyncMode] = useState<SyncMode>("syncing");
  const [session, setSession] = useState<SessionState | null>(null);
  const [offers, setOffers] = useState<EconomyOffer[]>(initialCatalog.offers);
  const [redemptions, setRedemptions] = useState<EconomyRedemption[]>(
    initialCatalog.redemptions,
  );
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [membership, setMembership] = useState<string>("Guest");
  const [inventory, setInventory] = useState<EconomyInventoryItem[]>([]);
  const [ledger, setLedger] = useState<EconomyStatePayload["ledger"]>([]);
  const [activeSubscription, setActiveSubscription] = useState<
    EconomyStatePayload["activeSubscription"]
  >(null);
  const [lane, setLane] = useState<"offers" | "exchange">("offers");
  const [message, setMessage] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const premiumValue = useMemo(
    () =>
      inventory.reduce((sum, item) => {
        if (item.category === "studio-credit") {
          return sum + item.quantity * 140;
        }
        if (item.category === "creator-slot") {
          return sum + item.quantity * 420;
        }
        return sum + item.quantity * 260;
      }, 0),
    [inventory],
  );

  const activityMomentum = useMemo(
    () =>
      ledger
        .slice(0, 6)
        .reduce((sum, entry) => sum + Math.abs(entry.amountDelta), 0),
    [ledger],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        if (!cancelled) {
          setSyncMode("guest");
          setSession(null);
          setWalletBalance(null);
          setMembership("Guest Preview");
          setInventory([]);
          setLedger([]);
          setActiveSubscription(null);
        }
        return;
      }

      const remoteSession = await fetchCurrentSession(token);
      if (!remoteSession) {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
        if (!cancelled) {
          setSyncMode("guest");
          setSession(null);
          setWalletBalance(null);
          setMembership("Guest Preview");
        }
        return;
      }

      const { data, error } = await requestWithToken<EconomyStatePayload>(
        "/economy/state",
        token,
      );
      if (!cancelled) {
        setSession(remoteSession);
        if (!data) {
          setSyncMode("guest");
          setMessage(
            error ?? "경제 상태를 불러오지 못했습니다. 공개 카탈로그 프리뷰를 표시합니다.",
          );
          setWalletBalance(remoteSession.sparks);
          setMembership(remoteSession.membership);
          return;
        }
        startTransition(() => {
          setOffers(data.offers);
          setRedemptions(data.redemptions);
          setWalletBalance(data.walletBalance);
          setMembership(data.membership);
          setInventory(data.inventory);
          setLedger(data.ledger);
          setActiveSubscription(data.activeSubscription);
          setSyncMode("synced");
        });
      }
    }

    void loadState();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCheckout = async (offer: EconomyOffer) => {
    const token =
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setMessage("로그인 유저만 실결제와 지갑 반영을 진행할 수 있습니다.");
      return;
    }

    setPendingId(offer.id);
    const { data, error } = await requestWithToken<EconomyCheckoutPayload>(
      `/economy/offers/${encodeURIComponent(offer.id)}/checkout`,
      token,
      { method: "POST" },
    );
    setPendingId(null);

    if (!data) {
      setMessage(error ?? "오퍼 결제를 시작하지 못했습니다.");
      return;
    }

    setWalletBalance(data.walletBalance);
    setActiveSubscription(data.activeSubscription);
    setMessage(
      data.status === "paid"
        ? `${offer.name} 결제가 반영되었습니다.`
        : `${offer.name} 결제가 ${data.status} 상태로 생성되었습니다.`,
    );

    if (data.checkoutUrl) {
      window.open(data.checkoutUrl, "_blank", "noopener,noreferrer");
    }

    const refreshed = await requestWithToken<EconomyStatePayload>(
      "/economy/state",
      token,
    );
    if (refreshed.data) {
      setOffers(refreshed.data.offers);
      setRedemptions(refreshed.data.redemptions);
      setWalletBalance(refreshed.data.walletBalance);
      setMembership(refreshed.data.membership);
      setInventory(refreshed.data.inventory);
      setLedger(refreshed.data.ledger);
      setActiveSubscription(refreshed.data.activeSubscription);
      setSyncMode("synced");
    }
  };

  const handleRedeem = async (redemption: EconomyRedemption) => {
    const token =
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setMessage("로그인 유저만 보상 교환과 인벤토리 동기화를 사용할 수 있습니다.");
      return;
    }

    setPendingId(redemption.id);
    const { data, error } = await requestWithToken<EconomyRedeemPayload>(
      `/economy/redemptions/${encodeURIComponent(redemption.id)}/redeem`,
      token,
      { method: "POST" },
    );
    setPendingId(null);

    if (!data) {
      setMessage(error ?? "보상 교환에 실패했습니다.");
      return;
    }

    setWalletBalance(data.walletBalance);
    setInventory((current) => {
      const existing = current.find((item) => item.itemId === data.grantedItem.itemId);
      if (!existing) {
        return [data.grantedItem, ...current];
      }
      return current.map((item) =>
        item.itemId === data.grantedItem.itemId ? data.grantedItem : item,
      );
    });
    setLedger((current) => [data.latestEntry, ...current].slice(0, 18));
    setMessage(`${redemption.title} 교환이 완료되었습니다.`);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,174,92,0.18),transparent_34%),linear-gradient(180deg,#060b12_0%,#08111a_42%,#05070a_100%)] text-white">
      <div className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8 lg:px-10">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-[#ffbf86]">
                Economy Console
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#fff6ea] sm:text-5xl">
                Payment, rewards, and return loops in one operating lane.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/66 sm:text-base">
                Public catalog for guests, account-synced wallet and unlock vault for
                logged-in players. This is the layer that turns story and character
                engagement into repeatable spending and retention loops.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="rounded-full border border-white/12 px-4 py-2 text-sm text-white/72"
              >
                Home
              </Link>
              {session ? (
                <div className="rounded-full border border-[#79f0d6]/28 bg-[#0c171b] px-4 py-2 text-sm text-[#79f0d6]">
                  {session.name} · {membership}
                </div>
              ) : (
                <Link
                  href="/?login=1"
                  className="rounded-full bg-[#fff4e5] px-4 py-2 text-sm font-semibold text-[#11161e]"
                >
                  로그인하고 지갑 연결
                </Link>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1.25fr_0.95fr]">
            <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(245,169,94,0.12)_0%,rgba(10,15,22,0.88)_44%,rgba(6,11,18,0.94)_100%)] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-[#ffbf86]">
                    Wallet Status
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                    {walletBalance === null
                      ? "Guest preview"
                      : `${walletBalance.toLocaleString("en-US")} sparks`}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
                    {syncMode === "synced"
                      ? "The wallet is synced to the account and every reward or redemption hits the ledger."
                      : "Guests can browse the catalog, but purchases and redemptions require a live account session."}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-3 text-right">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/45">
                    Active lane
                  </div>
                  <div className="mt-2 text-xl font-semibold text-[#79f0d6]">
                    {activeSubscription?.planName ?? membership}
                  </div>
                  <div className="mt-1 text-xs text-white/50">
                    {activeSubscription
                      ? `Renews ${new Date(activeSubscription.renewalAt).toLocaleDateString("ko-KR")}`
                      : "No recurring lane connected yet"}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  [
                    "Wallet Bank",
                    walletBalance === null ? "Preview" : walletBalance.toLocaleString("en-US"),
                    "Soft currency from play rewards and paid offers.",
                  ],
                  [
                    "Unlock Vault",
                    inventory.length.toLocaleString("en-US"),
                    "Premium inventory, route keys, creator slots, and collector drops.",
                  ],
                  [
                    "Momentum",
                    activityMomentum.toLocaleString("en-US"),
                    "Recent economy throughput captured in the wallet ledger.",
                  ],
                ].map(([label, value, detail]) => (
                  <div
                    key={label}
                    className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4"
                  >
                    <div className="text-xs uppercase tracking-[0.18em] text-white/42">
                      {label}
                    </div>
                    <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
                    <div className="mt-2 text-sm leading-6 text-white/56">{detail}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-[#0c1119] p-6">
              <div className="text-xs uppercase tracking-[0.2em] text-[#79f0d6]">
                Return Loop
              </div>
              <div className="mt-3 text-2xl font-semibold text-white">
                Buy, earn, redeem, return.
              </div>
              <div className="mt-3 text-sm leading-7 text-white/62">
                Paid offers add sparks and premium inventory. Story clears and character
                bonds feed the same wallet. Redemptions then reopen gated routes,
                creator slots, and studio credits.
              </div>

              <div className="mt-6 space-y-3">
                {[
                  "1. Paid offers seed the wallet and unlock premium inventory.",
                  "2. Story and character rewards keep the spark bank growing.",
                  "3. Redemption items reopen premium routes and creation capacity.",
                  "4. Ledger visibility makes the economy legible for repeat spending.",
                ].map((line) => (
                  <div
                    key={line}
                    className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/70"
                  >
                    {line}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setLane("offers")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    lane === "offers"
                      ? "bg-[#fff4e5] text-[#10141a]"
                      : "border border-white/12 text-white/66"
                  }`}
                >
                  Featured offers
                </button>
                <button
                  type="button"
                  onClick={() => setLane("exchange")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    lane === "exchange"
                      ? "bg-[#79f0d6] text-[#081015]"
                      : "border border-white/12 text-white/66"
                  }`}
                >
                  Reward exchange
                </button>
                <Link
                  href="/character/astra"
                  className="rounded-full border border-white/12 px-4 py-2 text-sm text-white/70"
                >
                  Character loop
                </Link>
              </div>
            </section>
          </div>
        </div>

        {message ? (
          <div className="mt-5 rounded-[1.3rem] border border-[#79f0d6]/22 bg-[#0c171b] px-5 py-4 text-sm text-[#d7fff6]">
            {message}
          </div>
        ) : null}

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.25fr_0.95fr]">
          <div className="space-y-5">
            <div className="rounded-[2rem] border border-white/10 bg-[#090e14] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-[#ffbf86]">
                    {lane === "offers" ? "Featured offers" : "Reward exchange"}
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {lane === "offers"
                      ? "Offer lanes tuned for conversion"
                      : "Spend sparks on reusable premium unlocks"}
                  </h2>
                </div>
                <div className="text-sm text-white/46">
                  {lane === "offers" ? `${offers.length} live offers` : `${redemptions.length} exchange items`}
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {(lane === "offers" ? offers : redemptions).map((entry) => {
                  const isOffer = "offerType" in entry;
                  return (
                    <article
                      key={entry.id}
                      className="rounded-[1.7rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(8,12,18,0.8)_100%)] p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-[#79f0d6]">
                            {entry.badge}
                          </div>
                          <h3 className="mt-2 text-xl font-semibold text-white">
                            {isOffer
                              ? (entry as EconomyOffer).name
                              : (entry as EconomyRedemption).title}
                          </h3>
                          <p className="mt-2 text-sm leading-7 text-white/62">
                            {entry.summary}
                          </p>
                        </div>
                        <div className="rounded-[1.1rem] border border-white/10 px-3 py-2 text-right">
                          <div className="text-xs uppercase tracking-[0.18em] text-white/42">
                            {isOffer ? "Checkout" : "Redeem"}
                          </div>
                          <div className="mt-2 text-lg font-semibold text-white">
                            {isOffer
                              ? formatWon((entry as EconomyOffer).price)
                              : `${(entry as EconomyRedemption).sparksCost.toLocaleString("en-US")} sparks`}
                          </div>
                        </div>
                      </div>

                      {"headline" in entry ? (
                        <div className="mt-4 rounded-[1.2rem] border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/62">
                          {(entry as EconomyOffer).headline}
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {entry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/62"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {"includedUnlocks" in entry ? (
                        <div className="mt-5 space-y-2">
                          {(entry as EconomyOffer).includedUnlocks.map((unlock) => (
                            <div
                              key={unlock.itemId}
                              className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] px-4 py-3"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold text-white">
                                    {unlock.title}
                                  </div>
                                  <div className="mt-1 text-xs text-white/56">
                                    {unlock.summary}
                                  </div>
                                </div>
                                <div className="text-xs text-[#ffbf86]">
                                  x{unlock.quantity}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-5 rounded-[1.1rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/62">
                          {(entry as EconomyRedemption).grant.title} ·{" "}
                          {(entry as EconomyRedemption).grant.summary}
                        </div>
                      )}

                      <div className="mt-5 flex items-center justify-between gap-3">
                        <div className="text-sm text-white/50">
                          {isOffer
                            ? `${(entry as EconomyOffer).grantSparks + (entry as EconomyOffer).bonusSparks} sparks total payout`
                            : (entry as EconomyRedemption).repeatable
                              ? "Repeatable reward lane"
                              : "One-time premium unlock"}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            isOffer
                              ? void handleCheckout(entry as EconomyOffer)
                              : void handleRedeem(entry as EconomyRedemption)
                          }
                          disabled={pendingId === entry.id}
                          className={`rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
                            isOffer
                              ? "bg-[#fff4e5] text-[#10141a]"
                              : "bg-[#79f0d6] text-[#081015]"
                          }`}
                        >
                          {pendingId === entry.id
                            ? "처리 중..."
                            : isOffer
                              ? "오퍼 구매"
                              : "스파크 교환"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[#090e14] p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-[#ffbf86]">
                Activity ledger
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Wallet movements users can actually trust
              </h2>
              <div className="mt-4 space-y-3">
                {ledger.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/12 px-4 py-5 text-sm text-white/52">
                    로그인 후 스토리 클리어, 캐릭터 보상, 구매, 교환이 지갑 원장에 시간순으로 누적됩니다.
                  </div>
                ) : (
                  ledger.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-4"
                    >
                      <div>
                        <div className="text-sm font-semibold text-white">{entry.title}</div>
                        <div className="mt-1 text-xs text-white/56">{entry.summary}</div>
                        <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/34">
                          {entry.sourceKind} · {new Date(entry.createdAt).toLocaleString("ko-KR")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-lg font-semibold ${
                            entry.amountDelta >= 0 ? "text-[#79f0d6]" : "text-[#ff8f8f]"
                          }`}
                        >
                          {formatSigned(entry.amountDelta)} sparks
                        </div>
                        <div className="mt-1 text-xs text-white/50">
                          balance {entry.balanceAfter.toLocaleString("en-US")}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <section className="rounded-[2rem] border border-white/10 bg-[#090e14] p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-[#79f0d6]">
                Unlock vault
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Paid inventory and redeemed capacity
              </h2>
              <div className="mt-5 space-y-3">
                {inventory.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/12 px-4 py-5 text-sm text-white/52">
                    아직 계정 단위 인벤토리가 없습니다. 오퍼 구매나 스파크 교환 후 이 공간이 채워집니다.
                  </div>
                ) : (
                  inventory.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">{item.title}</div>
                          <div className="mt-1 text-xs text-white/56">{item.summary}</div>
                        </div>
                        <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#ffbf86]">
                          x{item.quantity}
                        </div>
                      </div>
                      <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/32">
                        {item.category} · {new Date(item.updatedAt).toLocaleDateString("ko-KR")}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(121,240,214,0.08)_0%,rgba(8,12,18,0.92)_100%)] p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-[#79f0d6]">
                Economy pulse
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Premium value already held by this account
              </h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  [
                    "Premium units",
                    inventory.reduce((sum, item) => sum + item.quantity, 0).toLocaleString("en-US"),
                    "Total quantity of premium items, slots, and credit packs.",
                  ],
                  [
                    "Value density",
                    premiumValue.toLocaleString("en-US"),
                    "Simple internal score showing how much premium capacity is already in inventory.",
                  ],
                  [
                    "Recurring lane",
                    activeSubscription ? activeSubscription.planName : "Not connected",
                    "Active recurring revenue lane on the account.",
                  ],
                  [
                    "Guest path",
                    syncMode === "guest" ? "Preview only" : "Live sync",
                    "Guests see catalog preview, members get wallet and inventory sync.",
                  ],
                ].map(([label, value, detail]) => (
                  <div
                    key={label}
                    className="rounded-[1.2rem] border border-white/8 bg-black/18 p-4"
                  >
                    <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                      {label}
                    </div>
                    <div className="mt-3 text-xl font-semibold text-white">{value}</div>
                    <div className="mt-2 text-sm leading-6 text-white/56">{detail}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
