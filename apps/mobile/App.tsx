import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Lane = "offers" | "vault" | "payments";
type Session = { id: string; name: string; membership: string; sparks: number };
type Offer = { id: string; name: string; summary: string; price: number; badge: string; grantSparks: number };
type Redemption = { id: string; title: string; summary: string; sparksCost: number; badge: string };
type InventoryItem = { id: string; title: string; summary: string; quantity: number; category: string };
type LedgerEntry = { id: string; title: string; summary: string; amountDelta: number; balanceAfter: number; createdAt: string };
type EconomyState = {
  walletBalance: number;
  membership: string;
  inventory: InventoryItem[];
  ledger: LedgerEntry[];
};
type PaymentIntent = { id: string; status: string; amount: number; provider: string; platform: string; updatedAt: string };
type PaymentEvent = { id: string; eventType: string; status: string };
type PaymentEnvelope = { intent: PaymentIntent; offer: Offer; events: PaymentEvent[] };

const DEFAULT_API_BASE =
  Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://127.0.0.1:8000";

async function requestJson<T>(
  apiBase: string,
  path: string,
  init?: RequestInit,
  token?: string | null,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const headers = new Headers(init?.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const response = await fetch(`${apiBase}${path}`, { ...init, headers });
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

export default function App() {
  const [lane, setLane] = useState<Lane>("offers");
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE);
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [economy, setEconomy] = useState<EconomyState | null>(null);
  const [payments, setPayments] = useState<PaymentEnvelope[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const premiumUnits = useMemo(
    () => (economy ? economy.inventory.reduce((sum, item) => sum + item.quantity, 0) : 0),
    [economy],
  );

  async function refreshCatalog() {
    const result = await requestJson<{ offers: Offer[]; redemptions: Redemption[] }>(
      apiBase,
      "/economy/catalog",
    );
    if (result.data) {
      setOffers(result.data.offers);
      setRedemptions(result.data.redemptions);
    }
  }

  async function refreshAccount(activeToken = token) {
    if (!activeToken) {
      setSession(null);
      setEconomy(null);
      setPayments([]);
      return;
    }

    const [sessionResult, economyResult, paymentResult] = await Promise.all([
      requestJson<Session>(apiBase, "/auth/me", undefined, activeToken),
      requestJson<EconomyState>(apiBase, "/economy/state", undefined, activeToken),
      requestJson<PaymentEnvelope[]>(apiBase, "/payments/intents", undefined, activeToken),
    ]);

    if (sessionResult.data) setSession(sessionResult.data);
    if (economyResult.data) setEconomy(economyResult.data);
    if (paymentResult.data) setPayments(paymentResult.data);
  }

  useEffect(() => {
    void refreshCatalog();
    void refreshAccount(token);
  }, [apiBase, token]);

  async function handleAuth(mode: "register" | "login") {
    const path = mode === "register" ? "/auth/register" : "/auth/login";
    const body =
      mode === "register"
        ? { name: name || "Project R Player", email, password, role: "player" }
        : { email, password };
    const result = await requestJson<{ token: string; user: Session }>(apiBase, path, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!result.data) {
      setMessage(result.error ?? "Authentication failed.");
      return;
    }
    setToken(result.data.token);
    setSession(result.data.user);
    setMessage(mode === "register" ? "Account created and synced." : "Logged in.");
  }

  async function handleLogout() {
    if (token) {
      await requestJson(apiBase, "/auth/session", { method: "DELETE" }, token);
    }
    setToken(null);
    setSession(null);
    setEconomy(null);
    setPayments([]);
    setMessage("Logged out.");
  }

  async function handleBuy(offer: Offer) {
    if (!token) {
      setMessage("Log in first to settle mobile purchases.");
      return;
    }
    setPendingId(offer.id);
    const provider =
      Platform.OS === "android"
        ? "play-billing-sandbox"
        : Platform.OS === "ios"
          ? "app-store-sandbox"
          : "web-sandbox";
    const createIntent = await requestJson<PaymentEnvelope>(
      apiBase,
      "/payments/intents",
      {
        method: "POST",
        body: JSON.stringify({ offerId: offer.id, provider, platform: Platform.OS }),
      },
      token,
    );
    if (!createIntent.data) {
      setPendingId(null);
      setMessage(createIntent.error ?? "Failed to create payment intent.");
      return;
    }

    const receiptId = `${provider}-${offer.id}-${Date.now()}`;
    const confirmIntent = await requestJson<PaymentEnvelope>(
      apiBase,
      `/payments/intents/${encodeURIComponent(createIntent.data.intent.id)}/confirm`,
      {
        method: "POST",
        body: JSON.stringify({
          receiptToken: `${receiptId}-receipt`,
          providerReference: receiptId,
          verificationPayload: { channel: "mobile", mode: "sandbox-auto-approve" },
        }),
      },
      token,
    );
    setPendingId(null);
    if (!confirmIntent.data) {
      setMessage(confirmIntent.error ?? "Failed to confirm payment intent.");
      return;
    }

    setMessage(`${offer.name} ${confirmIntent.data.intent.status}.`);
    await refreshAccount(token);
  }

  async function handleRedeem(redemption: Redemption) {
    if (!token) {
      setMessage("Log in first to redeem sparks.");
      return;
    }
    setPendingId(redemption.id);
    const result = await requestJson<{ walletBalance: number }>(
      apiBase,
      `/economy/redemptions/${encodeURIComponent(redemption.id)}/redeem`,
      { method: "POST" },
      token,
    );
    setPendingId(null);
    if (!result.data) {
      setMessage(result.error ?? "Redemption failed.");
      return;
    }
    setMessage(`${redemption.title} redeemed.`);
    await refreshAccount(token);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>PROJECT R MOBILE</Text>
        <Text style={styles.title}>Live store, wallet, and settlement lanes</Text>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>API Base</Text>
          <TextInput value={apiBase} onChangeText={setApiBase} style={styles.input} autoCapitalize="none" />
          <View style={styles.metrics}>
            <View style={styles.metricCard}><Text style={styles.metricLabel}>Wallet</Text><Text style={styles.metricValue}>{economy ? economy.walletBalance : "Guest"}</Text></View>
            <View style={styles.metricCard}><Text style={styles.metricLabel}>Premium</Text><Text style={styles.metricValue}>{premiumUnits}</Text></View>
            <View style={styles.metricCard}><Text style={styles.metricLabel}>Intents</Text><Text style={styles.metricValue}>{payments.length}</Text></View>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{session ? `${session.name} · ${session.membership}` : "Account lane"}</Text>
          {!session ? (
            <>
              <TextInput value={name} onChangeText={setName} placeholder="Display name" placeholderTextColor="#7b8495" style={styles.input} />
              <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#7b8495" style={styles.input} autoCapitalize="none" />
              <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#7b8495" style={styles.input} secureTextEntry />
              <View style={styles.row}>
                <Pressable style={styles.primaryButton} onPress={() => void handleAuth("register")}><Text style={styles.primaryButtonText}>Register</Text></Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => void handleAuth("login")}><Text style={styles.secondaryButtonText}>Login</Text></Pressable>
              </View>
            </>
          ) : (
            <View style={styles.row}>
              <Pressable style={styles.primaryButton} onPress={() => void refreshAccount(token)}><Text style={styles.primaryButtonText}>Refresh Sync</Text></Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => void handleLogout()}><Text style={styles.secondaryButtonText}>Logout</Text></Pressable>
            </View>
          )}
        </View>

        <View style={styles.tabRow}>
          {(["offers", "vault", "payments"] as Lane[]).map((entry) => (
            <Pressable key={entry} onPress={() => setLane(entry)} style={[styles.tab, lane === entry && styles.tabActive]}>
              <Text style={[styles.tabText, lane === entry && styles.tabTextActive]}>{entry.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        {lane === "offers" ? (
          <>
            {offers.map((offer) => (
              <View key={offer.id} style={styles.card}>
                <Text style={styles.cardEyebrow}>{offer.badge}</Text>
                <Text style={styles.cardTitle}>{offer.name}</Text>
                <Text style={styles.cardBody}>{offer.summary}</Text>
                <Text style={styles.cardMeta}>{offer.grantSparks} sparks · KRW {offer.price}</Text>
                <Pressable style={styles.primaryButton} onPress={() => void handleBuy(offer)} disabled={pendingId === offer.id}>
                  <Text style={styles.primaryButtonText}>{pendingId === offer.id ? "Processing..." : "Create intent and settle"}</Text>
                </Pressable>
              </View>
            ))}
            {redemptions.map((redemption) => (
              <View key={redemption.id} style={styles.card}>
                <Text style={styles.cardEyebrow}>{redemption.badge}</Text>
                <Text style={styles.cardTitle}>{redemption.title}</Text>
                <Text style={styles.cardBody}>{redemption.summary}</Text>
                <Text style={styles.cardMeta}>{redemption.sparksCost} sparks</Text>
                <Pressable style={styles.secondaryButton} onPress={() => void handleRedeem(redemption)} disabled={pendingId === redemption.id}>
                  <Text style={styles.secondaryButtonText}>{pendingId === redemption.id ? "Processing..." : "Redeem"}</Text>
                </Pressable>
              </View>
            ))}
          </>
        ) : null}

        {lane === "vault" ? (
          <>
            {(economy?.inventory ?? []).map((item) => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardBody}>{item.summary}</Text>
                <Text style={styles.cardMeta}>{item.category} · x{item.quantity}</Text>
              </View>
            ))}
            {(economy?.ledger ?? []).slice(0, 8).map((entry) => (
              <View key={entry.id} style={styles.card}>
                <Text style={styles.cardTitle}>{entry.title}</Text>
                <Text style={styles.cardBody}>{entry.summary}</Text>
                <Text style={styles.cardMeta}>{entry.amountDelta > 0 ? "+" : ""}{entry.amountDelta} sparks · balance {entry.balanceAfter}</Text>
              </View>
            ))}
          </>
        ) : null}

        {lane === "payments" ? (
          payments.map((payment) => (
            <View key={payment.intent.id} style={styles.card}>
              <Text style={styles.cardTitle}>{payment.offer.name}</Text>
              <Text style={styles.cardBody}>{payment.intent.provider} · {payment.intent.platform}</Text>
              <Text style={styles.cardMeta}>{payment.intent.status} · KRW {payment.intent.amount}</Text>
              <Text style={styles.cardBody}>{payment.events.map((event) => event.eventType).join(" -> ")}</Text>
            </View>
          ))
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#07111d" },
  content: { padding: 20, gap: 14, backgroundColor: "#07111d" },
  eyebrow: { color: "#f6b271", fontSize: 12, letterSpacing: 2.4 },
  title: { color: "#f8fafc", fontSize: 28, fontWeight: "700", marginBottom: 8 },
  panel: { backgroundColor: "#0d1726", borderRadius: 24, padding: 16, gap: 12 },
  panelTitle: { color: "#f8fafc", fontSize: 18, fontWeight: "700" },
  input: { backgroundColor: "#132031", borderRadius: 14, color: "#f8fafc", paddingHorizontal: 14, paddingVertical: 12 },
  metrics: { flexDirection: "row", gap: 10 },
  metricCard: { flex: 1, backgroundColor: "#122338", borderRadius: 18, padding: 12, gap: 6 },
  metricLabel: { color: "#8da2bb", fontSize: 11, letterSpacing: 1.1 },
  metricValue: { color: "#f8fafc", fontSize: 20, fontWeight: "700" },
  row: { flexDirection: "row", gap: 10 },
  tabRow: { flexDirection: "row", gap: 10 },
  tab: { flex: 1, borderRadius: 999, borderWidth: 1, borderColor: "#223349", paddingVertical: 12, alignItems: "center" },
  tabActive: { backgroundColor: "#f4efe4", borderColor: "#f4efe4" },
  tabText: { color: "#8da2bb", fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: "#09111b" },
  message: { color: "#8cf0da", fontSize: 13, lineHeight: 20 },
  card: { backgroundColor: "#0d1726", borderRadius: 24, padding: 16, gap: 8 },
  cardEyebrow: { color: "#8cf0da", fontSize: 11, letterSpacing: 1.1 },
  cardTitle: { color: "#f8fafc", fontSize: 18, fontWeight: "700" },
  cardBody: { color: "#b8c5d6", fontSize: 14, lineHeight: 21 },
  cardMeta: { color: "#f6b271", fontSize: 13 },
  primaryButton: { backgroundColor: "#f4efe4", borderRadius: 999, paddingVertical: 12, paddingHorizontal: 14, alignItems: "center" },
  primaryButtonText: { color: "#101923", fontSize: 13, fontWeight: "700" },
  secondaryButton: { backgroundColor: "#143328", borderRadius: 999, paddingVertical: 12, paddingHorizontal: 14, alignItems: "center" },
  secondaryButtonText: { color: "#8cf0da", fontSize: 13, fontWeight: "700" },
});
