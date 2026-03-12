import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type TabKey = "discover" | "story" | "chat" | "studio" | "creator";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "discover", label: "Discover" },
  { key: "story", label: "Story" },
  { key: "chat", label: "Chat" },
  { key: "studio", label: "Studio" },
  { key: "creator", label: "Creator" },
];

const sessionModes = [
  { id: "player", label: "Player", focus: "반복 플레이와 프리미엄 소비" },
  { id: "creator", label: "Creator", focus: "작품 발행과 수익화" },
  { id: "operator", label: "Operator", focus: "운영과 세이프티 관제" },
] as const;

const works = [
  {
    id: "court",
    title: "사건번호 2024가단X",
    label: "공식 파티챗",
    summary: "4인이 동시에 행동을 제출하면 AI가 법정 공방을 이어 붙입니다.",
    stats: "시즌 패스 전환 11.8%",
  },
  {
    id: "millennium",
    title: "밀레니엄",
    label: "시네마틱 스토리",
    summary: "선택과 장기 기억이 누적되는 문명 성장형 서사입니다.",
    stats: "D30 리텐션 44%",
  },
  {
    id: "astra",
    title: "Astra: Orbit Confession",
    label: "캐릭터 프리미엄",
    summary: "친밀도에 따라 말투와 기억이 바뀌는 감정형 채팅 패키지입니다.",
    stats: "구독 전환 23.4%",
  },
];

const storyScenes = [
  {
    title: "포털 진입",
    scene: "항구 도시의 하늘이 갈라지고 당신의 이름이 아직 비어 있는 왕좌 지도가 내려옵니다.",
    choices: ["길드와 협상한다", "검은 시장을 급습한다", "전 도시 방송으로 선언한다"],
  },
  {
    title: "세력 균열",
    scene: "동맹 제안과 암살 예고가 동시에 도착합니다. 누구를 먼저 상대할지 정해야 합니다.",
    choices: ["의회와 동맹한다", "암살 조직을 포섭한다", "도시 축제를 연다"],
  },
];

const characterProfiles = [
  {
    id: "astra",
    name: "아스트라",
    opener: "함교는 조용하지만 네가 오면 모든 수치가 조금 달라져.",
    replies: [
      "좋아. 이번에는 더 멀리 가 보자.",
      "그 선택은 의외로 좋았어. 다음 턴을 설계할 수 있겠네.",
      "그 말은 기억해 둘게. 다음 장면에서 반드시 써먹을 거야.",
    ],
  },
  {
    id: "noir",
    name: "누아르",
    opener: "정문으로 들어오는 사람은 재미없지. 넌 어느 문으로 들어왔어?",
    replies: [
      "냉정하네. 그런 태도면 오래 버틸 수 있어.",
      "좋아, 말은 짧게. 대신 대가는 확실하게 받아.",
      "위험한데 마음에 들어. 더 세게 밀어붙여 봐.",
    ],
  },
];

const imageStyles = [
  { id: "obsidian", name: "Obsidian Neon", color: "#102f44" },
  { id: "porcelain", name: "Porcelain Bloom", color: "#a96e67" },
  { id: "verdant", name: "Verdant Myth", color: "#2d6f5a" },
];

const creatorTemplates = [
  "장기 스토리 시즌",
  "캐릭터 팬클럽 팩",
  "파티챗 시즌 이벤트",
];

export default function App() {
  const [mode, setMode] = useState<typeof sessionModes[number]["id"]>("player");
  const [tab, setTab] = useState<TabKey>("discover");
  const [selectedWorkId, setSelectedWorkId] = useState(works[0].id);
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyLog, setStoryLog] = useState<string[]>([storyScenes[0].scene]);
  const [selectedCharacterId, setSelectedCharacterId] = useState(characterProfiles[0].id);
  const [chatDraft, setChatDraft] = useState("");
  const [chatMessages, setChatMessages] = useState<Record<string, string[]>>({
    astra: [characterProfiles[0].opener],
    noir: [characterProfiles[1].opener],
  });
  const [prompt, setPrompt] = useState("");
  const [selectedStyleId, setSelectedStyleId] = useState(imageStyles[0].id);
  const [shots, setShots] = useState<Array<{ id: string; title: string; prompt: string; styleId: string }>>([]);
  const [creatorTitle, setCreatorTitle] = useState("");
  const [creatorPitch, setCreatorPitch] = useState("");
  const [releases, setReleases] = useState<Array<{ id: string; title: string; pitch: string }>>([]);

  const selectedWork = works.find((work) => work.id === selectedWorkId) ?? works[0];
  const activeScene = storyScenes[Math.min(storyIndex, storyScenes.length - 1)];
  const activeCharacter =
    characterProfiles.find((character) => character.id === selectedCharacterId) ??
    characterProfiles[0];
  const activeMessages = chatMessages[selectedCharacterId] ?? [];

  const chooseStory = (choice: string) => {
    setStoryLog((current) => [...current, choice]);
    setStoryIndex((current) => Math.min(current + 1, storyScenes.length - 1));
  };

  const sendChat = () => {
    const message = chatDraft.trim();

    if (!message) {
      return;
    }

    const reply =
      activeCharacter.replies[activeMessages.length % activeCharacter.replies.length];

    setChatMessages((current) => ({
      ...current,
      [selectedCharacterId]: [...(current[selectedCharacterId] ?? []), `나: ${message}`, `${activeCharacter.name}: ${reply}`],
    }));
    setChatDraft("");
  };

  const generateShot = () => {
    const value = prompt.trim();

    if (!value) {
      return;
    }

    setShots((current) => [
      {
        id: `${Date.now()}`,
        title: `Scene ${current.length + 1}`,
        prompt: value,
        styleId: selectedStyleId,
      },
      ...current,
    ]);
    setPrompt("");
  };

  const publishRelease = () => {
    const title = creatorTitle.trim();
    const pitch = creatorPitch.trim();

    if (!title || !pitch) {
      return;
    }

    setReleases((current) => [
      {
        id: `${Date.now()}`,
        title,
        pitch,
      },
      ...current,
    ]);
    setCreatorTitle("");
    setCreatorPitch("");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>PROJECT R MOBILE</Text>
          <Text style={styles.title}>탐색, 플레이, 생성, 발행이 도는 앱 셸</Text>
          <Text style={styles.description}>
            세계관 스토리, 캐릭터 채팅, 이미지 장면 생성, 작품 발행 흐름을 모바일에서 직접 돌려볼 수 있습니다.
          </Text>
          <View style={styles.modeRow}>
            {sessionModes.map((sessionMode) => (
              <Pressable
                key={sessionMode.id}
                onPress={() => setMode(sessionMode.id)}
                style={[
                  styles.modeChip,
                  mode === sessionMode.id && styles.modeChipActive,
                ]}
              >
                <Text style={styles.modeLabel}>{sessionMode.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.focusText}>
            {sessionModes.find((entry) => entry.id === mode)?.focus}
          </Text>
        </View>

        <View style={styles.tabRow}>
          {tabs.map((entry) => (
            <Pressable
              key={entry.key}
              onPress={() => setTab(entry.key)}
              style={[styles.tabChip, tab === entry.key && styles.tabChipActive]}
            >
              <Text style={styles.tabLabel}>{entry.label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === "discover" && (
          <View style={styles.section}>
            <Text style={styles.sectionEyebrow}>Discover</Text>
            <Text style={styles.sectionTitle}>지금 바로 고를 수 있는 대표 포맷</Text>
            {works.map((work) => (
              <Pressable
                key={work.id}
                onPress={() => setSelectedWorkId(work.id)}
                style={[
                  styles.card,
                  selectedWorkId === work.id && styles.cardActive,
                ]}
              >
                <Text style={styles.cardLabel}>{work.label}</Text>
                <Text style={styles.cardTitle}>{work.title}</Text>
                <Text style={styles.cardBody}>{work.summary}</Text>
              </Pressable>
            ))}
            <View style={styles.highlightCard}>
              <Text style={styles.highlightTitle}>{selectedWork.title}</Text>
              <Text style={styles.cardBody}>{selectedWork.stats}</Text>
            </View>
          </View>
        )}

        {tab === "story" && (
          <View style={styles.section}>
            <Text style={styles.sectionEyebrow}>Story</Text>
            <Text style={styles.sectionTitle}>{activeScene.title}</Text>
            <Text style={styles.cardBody}>{activeScene.scene}</Text>
            {activeScene.choices.map((choice) => (
              <Pressable key={choice} onPress={() => chooseStory(choice)} style={styles.card}>
                <Text style={styles.cardTitle}>{choice}</Text>
              </Pressable>
            ))}
            <View style={styles.logCard}>
              {storyLog.map((entry, index) => (
                <Text key={`${entry}-${index}`} style={styles.logText}>
                  {index + 1}. {entry}
                </Text>
              ))}
            </View>
          </View>
        )}

        {tab === "chat" && (
          <View style={styles.section}>
            <Text style={styles.sectionEyebrow}>Chat</Text>
            <View style={styles.modeRow}>
              {characterProfiles.map((character) => (
                <Pressable
                  key={character.id}
                  onPress={() => setSelectedCharacterId(character.id)}
                  style={[
                    styles.modeChip,
                    selectedCharacterId === character.id && styles.modeChipActive,
                  ]}
                >
                  <Text style={styles.modeLabel}>{character.name}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.logCard}>
              {activeMessages.map((message, index) => (
                <Text key={`${message}-${index}`} style={styles.logText}>
                  {message}
                </Text>
              ))}
            </View>
            <TextInput
              value={chatDraft}
              onChangeText={setChatDraft}
              placeholder="대사를 입력하세요"
              placeholderTextColor="rgba(255,255,255,0.42)"
              style={styles.input}
            />
            <Pressable onPress={sendChat} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>메시지 전송</Text>
            </Pressable>
          </View>
        )}

        {tab === "studio" && (
          <View style={styles.section}>
            <Text style={styles.sectionEyebrow}>Studio</Text>
            <Text style={styles.sectionTitle}>장면 생성과 공유 카드</Text>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              placeholder="예: 네온 항구의 새벽 결전"
              placeholderTextColor="rgba(255,255,255,0.42)"
              style={styles.input}
            />
            <View style={styles.modeRow}>
              {imageStyles.map((style) => (
                <Pressable
                  key={style.id}
                  onPress={() => setSelectedStyleId(style.id)}
                  style={[
                    styles.modeChip,
                    selectedStyleId === style.id && styles.modeChipActive,
                  ]}
                >
                  <Text style={styles.modeLabel}>{style.name}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={generateShot} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>장면 생성</Text>
            </Pressable>
            {shots.map((shot) => {
              const style =
                imageStyles.find((entry) => entry.id === shot.styleId) ?? imageStyles[0];

              return (
                <View key={shot.id} style={[styles.shotCard, { backgroundColor: style.color }]}>
                  <Text style={styles.shotTitle}>{shot.title}</Text>
                  <Text style={styles.shotBody}>{shot.prompt}</Text>
                </View>
              );
            })}
          </View>
        )}

        {tab === "creator" && (
          <View style={styles.section}>
            <Text style={styles.sectionEyebrow}>Creator</Text>
            <Text style={styles.sectionTitle}>작품 발행 대기열</Text>
            <View style={styles.modeRow}>
              {creatorTemplates.map((template) => (
                <View key={template} style={styles.templateChip}>
                  <Text style={styles.templateText}>{template}</Text>
                </View>
              ))}
            </View>
            <TextInput
              value={creatorTitle}
              onChangeText={setCreatorTitle}
              placeholder="작품명"
              placeholderTextColor="rgba(255,255,255,0.42)"
              style={styles.input}
            />
            <TextInput
              value={creatorPitch}
              onChangeText={setCreatorPitch}
              placeholder="한 줄 설명"
              placeholderTextColor="rgba(255,255,255,0.42)"
              style={styles.input}
            />
            <Pressable onPress={publishRelease} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>발행 큐 추가</Text>
            </Pressable>
            {releases.map((release) => (
              <View key={release.id} style={styles.card}>
                <Text style={styles.cardTitle}>{release.title}</Text>
                <Text style={styles.cardBody}>{release.pitch}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0b0f16",
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 40,
    gap: 16,
  },
  hero: {
    borderRadius: 28,
    padding: 24,
    backgroundColor: "#141c29",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  eyebrow: {
    color: "#ffb55f",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
  },
  title: {
    marginTop: 12,
    color: "#fff7ed",
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
  },
  description: {
    marginTop: 12,
    color: "rgba(255,255,255,0.72)",
    fontSize: 15,
    lineHeight: 24,
  },
  focusText: {
    marginTop: 12,
    color: "#78f0d5",
    fontSize: 13,
    fontWeight: "600",
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  modeChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#1a2433",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modeChipActive: {
    backgroundColor: "rgba(247,107,28,0.16)",
    borderColor: "#f76b1c",
  },
  modeLabel: {
    color: "#fff7ed",
    fontSize: 12,
    fontWeight: "700",
  },
  tabChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#111722",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  tabChipActive: {
    borderColor: "#f76b1c",
    backgroundColor: "rgba(247,107,28,0.16)",
  },
  tabLabel: {
    color: "#fff7ed",
    fontSize: 12,
    fontWeight: "700",
  },
  section: {
    borderRadius: 26,
    padding: 22,
    backgroundColor: "#111722",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 12,
  },
  sectionEyebrow: {
    color: "#ffb55f",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
  },
  card: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: "#0c131d",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  cardActive: {
    borderColor: "#f76b1c",
  },
  cardLabel: {
    color: "#ffb55f",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  cardTitle: {
    marginTop: 6,
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  cardBody: {
    marginTop: 6,
    color: "rgba(255,255,255,0.68)",
    fontSize: 14,
    lineHeight: 22,
  },
  highlightCard: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: "#0d1420",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  highlightTitle: {
    color: "#78f0d5",
    fontSize: 18,
    fontWeight: "800",
  },
  logCard: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: "#0c131d",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    gap: 8,
  },
  logText: {
    color: "rgba(255,255,255,0.74)",
    fontSize: 14,
    lineHeight: 22,
  },
  input: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#0c131d",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    color: "#ffffff",
    fontSize: 14,
  },
  primaryButton: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#f76b1c",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#130e09",
    fontSize: 14,
    fontWeight: "800",
  },
  shotCard: {
    borderRadius: 22,
    padding: 18,
  },
  shotTitle: {
    color: "#fff7ed",
    fontSize: 18,
    fontWeight: "800",
  },
  shotBody: {
    marginTop: 8,
    color: "rgba(255,255,255,0.88)",
    fontSize: 14,
    lineHeight: 22,
  },
  templateChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#1a2433",
  },
  templateText: {
    color: "#fff7ed",
    fontSize: 12,
    fontWeight: "600",
  },
});
