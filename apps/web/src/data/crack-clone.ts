export type CrackTabId = "story" | "character" | "works" | "image";

export type CrackCard = {
  id: string;
  title: string;
  eyebrow: string;
  summary: string;
  meta: string;
  chips: string[];
  accent: string;
};

export type CrackRail = {
  title: string;
  description: string;
  items: CrackCard[];
};

export const crackTabs: Array<{
  id: CrackTabId;
  label: string;
  summary: string;
}> = [
  { id: "story", label: "스토리", summary: "대형 세계관과 시즌형 플레이" },
  { id: "character", label: "캐릭터", summary: "짧고 빠른 감정형 대화" },
  { id: "works", label: "내 작품", summary: "연재, 스토어, 보상 관리" },
  { id: "image", label: "이미지", summary: "장면 생성과 미디어 팩" },
];

export const crackQuickFilters = [
  "공식 추천",
  "파티챗",
  "지금 인기",
  "신작",
  "완결",
  "스토어",
  "이벤트",
];

export const crackHeroCards = [
  {
    title: "로그인하고 이어보기",
    summary:
      "최근 읽던 스토리, 찜한 캐릭터, 보관한 이미지 세트를 한 번에 이어서 볼 수 있습니다.",
    cta: "로그인",
  },
  {
    title: "파티챗 시즌 배틀",
    summary:
      "친구와 함께 턴을 제출하고 AI가 다음 장면을 만들어 주는 공식 파티챗 포맷을 전면 배치합니다.",
    cta: "지금 참여",
  },
];

const storyItems: CrackCard[] = [
  {
    id: "millennium",
    title: "밀레니엄",
    eyebrow: "스토리 오리지널",
    summary:
      "기원전 4000년의 회의장에서 문명 전체의 규칙을 직접 결정하는 초대형 인터랙티브 스토리.",
    meta: "연속 플레이 44% 유지",
    chips: ["장기기억", "세계관", "선택 누적"],
    accent: "from-[#201b3f] via-[#16243b] to-[#8d5efc]",
  },
  {
    id: "shogun",
    title: "마교 말단에서 교주까지",
    eyebrow: "무협 성장기",
    summary:
      "다량의 이미지와 장문 분기를 함께 소비하는 고밀도 성장형 스토리 포맷.",
    meta: "이미지 310장 탑재",
    chips: ["무협", "성장", "고화질 이미지"],
    accent: "from-[#1b2517] via-[#1e4f3f] to-[#c7a356]",
  },
  {
    id: "courtroom",
    title: "사건번호 2024가단X",
    eyebrow: "공식 추천",
    summary:
      "실시간 공방과 감정선을 섞어 한 턴씩 판결을 밀어붙이는 고압 서사형 스토리.",
    meta: "주간 재방문 상위",
    chips: ["법정", "긴장감", "공식 큐레이션"],
    accent: "from-[#180f14] via-[#4a1e28] to-[#ef815c]",
  },
];

const characterItems: CrackCard[] = [
  {
    id: "astra",
    title: "Astra: Orbit Confession",
    eyebrow: "캐릭터 프리미엄",
    summary:
      "친밀도에 따라 말투와 기억이 달라지는 우주 항해사 캐릭터와의 프리미엄 대화.",
    meta: "구독 전환 23.4%",
    chips: ["친밀도", "회상", "프리미엄"],
    accent: "from-[#0d2034] via-[#17395a] to-[#7fd7ff]",
  },
  {
    id: "noir",
    title: "누아르 브로커 룸",
    eyebrow: "감정형 채팅",
    summary:
      "위험하고 짧은 문장 위주로 몰아치는 텐션형 캐릭터 루프. 모바일 재방문용에 최적화.",
    meta: "세션 길이 7분+",
    chips: ["티키타카", "도시", "재방문"],
    accent: "from-[#17181f] via-[#2c3044] to-[#8f95b2]",
  },
  {
    id: "sol",
    title: "솔라 기록 담당관",
    eyebrow: "공식 신작",
    summary:
      "사용자의 최근 선택을 기억하고 다음 감정선을 이어 붙이는 장기 대화형 캐릭터.",
    meta: "신작 탭 급상승",
    chips: ["기억", "공식", "신작"],
    accent: "from-[#2a1521] via-[#5f294d] to-[#f0a6bf]",
  },
];

const worksItems: CrackCard[] = [
  {
    id: "creator-season",
    title: "장기 스토리 시즌 운영",
    eyebrow: "내 작품",
    summary:
      "시즌 아크, 공지, 가격 설정, 회차 공개 시점을 한 페이지에서 통합 관리하는 제작 콘솔.",
    meta: "심사 대기 2건",
    chips: ["연재", "스케줄", "판매"],
    accent: "from-[#151c20] via-[#234453] to-[#68d5df]",
  },
  {
    id: "fan-club",
    title: "캐릭터 팬클럽 팩",
    eyebrow: "스토어 상품",
    summary:
      "특정 캐릭터에 대한 전용 대화 모드와 보너스 이미지를 묶어 판매하는 패키지.",
    meta: "전환율 8.9%",
    chips: ["스토어", "팬클럽", "한정 팩"],
    accent: "from-[#1f1412] via-[#68402a] to-[#ebb277]",
  },
  {
    id: "ops-note",
    title: "공지와 보상 이벤트",
    eyebrow: "운영 보드",
    summary:
      "신예 노출 배너, 보너스 캐시 이벤트, 공지 집행을 작품별로 연결하는 라이브 운영 레이어.",
    meta: "이벤트 3개 진행",
    chips: ["공지", "보상", "노출"],
    accent: "from-[#121722] via-[#29334f] to-[#7aa2ff]",
  },
];

const imageItems: CrackCard[] = [
  {
    id: "obsidian-pack",
    title: "Obsidian Neon",
    eyebrow: "이미지 스타일",
    summary:
      "도시 야경, 추적, SF 대치 장면에 최적화된 고대비 시네마틱 스타일 팩.",
    meta: "공유 저장 18.2K",
    chips: ["시안", "오렌지", "SF"],
    accent: "from-[#07111d] via-[#0c2f4b] to-[#f76b1c]",
  },
  {
    id: "porcelain-pack",
    title: "Porcelain Bloom",
    eyebrow: "인물 집중",
    summary:
      "캐릭터 감정 컷, 관계 진전 카드, 로맨스형 썸네일에 강한 부드러운 톤.",
    meta: "캐릭터 공유 상위",
    chips: ["로즈", "감정 컷", "썸네일"],
    accent: "from-[#29171b] via-[#845563] to-[#f1c6c7]",
  },
  {
    id: "verdant-pack",
    title: "Verdant Myth",
    eyebrow: "동양 판타지",
    summary:
      "무협, 제국, 신화 계열 작품의 장면 생성과 이벤트 배너에 맞는 스타일.",
    meta: "스토리 연동 추천",
    chips: ["녹옥", "금색", "무협"],
    accent: "from-[#0a1814] via-[#245346] to-[#d8b86e]",
  },
];

export const crackSections: Record<
  CrackTabId,
  {
    heading: string;
    description: string;
    featured: CrackCard[];
    rails: CrackRail[];
  }
> = {
  story: {
    heading: "지금 가장 먼저 열어볼 스토리",
    description:
      "공식 스토리와 장기 성장형 세계관을 카드 피드 중심으로 노출하는 구조를 먼저 맞춥니다.",
    featured: storyItems,
    rails: [
      {
        title: "지금 인기",
        description: "지금 많이 열리는 스토리 포맷",
        items: storyItems,
      },
      {
        title: "공식 큐레이션",
        description: "공식 구좌와 시즌형 추천",
        items: [storyItems[2], storyItems[0], storyItems[1]],
      },
    ],
  },
  character: {
    heading: "짧고 강하게 붙는 캐릭터",
    description:
      "캐릭터는 빠른 대화 진입과 감정형 훅이 핵심이라, 상단부터 감정 태그와 전환 지표를 노출합니다.",
    featured: characterItems,
    rails: [
      {
        title: "오늘의 캐릭터",
        description: "빠른 재방문에 강한 캐릭터 루프",
        items: characterItems,
      },
      {
        title: "프리미엄 추천",
        description: "구독형 업셀에 가까운 캐릭터",
        items: [characterItems[0], characterItems[2]],
      },
    ],
  },
  works: {
    heading: "내 작품과 운영 도구",
    description:
      "연재, 공지, 판매, 심사를 같은 피드 안에 놓아 창작자 허브 느낌을 먼저 맞춥니다.",
    featured: worksItems,
    rails: [
      {
        title: "발행 준비",
        description: "검수와 공개 직전 흐름",
        items: worksItems,
      },
      {
        title: "수익화 루프",
        description: "스토어, 팬클럽, 이벤트 운영",
        items: [worksItems[1], worksItems[0]],
      },
    ],
  },
  image: {
    heading: "이미지 생성과 스타일 탐색",
    description:
      "이미지는 독립 생성과 작품 연동 둘 다 중요해서 스타일 카드와 생성 CTA를 한 화면에 배치합니다.",
    featured: imageItems,
    rails: [
      {
        title: "스타일 라이브러리",
        description: "장면 공유에 강한 스타일",
        items: imageItems,
      },
      {
        title: "스토리 연동 추천",
        description: "세계관별 추천 스타일",
        items: [imageItems[2], imageItems[0]],
      },
    ],
  },
};

export const crackPartyHighlight = {
  badge: "파티챗",
  title: "여럿이 함께 만드는 공식 멀티 스토리",
  summary:
    "참가자 행동을 한 턴씩 모아서 다음 장면을 만드는 파티챗을 홈 상단 핵심 배너로 배치합니다.",
  details: ["초대 코드 입장", "턴별 액션 제출", "AI 결과 요약", "시즌 이벤트"],
};
