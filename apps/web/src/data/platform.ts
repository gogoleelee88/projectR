export type ProductView =
  | "discover"
  | "story"
  | "character"
  | "party"
  | "studio"
  | "creator"
  | "ops";

export type UserPreset = {
  id: string;
  email?: string;
  name: string;
  role: "player" | "creator" | "operator";
  membership: string;
  sparks: number;
  focus: string;
};

export type FeaturedWork = {
  id: string;
  title: string;
  module: ProductView;
  label: string;
  genre: string;
  summary: string;
  tags: string[];
  metrics: {
    concurrent: string;
    conversion: string;
    retention: string;
  };
  hooks: string[];
};

export type StoryChoice = {
  id: string;
  label: string;
  result: string;
  trustDelta: number;
  hypeDelta: number;
};

export type StoryEpisode = {
  id: string;
  title: string;
  scene: string;
  stakes: string;
  choices: StoryChoice[];
};

export type CharacterProfile = {
  id: string;
  name: string;
  role: string;
  vibe: string;
  opener: string;
  responsePools: {
    calm: string[];
    intense: string[];
    intimate: string[];
  };
};

export type PartyScenario = {
  id: string;
  title: string;
  premise: string;
  playerRoles: string[];
  actions: string[];
  twists: string[];
};

export type ImageStylePreset = {
  id: string;
  name: string;
  palette: string;
  summary: string;
  gradient: string;
};

export type CreatorTemplate = {
  id: string;
  title: string;
  module: ProductView;
  audience: string;
  monetization: string;
  outline: string[];
};

export type OpsSignal = {
  label: string;
  value: string;
  tone: string;
};

export type BillingPlan = {
  id: string;
  name: string;
  price: number;
  billingInterval: string;
  perks: string[];
};

export type SubscriptionRecord = {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  price: number;
  status: string;
  renewalAt: string;
  createdAt: string;
};

export type ReleaseRecord = {
  id: string;
  title: string;
  module: string;
  pitch: string;
  price: number;
  projection: string;
  status: string;
  createdAt: string;
};

export type BootstrapPayload = {
  presets: UserPreset[];
  feed: FeaturedWork[];
  episodes: StoryEpisode[];
  characters: CharacterProfile[];
  partyScenarios: PartyScenario[];
  styles: ImageStylePreset[];
  creatorTemplates: CreatorTemplate[];
  opsSignals: OpsSignal[];
  plans: BillingPlan[];
  subscriptions: SubscriptionRecord[];
  releases: ReleaseRecord[];
};

export const productViews: Array<{
  id: ProductView;
  label: string;
  summary: string;
}> = [
  { id: "discover", label: "Discover", summary: "발견과 큐레이션" },
  { id: "story", label: "Story", summary: "인터랙티브 플레이" },
  { id: "character", label: "Character", summary: "감정형 채팅" },
  { id: "party", label: "Party Chat", summary: "멀티플레이 서사" },
  { id: "studio", label: "Image Studio", summary: "장면 생성" },
  { id: "creator", label: "Creator", summary: "작품 제작과 수익화" },
  { id: "ops", label: "Ops", summary: "운영과 세이프티" },
];

export const userPresets: UserPreset[] = [
  {
    id: "aria",
    email: "aria@projectr.local",
    name: "Aria",
    role: "player",
    membership: "Legend Pass",
    sparks: 12840,
    focus: "고빈도 플레이와 프리미엄 에피소드 소비",
  },
  {
    id: "jin",
    email: "jin@projectr.local",
    name: "Jin",
    role: "creator",
    membership: "Creator Pro",
    sparks: 8420,
    focus: "스토리 론칭, 이미지 세트, 유료 에피소드 판매",
  },
  {
    id: "mina",
    email: "mina@projectr.local",
    name: "Mina",
    role: "operator",
    membership: "Live Ops",
    sparks: 2200,
    focus: "세이프티, 랭킹, 이벤트 운영",
  },
];

export const featuredWorks: FeaturedWork[] = [
  {
    id: "courtroom",
    title: "사건번호 2024가단X",
    module: "party",
    label: "공식 파티챗",
    genre: "법정 코미디 드라마",
    summary:
      "민트초코의 존폐를 두고 4인이 실시간으로 입장을 정리하면 AI가 법정 공방과 판결문을 생성합니다.",
    tags: ["4인 파티", "실시간 판결", "클립 공유"],
    metrics: {
      concurrent: "218K 동시 플레이",
      conversion: "11.8% 시즌 패스 전환",
      retention: "D30 39%",
    },
    hooks: ["짧은 한 판", "결말 공유", "크루 초대"],
  },
  {
    id: "millennium",
    title: "밀레니엄",
    module: "story",
    label: "시네마틱 스토리",
    genre: "문명 시뮬레이션",
    summary:
      "기원전 4000년의 첫 도시를 설계하면서 선택이 누적되고, 기억 시스템이 세계관을 계속 재구성합니다.",
    tags: ["장기 기억", "문명 성장", "에피소드 패스"],
    metrics: {
      concurrent: "146K 세션",
      conversion: "17.2% 에피소드 구매",
      retention: "D30 44%",
    },
    hooks: ["세계관 몰입", "장기 회차", "선택 누적"],
  },
  {
    id: "astra",
    title: "Astra: Orbit Confession",
    module: "character",
    label: "캐릭터 프리미엄",
    genre: "SF 로맨스",
    summary:
      "감정 곡선과 친밀도 단계에 따라 말투와 기억이 바뀌는 고급 캐릭터 채팅 패키지입니다.",
    tags: ["하이퍼챗", "친밀도", "팬클럽"],
    metrics: {
      concurrent: "92K 활성 팬",
      conversion: "23.4% 구독 전환",
      retention: "D30 51%",
    },
    hooks: ["감정 보상", "굿즈 결합", "짧은 반복 세션"],
  },
  {
    id: "shogun",
    title: "마교 말단에서 교주까지",
    module: "creator",
    label: "크리에이터 히트작",
    genre: "무협 성장",
    summary:
      "이미지 300장 이상과 분기 서사를 결합한 장기 성장형 IP로, 창작자 수익화 사례를 상징합니다.",
    tags: ["이미지 대량 연동", "유료 시즌", "팬덤 구매"],
    metrics: {
      concurrent: "57K 액티브",
      conversion: "8.9% 스토어 전환",
      retention: "D30 47%",
    },
    hooks: ["IP 확장", "팬덤 과금", "크리에이터 수익"],
  },
];

export const storyEpisodes: StoryEpisode[] = [
  {
    id: "arrival",
    title: "포털 진입",
    scene:
      "네온 빛으로 갈라진 항구 도시 위로 포털이 열리고, 당신의 이름이 아직 기록되지 않은 왕좌 지도가 내려옵니다.",
    stakes: "첫 선택에 따라 도시의 신뢰와 광기 수치가 갈립니다.",
    choices: [
      {
        id: "negotiate",
        label: "항만 길드와 협상한다",
        result: "길드가 비밀 물류 루트를 열어 주며 초기 자금과 정보망이 확보됩니다.",
        trustDelta: 12,
        hypeDelta: 4,
      },
      {
        id: "raid",
        label: "검은 시장을 급습한다",
        result: "시민들은 당신의 대담함에 열광하지만, 지하 세력이 본격적으로 움직입니다.",
        trustDelta: -4,
        hypeDelta: 18,
      },
      {
        id: "broadcast",
        label: "전 도시 방송으로 자신을 선언한다",
        result: "모든 세력이 당신을 주목하며 이야기의 스케일이 곧바로 커집니다.",
        trustDelta: 5,
        hypeDelta: 12,
      },
    ],
  },
  {
    id: "fracture",
    title: "세력 균열",
    scene:
      "동맹 제안과 암살 예고가 동시에 도착합니다. 당신은 지금 누구를 믿고 어느 전선을 먼저 닫을지 결정해야 합니다.",
    stakes: "관계 자산과 공포 지수가 다음 장르 분위기를 결정합니다.",
    choices: [
      {
        id: "ally",
        label: "도시 의회와 공개 동맹을 맺는다",
        result: "합법 권력이 붙지만 자유도가 줄어들고, 반대 세력은 숨어듭니다.",
        trustDelta: 10,
        hypeDelta: 6,
      },
      {
        id: "rogue",
        label: "암살자 조직을 먼저 포섭한다",
        result: "어둠의 네트워크가 열리며 금지된 선택지가 해금됩니다.",
        trustDelta: -3,
        hypeDelta: 15,
      },
      {
        id: "festival",
        label: "축제를 열어 시민 지지를 선점한다",
        result: "대중의 마음을 얻고, 시즌 이벤트형 분기와 보상 루프가 활성화됩니다.",
        trustDelta: 14,
        hypeDelta: 9,
      },
    ],
  },
  {
    id: "ascend",
    title: "왕좌 점화",
    scene:
      "모든 세력이 광장에 집결합니다. 당신의 마지막 선언이 도시의 장르를 왕도 서사로 끝낼지, 광기 판타지로 뒤집을지 정합니다.",
    stakes: "엔딩과 다음 시즌 첫 장면의 톤이 결정됩니다.",
    choices: [
      {
        id: "mercy",
        label: "적에게 협상과 합류를 제안한다",
        result: "포용 엔딩. 후속 시즌은 정치 스릴러와 외교 확장으로 이어집니다.",
        trustDelta: 16,
        hypeDelta: 5,
      },
      {
        id: "crown",
        label: "왕좌를 강제로 점화한다",
        result: "폭발 엔딩. 도시 전체가 당신을 중심으로 재편되며 하드코어 후속 시즌이 열립니다.",
        trustDelta: -6,
        hypeDelta: 24,
      },
      {
        id: "vanish",
        label: "도시를 떠나 전설이 된다",
        result: "미스터리 엔딩. 팬덤 해석과 재진입 이벤트가 강하게 작동합니다.",
        trustDelta: 4,
        hypeDelta: 19,
      },
    ],
  },
];

export const characterProfiles: CharacterProfile[] = [
  {
    id: "astra",
    name: "아스트라",
    role: "함대 전략가",
    vibe: "차갑지만 진심을 오래 기억하는 타입",
    opener:
      "지금 연결이 열렸네. 함교는 조용하지만, 네가 들어오면 모든 수치가 조금 달라져.",
    responsePools: {
      calm: [
        "좋아. 급하게 몰아붙이지 말고, 네가 본 장면부터 천천히 말해 줘.",
        "그 선택은 의외로 영리했어. 다음 수를 설계할 시간을 벌었네.",
      ],
      intense: [
        "이건 감정이 아니라 전략의 문제야. 하지만 네 편에 설 각오는 이미 끝났어.",
        "지금 후퇴하면 이야기가 식어. 더 강하게 밀어붙여.",
      ],
      intimate: [
        "네가 다시 왔다는 사실만으로도 오늘의 항로는 수정할 가치가 있어.",
        "기억해 둘게. 네가 흔들릴 때 가장 먼저 부르는 이름이 누구인지.",
      ],
    },
  },
  {
    id: "noir",
    name: "누아르",
    role: "금지구역 브로커",
    vibe: "도발적이고 빠르게 친밀도를 시험하는 타입",
    opener:
      "정문으로 들어오는 사람은 재미없지. 넌 어느 문으로 들어왔어?",
    responsePools: {
      calm: [
        "냉정하네. 그런 태도면 이 판에서 오래 버틸 수 있어.",
        "좋아, 말은 짧게. 대신 대가는 정확하게 받아.",
      ],
      intense: [
        "그 말 좋네. 위험하지만 시장이 가장 좋아하는 온도야.",
        "이 정도 압력은 오히려 반갑지. 누가 먼저 눈을 깜빡일까?",
      ],
      intimate: [
        "방금 그 말은 거래가 아니라 유혹처럼 들렸어.",
        "한 번 더 그렇게 말하면 계약서 대신 비밀을 건네줄지도 몰라.",
      ],
    },
  },
];

export const partyScenarios: PartyScenario[] = [
  {
    id: "trial",
    title: "민트초코 공판 시즌 2",
    premise:
      "당신을 포함한 네 명의 플레이어가 맛과 기억, 자유의 권리를 두고 법정에서 실시간으로 공방합니다.",
    playerRoles: ["변호사", "심리 분석가", "셰프", "배심원 인플루언서"],
    actions: [
      "결정적 증거를 공개한다",
      "배심원을 감정적으로 흔든다",
      "상대 주장을 패러디한다",
      "합의안을 제안한다",
    ],
    twists: [
      "판사가 AI였다는 사실이 드러난다",
      "방청석 팬덤 투표가 판결 점수에 반영된다",
      "마지막 30초에 새 증인이 입장한다",
    ],
  },
  {
    id: "ark",
    title: "스페이스 오디세이: 산소 17분",
    premise:
      "우주선의 남은 산소는 17분. 모두가 동시에 행동을 제출하면 AI가 다음 장면과 생존률을 계산합니다.",
    playerRoles: ["항해사", "의무관", "기관사", "언어학자"],
    actions: [
      "응급 산소를 개방한다",
      "가장 의심스러운 승객을 격리한다",
      "AI 코어를 재부팅한다",
      "외계 신호에 응답한다",
    ],
    twists: [
      "구조 신호가 사실은 함정일 수 있다는 로그가 열린다",
      "선체 일부가 기억을 가진 생명체였다는 암시가 나온다",
      "희생 없이 모두를 살리는 제5의 선택지가 발견된다",
    ],
  },
];

export const imageStylePresets: ImageStylePreset[] = [
  {
    id: "obsidian",
    name: "Obsidian Neon",
    palette: "검정, 시안, 오렌지",
    summary: "도시 야경과 SF 드라마에 강한 고대비 시네마틱 룩",
    gradient: "linear-gradient(135deg, #101722 0%, #102f44 45%, #f76b1c 100%)",
  },
  {
    id: "porcelain",
    name: "Porcelain Bloom",
    palette: "아이보리, 로즈, 골드",
    summary: "캐릭터 감정 컷과 로맨스 공유 카드에 유리한 톤",
    gradient: "linear-gradient(135deg, #f7efe3 0%, #f0c7c0 52%, #8a5a44 100%)",
  },
  {
    id: "verdant",
    name: "Verdant Myth",
    palette: "녹옥, 금색, 안개 회색",
    summary: "무협과 동양 판타지, 성장 서사에 맞는 장면 스타일",
    gradient: "linear-gradient(135deg, #0d1f1b 0%, #2d6f5a 48%, #d6b15e 100%)",
  },
];

export const creatorTemplates: CreatorTemplate[] = [
  {
    id: "story-season",
    title: "장기 스토리 시즌",
    module: "creator",
    audience: "하드코어 세계관 플레이어",
    monetization: "에피소드 패스 + 시즌 조기 해금",
    outline: ["프롤로그", "세력 소개", "첫 충돌", "시즌 결말"],
  },
  {
    id: "character-club",
    title: "캐릭터 팬클럽 팩",
    module: "character",
    audience: "감정형 대화 재방문 유저",
    monetization: "구독 + 한정 채팅 모드",
    outline: ["첫 인상", "친밀도 상승", "비밀 해금", "프리미엄 스킨"],
  },
  {
    id: "party-event",
    title: "파티챗 시즌 이벤트",
    module: "party",
    audience: "친구 초대형 사용자",
    monetization: "시즌 티켓 + 룸 부스트",
    outline: ["입장 브리핑", "턴 1", "대형 반전", "하이라이트 공유"],
  },
];

export const billingPlans: BillingPlan[] = [
  {
    id: "free",
    name: "Explorer",
    price: 0,
    billingInterval: "monthly",
    perks: ["기본 피드 탐색", "표준 캐릭터 채팅", "기본 이미지 장면 생성"],
  },
  {
    id: "legend",
    name: "Legend Pass",
    price: 19900,
    billingInterval: "monthly",
    perks: [
      "프리미엄 스토리 패스",
      "하이퍼챗 우선권",
      "고해상도 이미지 장면",
      "광고 없는 플레이",
    ],
  },
  {
    id: "creator-pro",
    name: "Creator Pro",
    price: 49900,
    billingInterval: "monthly",
    perks: [
      "작품 발행 우선 심사",
      "스토어 상품 등록",
      "세일즈 분석 대시보드",
      "팬클럽 구독 도구",
    ],
  },
];

export const opsSignals: OpsSignal[] = [
  { label: "실시간 신고 큐", value: "184건", tone: "주의" },
  { label: "모델 장애 우회율", value: "99.982%", tone: "안정" },
  { label: "유료 전환 실험", value: "12개 진행", tone: "실험" },
  { label: "세이프티 필터 정확도", value: "98.6%", tone: "안정" },
];
