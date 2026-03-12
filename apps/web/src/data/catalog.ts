export type ServiceModule = {
  slug: string;
  name: string;
  label: string;
  headline: string;
  summary: string;
  capabilities: string[];
  targets: string[];
  monetization: string;
  safety: string;
};

export type SpotlightExperience = {
  title: string;
  category: string;
  description: string;
  owner: string;
};

export type OperatingLayer = {
  title: string;
  summary: string;
};

export const serviceModules: ServiceModule[] = [
  {
    slug: "story",
    name: "Story",
    label: "World Adventure",
    headline: "당신이 직접 주인공이 되는 거대 인터랙티브 세계",
    summary:
      "캐릭터 명칭 변경 공지 이후의 방향처럼, 단일 인물 대화를 넘어서 세계관 내부에서 사건과 관계를 체험하는 핵심 모드입니다.",
    capabilities: [
      "프롤로그 미리보기와 시작 설정 분기",
      "장기 기억과 요약 메모리",
      "실시간 상황 이미지 연동",
    ],
    targets: ["Web", "Android", "iOS"],
    monetization: "에피소드 패스, 하이퍼챗 업그레이드, 프리미엄 세계관 팩",
    safety: "세이프티 레이어, 연령 노출 제어, 작품별 정책 플래그",
  },
  {
    slug: "character",
    name: "Character",
    label: "Conversation Loop",
    headline: "짧고 빠른 티키타카에 최적화된 감정형 대화 경험",
    summary:
      "2025년 가을 업데이트 방향처럼 대화 자체의 재미를 강화하는 모드입니다. 반복 방문과 캐릭터 팬덤 형성에 유리합니다.",
    capabilities: [
      "짧은 세션 최적화 UX",
      "친밀도와 관계 상태 변화",
      "파워챗, 슈퍼챗+, 하이퍼챗 모드",
    ],
    targets: ["Web", "Android", "iOS"],
    monetization: "채팅 모드 업셀, 팬클럽 구독, 한정 캐릭터 드롭",
    safety: "세이프티 전용 대화 모드와 실시간 필터링",
  },
  {
    slug: "party-chat",
    name: "Party Chat",
    label: "Multiplayer Drama",
    headline: "여러 명이 같은 턴 안에서 스토리를 만드는 AI 파티 세션",
    summary:
      "모든 참여자의 행동을 수집한 뒤 AI가 다음 장면을 생성하는 베타 파티챗 흐름을 본격 제품화한 모드입니다.",
    capabilities: [
      "2~5인 방 생성과 초대 링크",
      "빠른 진행, 건너뛰기, 이모티콘 반응",
      "공개 로비와 음성 커뮤니티 연동 준비",
    ],
    targets: ["Web", "Android", "iOS"],
    monetization: "방장 가속권, 시즌 이벤트 티켓, 파티 패스",
    safety: "방 권한, 참여자 추방, 룸 단위 신고와 로그 보관",
  },
  {
    slug: "image-studio",
    name: "Image Studio",
    label: "Visual Engine",
    headline: "독립 생성과 대화 속 장면 렌더링을 모두 담당하는 이미지 축",
    summary:
      "이미지 생성 리뉴얼과 상황 이미지 기능을 통합한 시각 엔진입니다. 이야기 몰입과 공유 확산을 함께 책임집니다.",
    capabilities: [
      "스타일 프리셋과 장면 키워드",
      "대화 중 상황 이미지 on/off",
      "보관함과 작품별 미디어 세트",
    ],
    targets: ["Web", "Android", "iOS"],
    monetization: "고해상도 렌더 패스, 스타일 팩, 콜렉터블 이미지 판매",
    safety: "주제 제약, 안전 이미지 정책, 생성 전후 검수 체인",
  },
  {
    slug: "creator-console",
    name: "Creator Console",
    label: "Publishing & Rewards",
    headline: "작품 공개, 랭킹, 보상, 스토어까지 묶는 창작 운영 콘솔",
    summary:
      "공식 크리에이터 구좌, 신예 노출, 크랙 스토어, 보상 보너스 제도를 하나의 운영 도구로 연결하는 영역입니다.",
    capabilities: [
      "작품 공개와 비공개 전환",
      "지표 대시보드와 신작 퍼널",
      "스토어와 보너스 캐시 정산",
    ],
    targets: ["Web", "Android", "iOS"],
    monetization: "스토어 판매, 유료 에피소드, 후원과 광고 수익 분배",
    safety: "창작자 보호, 삭제 복구, 운영 감사 로그",
  },
  {
    slug: "trust-layer",
    name: "Trust Layer",
    label: "Safety & Memory",
    headline: "장기 기억, 정책 집행, 안정성 운영을 맡는 서비스 기반층",
    summary:
      "실시간 생성 경험이 흔들리지 않도록 메모리 요약, 모델 라우팅, 세이프티, 운영 알림을 담당하는 백본입니다.",
    capabilities: [
      "요약 메모리와 장기 기억 관리",
      "모델 다각화와 장애 우회",
      "정책 위반 탐지와 복구 운영",
    ],
    targets: ["Web", "Android", "iOS"],
    monetization: "직접 수익화보다 리텐션, 안정성, 결제 전환 유지에 기여",
    safety: "정책 집행의 중심 레이어",
  },
];

export const spotlightExperiences: SpotlightExperience[] = [
  {
    title: "사건번호 2024가단X",
    category: "공식 파티챗",
    description:
      "민트초코를 두고 법정 토론을 벌이는 멀티플레이 법정 드라마. 팀 플레이와 AI 반대편 진행이 동시에 작동합니다.",
    owner: "크랙",
  },
  {
    title: "밀레니엄",
    category: "공식 파티챗",
    description:
      "기원전 4000년, 파티챗 방 하나에서 인류의 첫 의제가 상정되는 집단 선택형 시뮬레이션입니다.",
    owner: "크랙",
  },
  {
    title: "스페이스 오디세이",
    category: "공식 파티챗",
    description:
      "산소 고갈과 신뢰 붕괴 사이에서 누가 인류를 살릴지 판단하는 협동형 서바이벌입니다.",
    owner: "크랙",
  },
  {
    title: "마교 말단에서 교주까지",
    category: "스토리",
    description:
      "310장 이미지와 다수의 등장인물을 품은 무협 성장 세계관. 이미지와 선택지 중심의 장기 플레이 사례입니다.",
    owner: "멍구",
  },
];

export const operatingLayers: OperatingLayer[] = [
  {
    title: "Discover",
    summary:
      "랭킹, 신예, 공식 구좌, 작품 상세 프롤로그를 묶어 첫 세션에서 바로 재미를 발견하게 합니다.",
  },
  {
    title: "Create",
    summary:
      "시작 설정, 미디어, 키워드북, 이미지, 대화 모드 구성을 한 번에 다룰 수 있는 제작 경험을 제공합니다.",
  },
  {
    title: "Monetize",
    summary:
      "크래커 소비, 스토어 판매, 보너스 캐시, 시즌 패스를 하나의 성장 루프로 연결합니다.",
  },
  {
    title: "Operate",
    summary:
      "세이프티, 신고, 삭제 복구, 모델 장애 우회, 공지와 이벤트 집행까지 운영 전반을 지원합니다.",
  },
];

export const releaseTracks = [
  {
    title: "Web HQ",
    subtitle: "발견, 창작, 운영을 모두 담는 브라우저 허브",
    milestones: [
      "홈 피드, 큐레이션, 검색, 작품 상세",
      "창작 스튜디오와 크리에이터 콘솔",
      "라이브 운영 배너와 시즌 이벤트 관리",
    ],
  },
  {
    title: "Android App",
    subtitle: "고빈도 소비와 커뮤니티 확산에 최적화된 주력 앱",
    milestones: [
      "캐릭터와 스토리 재방문 루프",
      "파티챗 푸시와 링크 초대",
      "이미지 공유와 결제 전환 최적화",
    ],
  },
  {
    title: "iOS App",
    subtitle: "프리미엄 탐색, 팬덤, 인앱 상품 경험 강화",
    milestones: [
      "큐레이션 중심의 온보딩",
      "팬클럽, 컬렉션, 후원형 상품",
      "콘텐츠 품질과 세이프티 신뢰 강화",
    ],
  },
];
