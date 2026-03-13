import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type TabKey = "story" | "character" | "works" | "image";

type Card = {
  id: string;
  title: string;
  eyebrow: string;
  summary: string;
  meta: string;
  chips: string[];
  color: string;
};

const tabs: Array<{ key: TabKey; label: string; summary: string }> = [
  { key: "story", label: "스토리", summary: "대형 세계관과 시즌형 플레이" },
  { key: "character", label: "캐릭터", summary: "짧고 빠른 감정형 대화" },
  { key: "works", label: "내 작품", summary: "연재와 스토어 운영" },
  { key: "image", label: "이미지", summary: "장면 생성과 스타일 팩" },
];

const filters = ["공식 추천", "파티챗", "지금 인기", "신작", "완결", "스토어"];

const sections: Record<
  TabKey,
  {
    heading: string;
    description: string;
    cards: Card[];
  }
> = {
  story: {
    heading: "지금 가장 먼저 열어볼 스토리",
    description: "스토리 중심 홈 피드 구조를 모바일에도 먼저 맞춥니다.",
    cards: [
      {
        id: "millennium",
        title: "밀레니엄",
        eyebrow: "스토리 오리지널",
        summary: "문명 전체의 규칙을 결정하는 초대형 인터랙티브 스토리.",
        meta: "연속 플레이 상위",
        chips: ["세계관", "선택 누적", "장기기억"],
        color: "#25326f",
      },
      {
        id: "courtroom",
        title: "사건번호 2024가단X",
        eyebrow: "공식 추천",
        summary: "긴장감 높은 판결형 서사를 카드 피드 상단에 노출하는 공식 큐레이션.",
        meta: "주간 인기",
        chips: ["법정", "공식", "파티 연계"],
        color: "#6b2d3d",
      },
      {
        id: "shogun",
        title: "마교 말단에서 교주까지",
        eyebrow: "무협 성장기",
        summary: "이미지 다량 탑재형 장문 스토리 포맷.",
        meta: "이미지 310장",
        chips: ["무협", "성장", "고화질"],
        color: "#285445",
      },
    ],
  },
  character: {
    heading: "짧고 강하게 붙는 캐릭터",
    description: "캐릭터 탭은 감정형 훅과 재방문 템포를 우선 보여 줍니다.",
    cards: [
      {
        id: "astra",
        title: "Astra: Orbit Confession",
        eyebrow: "캐릭터 프리미엄",
        summary: "친밀도와 기억이 누적되는 우주 항해사 캐릭터 루프.",
        meta: "구독 전환 강세",
        chips: ["친밀도", "기억", "프리미엄"],
        color: "#1d4063",
      },
      {
        id: "noir",
        title: "누아르 브로커 룸",
        eyebrow: "감정형 채팅",
        summary: "짧은 문장과 위험한 분위기로 밀어붙이는 도시형 캐릭터.",
        meta: "재방문 7분+",
        chips: ["도시", "티키타카", "재방문"],
        color: "#404867",
      },
      {
        id: "sol",
        title: "솔라 기록 담당관",
        eyebrow: "공식 신작",
        summary: "최근 대화를 기억해 다음 감정선을 바로 이어 붙이는 캐릭터.",
        meta: "신작 급상승",
        chips: ["공식", "신작", "회상"],
        color: "#834260",
      },
    ],
  },
  works: {
    heading: "내 작품과 운영 도구",
    description: "내 작품 탭은 연재와 상품 운영이 한 피드에 보이는 구조를 따릅니다.",
    cards: [
      {
        id: "season",
        title: "장기 스토리 시즌 운영",
        eyebrow: "내 작품",
        summary: "회차 공개와 가격 설정을 한 페이지에서 관리하는 작품 콘솔.",
        meta: "심사 대기 2건",
        chips: ["연재", "공개", "판매"],
        color: "#1e5362",
      },
      {
        id: "fanclub",
        title: "캐릭터 팬클럽 팩",
        eyebrow: "스토어 상품",
        summary: "전용 대화 모드와 이미지 보너스를 묶어 판매하는 팬 상품.",
        meta: "스토어 전환 8.9%",
        chips: ["스토어", "팬클럽", "한정"],
        color: "#825b30",
      },
      {
        id: "events",
        title: "공지와 보상 이벤트",
        eyebrow: "운영 보드",
        summary: "신예 노출과 보너스 캐시 이벤트를 작품 단위로 연결합니다.",
        meta: "이벤트 3개 진행",
        chips: ["공지", "보상", "운영"],
        color: "#345194",
      },
    ],
  },
  image: {
    heading: "이미지 생성과 스타일 탐색",
    description: "이미지 탭은 스타일 팩과 생성 진입 버튼을 동시에 전면 배치합니다.",
    cards: [
      {
        id: "obsidian",
        title: "Obsidian Neon",
        eyebrow: "이미지 스타일",
        summary: "도시 야경과 SF 장면에 강한 고대비 시네마틱 팩.",
        meta: "공유 저장 18.2K",
        chips: ["시안", "오렌지", "SF"],
        color: "#123352",
      },
      {
        id: "porcelain",
        title: "Porcelain Bloom",
        eyebrow: "인물 집중",
        summary: "감정 컷과 로맨스형 썸네일에 강한 부드러운 톤.",
        meta: "캐릭터 공유 상위",
        chips: ["로즈", "감정 컷", "썸네일"],
        color: "#895f68",
      },
      {
        id: "verdant",
        title: "Verdant Myth",
        eyebrow: "동양 판타지",
        summary: "무협과 제국형 작품의 장면 생성에 맞는 스타일.",
        meta: "스토리 연동 추천",
        chips: ["녹옥", "금색", "무협"],
        color: "#3c6644",
      },
    ],
  },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("story");
  const [activeFilter, setActiveFilter] = useState("공식 추천");
  const [search, setSearch] = useState("");

  const section = sections[activeTab];
  const cards = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return section.cards;
    }

    return section.cards.filter((card) =>
      [card.title, card.eyebrow, card.summary, card.meta, card.chips.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [search, section.cards]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>PROJECT R</Text>
            <Text style={styles.headerTitle}>Crack Clone Mobile</Text>
          </View>
          <Pressable style={styles.loginButton}>
            <Text style={styles.loginButtonText}>로그인</Text>
          </Pressable>
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="스토리, 캐릭터, 태그 검색"
          placeholderTextColor="rgba(255,255,255,0.34)"
          style={styles.searchInput}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tabChip, activeTab === tab.key && styles.tabChipActive]}
            >
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {filters.map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
            >
              <Text style={styles.filterLabel}>{filter}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.heroStack}>
          <View style={styles.loginCard}>
            <Text style={styles.cardEyebrow}>계정</Text>
            <Text style={styles.cardTitle}>로그인하고 이어보기</Text>
            <Text style={styles.cardBody}>
              최근 읽던 스토리와 찜한 캐릭터, 보관한 이미지 세트를 바로 이어 봅니다.
            </Text>
            <Pressable style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>계정 연결</Text>
            </Pressable>
          </View>

          <View style={styles.partyCard}>
            <Text style={styles.cardEyebrow}>파티챗</Text>
            <Text style={styles.partyTitle}>여럿이 함께 만드는 공식 멀티 스토리</Text>
            <Text style={styles.cardBody}>
              초대 코드, 턴별 액션 제출, AI 결과 요약이 홈 상단 핵심 배너로 들어오는 구조를 복제합니다.
            </Text>
            <View style={styles.partyMetrics}>
              {[
                ["라이브 룸", "1,280"],
                ["초대 코드", "즉시"],
                ["공식 시즌", "4개"],
              ].map(([label, value]) => (
                <View key={label} style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{label}</Text>
                  <Text style={styles.metricValue}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>{tabs.find((tab) => tab.key === activeTab)?.label}</Text>
          <Text style={styles.sectionTitle}>{section.heading}</Text>
          <Text style={styles.sectionBody}>{section.description}</Text>

          {cards.map((card) => (
            <View key={card.id} style={styles.feedCard}>
              <View style={[styles.poster, { backgroundColor: card.color }]}>
                <Text style={styles.posterEyebrow}>{card.eyebrow}</Text>
                <Text style={styles.posterTitle}>{card.title}</Text>
              </View>
              <Text style={styles.feedMeta}>{card.meta}</Text>
              <Text style={styles.cardBody}>{card.summary}</Text>
              <View style={styles.chipRow}>
                {card.chips.map((chip) => (
                  <View key={chip} style={styles.metaChip}>
                    <Text style={styles.metaChipText}>{chip}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footerNotice}>
          <Text style={styles.footerTitle}>다음 단계</Text>
          <Text style={styles.footerBody}>
            카드 상세, 작품 상세, 실제 로그인 플로우, 서버 연동을 이 구조 위에 맞춰 이어 붙입니다.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#080b12",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 36,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  eyebrow: {
    color: "#ffb978",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2.2,
  },
  headerTitle: {
    marginTop: 6,
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "800",
  },
  loginButton: {
    borderRadius: 999,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  loginButtonText: {
    color: "#101521",
    fontSize: 13,
    fontWeight: "800",
  },
  searchInput: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#101621",
    paddingHorizontal: 18,
    paddingVertical: 14,
    color: "#ffffff",
    fontSize: 14,
  },
  tabRow: {
    gap: 8,
    paddingRight: 8,
  },
  tabChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#111722",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tabChipActive: {
    backgroundColor: "#ffffff",
  },
  tabLabel: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  tabLabelActive: {
    color: "#101521",
  },
  filterRow: {
    gap: 8,
    paddingRight: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  filterChipActive: {
    backgroundColor: "rgba(247,107,28,0.16)",
    borderColor: "#f76b1c",
  },
  filterLabel: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 12,
    fontWeight: "600",
  },
  heroStack: {
    gap: 12,
  },
  loginCard: {
    borderRadius: 28,
    backgroundColor: "#141b28",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 22,
  },
  partyCard: {
    borderRadius: 28,
    backgroundColor: "#17263b",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 22,
  },
  cardEyebrow: {
    color: "#ffb978",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.8,
  },
  cardTitle: {
    marginTop: 8,
    color: "#fff7ed",
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "800",
  },
  partyTitle: {
    marginTop: 8,
    color: "#fff7ed",
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "800",
  },
  cardBody: {
    marginTop: 10,
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    lineHeight: 22,
  },
  primaryButton: {
    marginTop: 16,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: "#101521",
    fontSize: 13,
    fontWeight: "800",
  },
  partyMetrics: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    minWidth: 90,
    borderRadius: 18,
    backgroundColor: "rgba(7,10,17,0.28)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metricLabel: {
    color: "rgba(255,255,255,0.48)",
    fontSize: 11,
    fontWeight: "700",
  },
  metricValue: {
    marginTop: 6,
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
  },
  section: {
    borderRadius: 28,
    backgroundColor: "#101621",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 22,
    gap: 12,
  },
  sectionEyebrow: {
    color: "#ffb978",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
  },
  sectionBody: {
    color: "rgba(255,255,255,0.66)",
    fontSize: 14,
    lineHeight: 22,
  },
  feedCard: {
    marginTop: 4,
    borderRadius: 24,
    backgroundColor: "#0b1019",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 16,
  },
  poster: {
    borderRadius: 22,
    padding: 18,
  },
  posterEyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
  },
  posterTitle: {
    marginTop: 8,
    color: "#fff7ed",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
  },
  feedMeta: {
    marginTop: 14,
    color: "#79f0d6",
    fontSize: 13,
    fontWeight: "700",
  },
  chipRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metaChipText: {
    color: "rgba(255,255,255,0.74)",
    fontSize: 11,
    fontWeight: "600",
  },
  footerNotice: {
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 20,
  },
  footerTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
  footerBody: {
    marginTop: 8,
    color: "rgba(255,255,255,0.66)",
    fontSize: 14,
    lineHeight: 22,
  },
});
