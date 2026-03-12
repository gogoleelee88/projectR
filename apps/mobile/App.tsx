import { StatusBar } from "expo-status-bar";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const modules = [
  {
    title: "Story",
    subtitle: "거대한 세계관 속에서 유저가 주인공이 되는 메인 축",
  },
  {
    title: "Character",
    subtitle: "짧고 빠른 대화에 집중한 감정형 반복 세션",
  },
  {
    title: "Party Chat",
    subtitle: "2~5인이 같은 턴을 입력하고 AI가 다음 장면을 생성",
  },
  {
    title: "Image Studio",
    subtitle: "상황 이미지와 독립 생성 기능을 함께 담당하는 비주얼 엔진",
  },
];

const releaseTracks = [
  {
    title: "Web HQ",
    summary: "탐색, 창작, 운영, 결제를 묶는 브라우저 허브",
  },
  {
    title: "Android",
    summary: "고빈도 재방문과 공유 확산에 강한 주력 앱",
  },
  {
    title: "iOS",
    summary: "프리미엄 큐레이션과 팬덤 상품에 집중한 앱",
  },
];

const showcase = [
  "사건번호 2024가단X",
  "밀레니엄",
  "스페이스 오디세이",
  "마교 말단에서 교주까지",
];

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>PROJECT R</Text>
          <Text style={styles.title}>Android와 iOS를 위한 Crack 차세대 앱 셸</Text>
          <Text style={styles.description}>
            캐릭터, 스토리, 파티챗, 이미지, 창작자 운영 흐름을 하나의 모바일
            제품군으로 재구성하는 초기 빌드입니다.
          </Text>
          <View style={styles.metricRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>6</Text>
              <Text style={styles.metricLabel}>core modules</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>3</Text>
              <Text style={styles.metricLabel}>surfaces</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>24/7</Text>
              <Text style={styles.metricLabel}>ops posture</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Core Modules</Text>
          <Text style={styles.sectionTitle}>모바일에서 반복 사용을 만드는 중심 축</Text>
          {modules.map((module) => (
            <View key={module.title} style={styles.moduleCard}>
              <Text style={styles.moduleTitle}>{module.title}</Text>
              <Text style={styles.moduleSubtitle}>{module.subtitle}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Flagship Formats</Text>
          <Text style={styles.sectionTitle}>이미 검증된 강한 포맷을 제품 기준점으로 사용</Text>
          <View style={styles.chipWrap}>
            {showcase.map((title) => (
              <View key={title} style={styles.chip}>
                <Text style={styles.chipText}>{title}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Release Tracks</Text>
          <Text style={styles.sectionTitle}>웹과 앱은 동일 브랜드 아래 다른 임무를 맡음</Text>
          {releaseTracks.map((track) => (
            <View key={track.title} style={styles.trackCard}>
              <Text style={styles.trackTitle}>{track.title}</Text>
              <Text style={styles.trackSummary}>{track.summary}</Text>
            </View>
          ))}
        </View>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 18,
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
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "800",
  },
  description: {
    marginTop: 14,
    color: "rgba(255,255,255,0.72)",
    fontSize: 15,
    lineHeight: 24,
  },
  metricRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  metricCard: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: "#0d1420",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  metricValue: {
    color: "#78f0d5",
    fontSize: 26,
    fontWeight: "800",
  },
  metricLabel: {
    marginTop: 4,
    color: "rgba(255,255,255,0.62)",
    fontSize: 12,
    textTransform: "uppercase",
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
  moduleCard: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: "#0c131d",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  moduleTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  moduleSubtitle: {
    marginTop: 6,
    color: "rgba(255,255,255,0.68)",
    fontSize: 14,
    lineHeight: 22,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#1a2433",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  chipText: {
    color: "#fff7ed",
    fontSize: 13,
    fontWeight: "600",
  },
  trackCard: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: "#0c131d",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  trackTitle: {
    color: "#78f0d5",
    fontSize: 17,
    fontWeight: "800",
  },
  trackSummary: {
    marginTop: 6,
    color: "rgba(255,255,255,0.68)",
    fontSize: 14,
    lineHeight: 22,
  },
});
