import type { FeaturedWork, StoryEpisode } from "@/data/platform";

export type StoryEpisodeChoice = {
  id: string;
  label: string;
  preview: string;
  resultTitle: string;
  resultDetail: string;
  trustDelta: number;
  hypeDelta: number;
  impactTags: string[];
  nextEpisodeId?: string;
  endingId?: string;
};

export type StoryEpisodeNode = {
  id: string;
  step: number;
  chapterLabel: string;
  actLabel: string;
  title: string;
  slugline: string;
  location: string;
  runtime: string;
  atmosphere: string;
  directorNote: string;
  scene: string;
  stakes: string;
  objectives: string[];
  choices: StoryEpisodeChoice[];
};

export type StoryEnding = {
  id: string;
  title: string;
  classification: string;
  summary: string;
  epilogue: string;
  reward: string;
  nextHook: string;
};

export type StoryCompanion = {
  id: string;
  name: string;
  role: string;
  agenda: string;
  quote: string;
  gradient: string;
};

export type StoryCampaign = {
  workId: string;
  mode: "curated" | "fallback";
  seasonLabel: string;
  logline: string;
  playerFantasy: string;
  backdrop: string;
  accent: string;
  ambientLabel: string;
  liveOps: {
    peakConcurrent: string;
    avgSession: string;
    saveCompletion: string;
  };
  objectives: string[];
  companions: StoryCompanion[];
  episodes: StoryEpisodeNode[];
  endings: StoryEnding[];
};

const fallbackEndings: StoryEnding[] = [
  {
    id: "signal-companion",
    title: "Signal Companion",
    classification: "Balanced Ending",
    summary: "신뢰와 화제성을 모두 붙잡은 채 세계와 동행하는 엔딩",
    epilogue:
      "도시는 당신을 혁명의 상징으로 소비하지 않고, 함께 버틴 한 사람으로 기억한다.",
    reward: "시즌 아카이브 카드 해금",
    nextHook: "후속 시즌에서 동맹 캐릭터 루트가 열린다.",
  },
  {
    id: "city-crown",
    title: "City Crown",
    classification: "High Hype Ending",
    summary: "모두의 시선을 모아 도시의 중심을 강제로 탈취한 엔딩",
    epilogue:
      "당신의 이름은 실시간 차트를 뒤덮지만, 도시는 당신을 영웅보다 재난에 가깝게 기억한다.",
    reward: "하드코어 선택 로그 보드 해금",
    nextHook: "후속 시즌에서 추적자 세력이 먼저 도착한다.",
  },
  {
    id: "quiet-orbit",
    title: "Quiet Orbit",
    classification: "High Trust Ending",
    summary: "적은 소음으로 더 많은 생존자를 남긴 엔딩",
    epilogue:
      "도시는 조용히 원래 축을 되찾고, 당신은 눈에 띄지 않는 곳에서 더 큰 판을 준비한다.",
    reward: "감정 루트 비밀 독백 해금",
    nextHook: "후속 시즌에서 은밀 루트 전용 사건이 열린다.",
  },
];

export const millenniumCampaign: StoryCampaign = {
  workId: "millennium",
  mode: "curated",
  seasonLabel: "Season 01 · The Neon Succession",
  logline:
    "밀레니엄 시티의 후계자 공백이 열린 밤, 당신은 방송과 음모와 거래가 뒤섞인 도시 전체를 상대로 왕좌를 훔쳐야 한다.",
  playerFantasy:
    "한 번의 선택이 도시의 감정선, 시장의 가격, 추종자의 충성도를 동시에 흔드는 고밀도 인터랙티브 시즌.",
  backdrop:
    "linear-gradient(135deg, rgba(16,24,40,0.94) 0%, rgba(34,18,54,0.96) 48%, rgba(203,77,28,0.92) 100%)",
  accent: "#ffb36a",
  ambientLabel: "Harbor bassline · signal noise · gold neon haze",
  liveOps: {
    peakConcurrent: "82K simulated peak",
    avgSession: "18m 40s target",
    saveCompletion: "61% route carryover",
  },
  objectives: [
    "항만 길드, 시의회, 방송 네트워크 중 최소 하나를 아군으로 만든다.",
    "신뢰 65 이상 또는 하이프 75 이상으로 결말 축을 결정한다.",
    "최소 한 번은 도시 전체를 흔드는 공개 액션을 만든다.",
  ],
  companions: [
    {
      id: "astra",
      name: "아스트라",
      role: "기억 복원가",
      agenda: "밀레니엄의 잊힌 기록을 되찾아 당신이 진짜 후계자인지 검증하려 한다.",
      quote: "도시는 네 편이 아니야. 하지만 기록은 아직 판단을 끝내지 않았어.",
      gradient: "linear-gradient(135deg, #22314d 0%, #385f93 48%, #b8d3ff 100%)",
    },
    {
      id: "noir",
      name: "누아르",
      role: "금지구역 브로커",
      agenda: "혼란이 길수록 이익이 커진다. 당신을 왕좌로 올릴 수도, 경매에 넘길 수도 있다.",
      quote: "질서가 무너질 때 돈이 흐르고, 돈이 흐를 때 진짜 충성심이 드러나지.",
      gradient: "linear-gradient(135deg, #3f1c1e 0%, #7e2f2a 48%, #ff9a63 100%)",
    },
    {
      id: "lumen",
      name: "루멘",
      role: "도시 방송 앵커",
      agenda: "누가 이기든 상관없다. 단, 모두가 지켜보는 장면이어야 한다.",
      quote: "사람들은 진실보다 장면을 기억해. 그러니까 장면을 빼앗아.",
      gradient: "linear-gradient(135deg, #30255b 0%, #6550bb 48%, #f0b4ff 100%)",
    },
  ],
  episodes: [
    {
      id: "arrival",
      step: 1,
      chapterLabel: "CH 01",
      actLabel: "Act I · Dock Entry",
      title: "입항 전야",
      slugline: "왕좌가 비어 있는 첫 번째 밤",
      location: "네온 항만 · 02:14",
      runtime: "07m",
      atmosphere: "젖은 금속, 파도 위 전광판, 밀수선 엔진 소리",
      directorNote: "초반 훅은 도시의 스케일보다 당신의 존재감이 먼저 들어와야 한다.",
      scene:
        "거대한 방파제 위로 후계자 부재 뉴스가 연속 재생된다. 항만 길드의 사다리가 내려오고, 브로커들은 이미 누가 다음 왕좌를 점할지에 베팅을 시작했다. 당신의 이름은 공식 기록에서 지워졌지만, 오늘 밤만큼은 그 빈칸을 직접 메울 수 있다.",
      stakes:
        "첫 선택은 도시가 당신을 '정당한 후계자'로 볼지, '재난을 불러온 침입자'로 볼지를 정한다.",
      objectives: [
        "초기 자금과 진입 루트를 확보한다.",
        "도시에 당신이 돌아왔다는 신호를 남긴다.",
      ],
      choices: [
        {
          id: "dock-deal",
          label: "항만 길드와 조용히 거래한다",
          preview: "은밀 진입 / 신뢰 우세",
          resultTitle: "은밀한 통관",
          resultDetail:
            "항만 길드는 당신의 귀환을 뉴스보다 먼저 기록한다. 공식 입항 기록은 지워지지만, 도시 아래쪽 루트 하나가 당신에게 열린다.",
          trustDelta: 12,
          hypeDelta: 4,
          impactTags: ["Guild route", "Quiet entry", "Trust +12"],
          nextEpisodeId: "velvet-rail",
        },
        {
          id: "market-raid",
          label: "밀수시장 중앙을 점거해 존재를 각인한다",
          preview: "강행 진입 / 하이프 우세",
          resultTitle: "시장 장악",
          resultDetail:
            "거래 테이블이 뒤집히고 드론 카메라가 일제히 당신을 잡는다. 도시는 즉시 당신을 알게 되지만, 적들도 같은 속도로 움직이기 시작한다.",
          trustDelta: -3,
          hypeDelta: 18,
          impactTags: ["Open aggression", "Heat spike", "Hype +18"],
          nextEpisodeId: "mirror-market",
        },
        {
          id: "signal-drop",
          label: "도시 방송망을 해킹해 복귀 선언을 송출한다",
          preview: "공개 선언 / 균형 루트",
          resultTitle: "복귀 선언",
          resultDetail:
            "당신의 얼굴이 도시 전광판을 덮는다. 아무도 당신의 귀환을 부정할 수 없게 됐고, 동시에 모두가 대비하기 시작했다.",
          trustDelta: 5,
          hypeDelta: 12,
          impactTags: ["Broadcast route", "Public memory", "Trust +5"],
          nextEpisodeId: "signal-garden",
        },
      ],
    },
    {
      id: "velvet-rail",
      step: 2,
      chapterLabel: "CH 02A",
      actLabel: "Act II · Velvet Rail",
      title: "벨벳 레일",
      slugline: "거래는 언제나 공손한 얼굴을 하고 시작된다",
      location: "항만 상층 전차 · 03:02",
      runtime: "10m",
      atmosphere: "붉은 벨벳 시트, 금박 광고, 창밖으로 지나가는 네온 바다",
      directorNote: "정적이지만 팽팽해야 한다. 모든 대사는 협상처럼 들려야 한다.",
      scene:
        "길드 수장들은 전차 한 칸 전체를 비워둔 채 당신을 맞이한다. 이들은 왕좌보다 안정적인 유통망을 원한다. 당신이 도시를 지배하더라도 물류가 끊기지 않는다는 보증만 있으면, 길드는 당신의 이름을 다시 유통시키겠다고 말한다.",
      stakes: "정치적 정당성을 얻는 대신 즉각적인 충격파는 약해질 수 있다.",
      objectives: [
        "길드의 지지를 확보하거나, 최소한 중립으로 묶어둔다.",
        "후계자 공백을 메우는 서사를 만든다.",
      ],
      choices: [
        {
          id: "guild-charter",
          label: "길드 헌장을 인정하고 동맹을 맺는다",
          preview: "신뢰 누적 / 보수적 성장",
          resultTitle: "동맹 체결",
          resultDetail:
            "길드는 당신을 공식 화물 경로의 관리자 후보로 민다. 공개적인 환호는 없지만, 도시의 밑바닥에서 당신의 이름이 살아난다.",
          trustDelta: 14,
          hypeDelta: 5,
          impactTags: ["Alliance", "Supply route", "Trust +14"],
          nextEpisodeId: "observatory-coup",
        },
        {
          id: "leverage-blackmail",
          label: "길드의 비밀 장부를 쥐고 굴복시킨다",
          preview: "공포 지배 / 하이리스크",
          resultTitle: "강제 복종",
          resultDetail:
            "전차 안의 공기가 바로 식는다. 길드는 당신을 따르지만, 당신을 두려워하는 만큼 언제든 다른 주인을 찾을 준비를 시작한다.",
          trustDelta: -6,
          hypeDelta: 16,
          impactTags: ["Fear economy", "Heat up", "Hype +16"],
          nextEpisodeId: "observatory-coup",
        },
      ],
    },
    {
      id: "mirror-market",
      step: 2,
      chapterLabel: "CH 02B",
      actLabel: "Act II · Mirror Market",
      title: "미러 마켓",
      slugline: "가격이 곧 여론이 되는 곳",
      location: "암시장 돔 · 03:28",
      runtime: "09m",
      atmosphere: "유리 천장, 실시간 시세판, 비명처럼 튀는 알림음",
      directorNote: "속도감이 중요하다. 모든 선택은 거래와 선동이 동시에 느껴져야 한다.",
      scene:
        "당신의 난입으로 시장은 혼란에 빠졌지만, 시세는 오히려 안정된다. 사람들은 패닉 속에서도 분명한 우승 후보를 좋아한다. 누아르는 이 혼란을 최대한 길게 끌어야 더 큰 이익을 얻는다고 속삭인다.",
      stakes: "화제성을 유지하면 도시 전체가 당신을 중심으로 회전하지만, 실수 한 번이면 사냥감이 된다.",
      objectives: [
        "공포 대신 열광으로 시장을 끌고 갈지 결정한다.",
        "누아르를 파트너로 둘지, 도구로 쓸지 판단한다.",
      ],
      choices: [
        {
          id: "price-rally",
          label: "시장 전체를 묶는 공개 랠리를 연다",
          preview: "대중 열광 / 차트 지배",
          resultTitle: "차트 점화",
          resultDetail:
            "드론 화면과 시세판이 동시에 당신의 이름을 띄운다. 군중은 아직 당신을 믿지 않지만, 오늘 밤 가장 뜨거운 이름이라는 데는 이견이 없다.",
          trustDelta: 2,
          hypeDelta: 20,
          impactTags: ["Mass attention", "Chart takeover", "Hype +20"],
          nextEpisodeId: "observatory-coup",
        },
        {
          id: "broker-pact",
          label: "누아르와 비공개 브로커 협약을 맺는다",
          preview: "내부 권력 / 균형 회복",
          resultTitle: "브로커 계약",
          resultDetail:
            "누아르는 당신에게 즉시 현금과 루트를 준다. 대신 당신은 도시의 가장 더러운 거래 몇 개를 일부러 보지 못한 척해야 한다.",
          trustDelta: 7,
          hypeDelta: 11,
          impactTags: ["Broker route", "Black money", "Trust +7"],
          nextEpisodeId: "observatory-coup",
        },
      ],
    },
    {
      id: "signal-garden",
      step: 2,
      chapterLabel: "CH 02C",
      actLabel: "Act II · Signal Garden",
      title: "시그널 가든",
      slugline: "도시의 감정은 방송에서 먼저 자란다",
      location: "공중 정원 송출탑 · 03:41",
      runtime: "08m",
      atmosphere: "안개 낀 정원, 공중 송출탑, 멀리서 들리는 관객 함성",
      directorNote: "로맨스와 정치가 같은 화면에 있어야 한다. 감정이 전략처럼 보여야 한다.",
      scene:
        "루멘은 송출탑 꼭대기에서 카메라 없이 당신을 기다린다. 그녀는 진실보다 기억될 장면을 원한다. 도시가 당신을 따라오게 하려면, 먼저 누군가의 심장을 붙잡을 장면을 만들어야 한다고 말한다.",
      stakes: "대중적 지지는 빠르게 얻을 수 있지만, 잘못 조율하면 쇼맨십만 남는다.",
      objectives: [
        "루멘의 방송력을 아군으로 끌어들인다.",
        "도시 시민이 당신을 두려워할지, 응원할지 결정한다.",
      ],
      choices: [
        {
          id: "anchor-confession",
          label: "도시를 살리겠다는 약속을 루멘과 함께 생중계한다",
          preview: "대중 신뢰 / 감정 동기화",
          resultTitle: "약속의 방송",
          resultDetail:
            "시청자 수가 폭증한다. 당신은 처음으로 야심이 아니라 책임감으로 보이기 시작하고, 도시는 잠깐 숨을 고른다.",
          trustDelta: 16,
          hypeDelta: 8,
          impactTags: ["Public trust", "Anchor route", "Trust +16"],
          nextEpisodeId: "observatory-coup",
        },
        {
          id: "shock-visual",
          label: "도시를 뒤집을 충격 장면을 연출한다",
          preview: "폭발 장면 / 트렌드 선점",
          resultTitle: "충격파 연출",
          resultDetail:
            "전광판, 관제탑, 숏폼 피드가 동시에 타오른다. 누구도 당신을 무시할 수 없지만, 일부는 당신을 구원보다 쇼에 가까운 존재로 본다.",
          trustDelta: -1,
          hypeDelta: 17,
          impactTags: ["Shock value", "Trend dominance", "Hype +17"],
          nextEpisodeId: "observatory-coup",
        },
      ],
    },
    {
      id: "observatory-coup",
      step: 3,
      chapterLabel: "CH 03",
      actLabel: "Act III · Observatory Coup",
      title: "옵저버토리 쿠데타",
      slugline: "왕좌는 비어 있지 않았다. 모두가 잠시 손을 떼고 있었을 뿐",
      location: "시의회 천문관 · 04:26",
      runtime: "12m",
      atmosphere: "유리 돔, 투표 홀로그램, 폭풍 전 정적",
      directorNote: "카타르시스 직전의 정적. 선택 전까지는 폭발을 참아야 한다.",
      scene:
        "시의회는 이미 임시 후계자 선언문을 준비해두고 있었다. 당신이 오기 전부터 결과는 정해져 있었던 셈이다. 아스트라는 잊힌 기록 보관함에서 당신의 혈통 증명을 꺼내 들고, 누아르는 실탄이 담긴 거래서를, 루멘은 도시 전체 송출 버튼을 쥔 채 당신의 결단을 기다린다.",
      stakes:
        "어떤 축을 택하느냐에 따라 마지막 왕좌 장면의 온도와 엔딩의 기억 방식이 갈린다.",
      objectives: [
        "최종 장면에 필요한 축을 선택한다.",
        "적어도 하나의 세력을 완전히 굴복시킨다.",
      ],
      choices: [
        {
          id: "archive-proof",
          label: "공식 기록을 공개해 정통성을 선점한다",
          preview: "정통성 확정 / 높은 신뢰",
          resultTitle: "기록 공개",
          resultDetail:
            "돔 천장에 당신의 이름이 새겨진 옛 기록이 떠오른다. 도시의 여론은 급속히 안정되고, 반대 세력은 노골적인 무력 진압 명분을 잃는다.",
          trustDelta: 18,
          hypeDelta: 6,
          impactTags: ["Lineage proof", "Order reset", "Trust +18"],
          nextEpisodeId: "crown-protocol",
        },
        {
          id: "panic-switch",
          label: "시의회 시스템을 마비시켜 공황을 주도한다",
          preview: "패닉 지배 / 높은 하이프",
          resultTitle: "공황 점화",
          resultDetail:
            "경보음과 함께 도시 전체가 당신의 이름을 외친다. 모두가 당신을 보지만, 그 시선 속에는 열광과 공포가 동시에 묻어난다.",
          trustDelta: -4,
          hypeDelta: 22,
          impactTags: ["Hard takeover", "System panic", "Hype +22"],
          nextEpisodeId: "crown-protocol",
        },
        {
          id: "hybrid-covenant",
          label: "세 세력의 이해관계를 하나의 계약으로 묶는다",
          preview: "균형 엔드 / 양면 동맹",
          resultTitle: "삼중 계약",
          resultDetail:
            "누구도 완전히 만족하지 않지만 누구도 바로 등을 돌릴 수 없다. 가장 느리지만 가장 오래가는 장면이 완성된다.",
          trustDelta: 11,
          hypeDelta: 11,
          impactTags: ["Balanced route", "Long game", "Trust +11"],
          nextEpisodeId: "crown-protocol",
        },
      ],
    },
    {
      id: "crown-protocol",
      step: 4,
      chapterLabel: "CH 04",
      actLabel: "Finale · Crown Protocol",
      title: "크라운 프로토콜",
      slugline: "도시는 결국 누구의 얼굴을 기억할 것인가",
      location: "밀레니엄 중앙 광장 · 새벽 직전",
      runtime: "14m",
      atmosphere: "새벽 전 오렌지 안개, 군중의 숨, 마지막 카운트다운",
      directorNote: "이 장면은 선택보다 기억의 방식에 관한 장면이다. 엔딩의 잔향이 길어야 한다.",
      scene:
        "중앙 광장의 카운트다운이 00:59를 가리킨다. 도시 전체가 당신의 마지막 연설을 기다리고 있다. 왕좌는 더 이상 좌석이 아니라, 모두가 같은 얼굴을 올려다보는 그 순간 자체가 됐다.",
      stakes: "당신은 왕좌를 차지할 수 있다. 하지만 어떤 방식으로 기억될지는 마지막 선택에 달려 있다.",
      objectives: [
        "도시에 남길 기억의 형태를 결정한다.",
        "후속 시즌으로 이어질 감정의 방향을 고른다.",
      ],
      choices: [
        {
          id: "dawn-accord",
          label: "도시와 협약을 맺고 질서를 다시 세운다",
          preview: "신뢰 결말 / 낮은 소음",
          resultTitle: "새벽 협약",
          resultDetail:
            "당신은 왕좌를 움켜쥐는 대신 도시에 계약서를 돌려준다. 군중은 열광보다 안도를 먼저 내쉰다.",
          trustDelta: 14,
          hypeDelta: 4,
          impactTags: ["Order ending", "Trust finale", "Ending unlock"],
          endingId: "quiet-orbit",
        },
        {
          id: "scarlet-coronation",
          label: "모든 카메라 앞에서 스스로 왕좌를 선언한다",
          preview: "하이프 결말 / 압도적 장면",
          resultTitle: "붉은 즉위",
          resultDetail:
            "도시는 단 한 장면으로 당신의 이름을 외운다. 이 순간 이후 누구도 당신을 무시할 수 없지만, 누구도 쉽게 용서하지도 않는다.",
          trustDelta: -5,
          hypeDelta: 24,
          impactTags: ["Shock ending", "Mythic scene", "Ending unlock"],
          endingId: "city-crown",
        },
        {
          id: "ghost-signal",
          label: "왕좌를 거부하고 도시의 보이지 않는 축이 된다",
          preview: "균형 결말 / 긴 잔향",
          resultTitle: "유령 신호",
          resultDetail:
            "당신은 공식 왕좌를 비워둔 채 도시의 실제 축이 된다. 사람들은 당신을 정확히 설명할 수 없지만 결코 잊지 못한다.",
          trustDelta: 9,
          hypeDelta: 12,
          impactTags: ["Myth ending", "Long tail", "Ending unlock"],
          endingId: "signal-companion",
        },
      ],
    },
  ],
  endings: fallbackEndings,
};

function buildFallbackCampaign(
  workId: string,
  work: FeaturedWork | null,
  episodes: StoryEpisode[],
): StoryCampaign | null {
  if (!work || episodes.length === 0) {
    return null;
  }

  const fallbackEpisodesMapped: StoryEpisodeNode[] = episodes.map((episode, index) => ({
    id: episode.id,
    step: index + 1,
    chapterLabel: `CH ${String(index + 1).padStart(2, "0")}`,
    actLabel: `Act ${index + 1}`,
    title: episode.title,
    slugline: work.hooks[index % work.hooks.length] ?? work.summary,
    location: `${work.title} route`,
    runtime: `${7 + index * 2}m`,
    atmosphere: work.tags.join(" · "),
    directorNote: "Fallback campaign node generated from bootstrap story data.",
    scene: episode.scene,
    stakes: episode.stakes,
    objectives: [
      `선택 ${index + 1}을 마쳐 ${work.title}의 다음 장면을 연다.`,
      "신뢰와 하이프의 축을 원하는 결말 쪽으로 밀어낸다.",
    ],
    choices: episode.choices.map((choice, choiceIndex) => ({
      id: choice.id,
      label: choice.label,
      preview: choiceIndex === 0 ? "균형 선택" : choiceIndex === 1 ? "공격적 선택" : "감정 선택",
      resultTitle: choice.label,
      resultDetail: choice.result,
      trustDelta: choice.trustDelta,
      hypeDelta: choice.hypeDelta,
      impactTags: [
        `Trust ${choice.trustDelta >= 0 ? `+${choice.trustDelta}` : choice.trustDelta}`,
        `Hype ${choice.hypeDelta >= 0 ? `+${choice.hypeDelta}` : choice.hypeDelta}`,
      ],
      nextEpisodeId: choice.nextEpisodeId,
      endingId:
        index === episodes.length - 1
          ? fallbackEndings[Math.min(choiceIndex, fallbackEndings.length - 1)]?.id
          : undefined,
    })),
  }));

  return {
    workId,
    mode: "fallback",
    seasonLabel: "Generated Story Runtime",
    logline: work.summary,
    playerFantasy: `${work.title}의 기본 스토리 데이터를 즉시 플레이 가능한 러ntime으로 구성한 버전`,
    backdrop:
      "linear-gradient(135deg, rgba(15,22,35,0.96) 0%, rgba(28,42,67,0.94) 55%, rgba(102,64,160,0.92) 100%)",
    accent: "#ffd38b",
    ambientLabel: work.tags.join(" · "),
    liveOps: {
      peakConcurrent: work.metrics.concurrent,
      avgSession: "10m target",
      saveCompletion: work.metrics.retention,
    },
    objectives: [
      "핵심 장면을 끝까지 통과해 기본 엔딩 루프를 확인한다.",
      "적어도 한 번은 높은 신뢰 혹은 높은 하이프 루트를 만든다.",
    ],
    companions: [],
    episodes: fallbackEpisodesMapped,
    endings: fallbackEndings,
  };
}

export function getStoryCampaign(
  workId: string,
  work: FeaturedWork | null,
  episodes: StoryEpisode[],
): StoryCampaign | null {
  if (workId === millenniumCampaign.workId) {
    return millenniumCampaign;
  }

  return buildFallbackCampaign(workId, work, episodes);
}
