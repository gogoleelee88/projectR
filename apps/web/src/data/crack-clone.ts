import type {
  BootstrapPayload,
  CreatorTemplate,
  FeaturedWork,
  ImageStylePreset,
  ReleaseRecord,
} from "@/data/platform";
import type { SessionState } from "@/lib/projectr-api";

export type CrackTabId = "story" | "character" | "works" | "image";
export type CrackDetailKind =
  | "work"
  | "character"
  | "style"
  | "template"
  | "release";

export type CrackCard = {
  id: string;
  kind: CrackDetailKind;
  href: string;
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

export type CrackDetailSection = {
  title: string;
  body: string;
  items: string[];
};

export type CrackDetailEntity = {
  kind: CrackDetailKind;
  id: string;
  tab: CrackTabId;
  title: string;
  eyebrow: string;
  summary: string;
  meta: string;
  chips: string[];
  accent: string;
  primaryCta: {
    label: string;
    href: string;
  };
  secondaryCta: {
    label: string;
    href: string;
  };
  stats: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
  sections: CrackDetailSection[];
};

const workAccents: Record<FeaturedWork["module"], string> = {
  discover: "from-[#201b3f] via-[#16243b] to-[#8d5efc]",
  story: "from-[#201b3f] via-[#16243b] to-[#8d5efc]",
  character: "from-[#0d2034] via-[#17395a] to-[#7fd7ff]",
  party: "from-[#180f14] via-[#4a1e28] to-[#ef815c]",
  studio: "from-[#07111d] via-[#0c2f4b] to-[#f76b1c]",
  creator: "from-[#151c20] via-[#234453] to-[#68d5df]",
  ops: "from-[#121722] via-[#29334f] to-[#7aa2ff]",
};

const styleAccents = [
  "from-[#07111d] via-[#0c2f4b] to-[#f76b1c]",
  "from-[#29171b] via-[#845563] to-[#f1c6c7]",
  "from-[#0a1814] via-[#245346] to-[#d8b86e]",
];

const templateAccents = [
  "from-[#151c20] via-[#234453] to-[#68d5df]",
  "from-[#17181f] via-[#2c3044] to-[#8f95b2]",
  "from-[#1f1412] via-[#68402a] to-[#ebb277]",
];

const releaseAccents = [
  "from-[#121722] via-[#29334f] to-[#7aa2ff]",
  "from-[#151c20] via-[#234453] to-[#68d5df]",
  "from-[#201b3f] via-[#16243b] to-[#8d5efc]",
];

const partyScenarioByWorkId: Record<string, string> = {
  courtroom: "trial",
};

function detailHref(kind: CrackDetailKind, id: string) {
  return `/detail/${kind}/${id}`;
}

function resolveTabFromModule(module: FeaturedWork["module"]): CrackTabId {
  switch (module) {
    case "character":
      return "character";
    case "creator":
      return "works";
    case "studio":
      return "image";
    case "party":
    case "story":
    case "discover":
    case "ops":
    default:
      return "story";
  }
}

function workCtaLabel(module: FeaturedWork["module"]) {
  switch (module) {
    case "character":
      return "캐릭터 보기";
    case "creator":
      return "작품 허브 보기";
    case "party":
      return "파티챗 입장";
    case "studio":
      return "이미지 보기";
    case "story":
    case "discover":
    case "ops":
    default:
      return "상세 보기";
  }
}

function templateMeta(template: CreatorTemplate) {
  return `${template.audience} · ${template.monetization}`;
}

function releaseMeta(release: ReleaseRecord) {
  return `₩${Number(release.price).toLocaleString("ko-KR")} · ${release.status}`;
}

function workToCard(work: FeaturedWork): CrackCard {
  return {
    id: work.id,
    kind: "work",
    href: detailHref("work", work.id),
    title: work.title,
    eyebrow: work.label,
    summary: work.summary,
    meta: work.metrics.concurrent,
    chips: work.tags,
    accent: workAccents[work.module],
  };
}

function characterToCard(data: BootstrapPayload): CrackCard[] {
  return data.characters.map((character, index) => ({
    id: character.id,
    kind: "character",
    href: detailHref("character", character.id),
    title: character.name,
    eyebrow: character.role,
    summary: character.vibe || character.opener,
    meta: `${
      character.responsePools.intimate.length + character.responsePools.intense.length
    }개 반응 풀`,
    chips: [
      "감정형 채팅",
      character.responsePools.intimate.length > 0 ? "친밀도" : "빠른 대화",
      index === 0 ? "프리미엄" : "추천",
    ],
    accent: workAccents.character,
  }));
}

function styleToCard(styles: ImageStylePreset[]): CrackCard[] {
  return styles.map((style, index) => ({
    id: style.id,
    kind: "style",
    href: detailHref("style", style.id),
    title: style.name,
    eyebrow: "이미지 스타일",
    summary: style.summary,
    meta: style.palette,
    chips: style.palette.split(",").map((entry) => entry.trim()),
    accent: styleAccents[index % styleAccents.length],
  }));
}

function templateToCard(templates: CreatorTemplate[]): CrackCard[] {
  return templates.map((template, index) => ({
    id: template.id,
    kind: "template",
    href: detailHref("template", template.id),
    title: template.title,
    eyebrow: "내 작품",
    summary: template.monetization,
    meta: template.audience,
    chips: template.outline,
    accent: templateAccents[index % templateAccents.length],
  }));
}

function releaseToCard(releases: ReleaseRecord[]): CrackCard[] {
  return releases.map((release, index) => ({
    id: release.id,
    kind: "release",
    href: detailHref("release", release.id),
    title: release.title,
    eyebrow: release.module,
    summary: release.pitch,
    meta: releaseMeta(release),
    chips: [release.projection, release.status],
    accent: releaseAccents[index % releaseAccents.length],
  }));
}

export const crackTabs: Array<{
  id: CrackTabId;
  label: string;
  summary: string;
}> = [
  { id: "story", label: "스토리", summary: "상세와 피드 중심 진입" },
  { id: "character", label: "캐릭터", summary: "짧고 빠른 감정형 대화" },
  { id: "works", label: "내 작품", summary: "작품 허브와 발행 큐" },
  { id: "image", label: "이미지", summary: "장면 생성과 스타일 팩" },
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

export const crackPartyHighlight = {
  badge: "파티챗",
  title: "여럿이 함께 만드는 공식 멀티 스토리",
  summary:
    "참가자 행동을 한 턴씩 모아서 다음 장면을 만드는 파티챗을 홈 상단 핵심 배너와 전용 라이브 룸으로 분리합니다.",
  details: ["초대 코드 입장", "턴별 액션 제출", "AI 결과 요약", "시즌 이벤트"],
};

export function buildCrackSections(
  data: BootstrapPayload,
  session: SessionState | null,
): Record<
  CrackTabId,
  {
    heading: string;
    description: string;
    featured: CrackCard[];
    rails: CrackRail[];
  }
> {
  const workCards = data.feed.map(workToCard);
  const characterCards = characterToCard(data);
  const styleCards = styleToCard(data.styles);
  const templateCards = templateToCard(data.creatorTemplates);
  const releaseCards = releaseToCard(data.releases);

  const storyFeatured = workCards.filter((card) =>
    data.feed.some(
      (work) =>
        work.id === card.id && (work.module === "story" || work.module === "party"),
    ),
  );

  const worksFeatured =
    session && releaseCards.length > 0
      ? [...releaseCards, ...templateCards].slice(0, 3)
      : templateCards.slice(0, 3);

  return {
    story: {
      heading: "지금 가장 먼저 열어볼 스토리",
      description:
        "상세 페이지로 바로 이어지는 카드와 레일을 기준으로 공개 Crack의 메인 피드 동선을 맞췄습니다.",
      featured: storyFeatured.length > 0 ? storyFeatured.slice(0, 3) : workCards.slice(0, 3),
      rails: [
        {
          title: "지금 인기",
          description: "실제 피드와 상세 페이지로 이어지는 주요 작품",
          items: workCards.slice(0, 4),
        },
        {
          title: "공식 큐레이션",
          description: "공식 추천과 파티챗 중심 묶음",
          items: workCards
            .filter(
              (card) =>
                card.eyebrow.includes("공식") || card.summary.includes("파티"),
            )
            .slice(0, 4),
        },
      ],
    },
    character: {
      heading: "짧고 강하게 붙는 캐릭터",
      description:
        "캐릭터 카드를 누르면 전용 상세로 들어가고, 반응 풀과 대화 톤을 확인할 수 있습니다.",
      featured: characterCards,
      rails: [
        {
          title: "오늘의 캐릭터",
          description: "빠른 진입형 캐릭터 카드",
          items: characterCards,
        },
        {
          title: "추천 작품",
          description: "캐릭터와 연동되는 대표 작품",
          items: workCards.filter((card) =>
            data.feed.some(
              (work) => work.id === card.id && work.module === "character",
            ),
          ),
        },
      ],
    },
    works: {
      heading: session ? `${session.name}님의 작품 허브` : "내 작품과 발행 허브",
      description: session
        ? "로그인 세션 기준으로 발행 대기열과 템플릿을 함께 보여줍니다."
        : "로그인하면 내 작품 카드와 발행 큐를 바로 이어서 볼 수 있습니다.",
      featured: worksFeatured,
      rails: [
        {
          title: "발행 준비",
          description: "템플릿과 대기열 묶음",
          items:
            releaseCards.length > 0
              ? [...releaseCards, ...templateCards].slice(0, 4)
              : templateCards,
        },
        {
          title: "수익화 루프",
          description: "스토어와 팬덤 전환형 작품",
          items: workCards.filter((card) =>
            data.feed.some(
              (work) =>
                work.id === card.id &&
                (work.module === "creator" ||
                  work.hooks.some((hook) => hook.includes("팬덤"))),
            ),
          ),
        },
      ],
    },
    image: {
      heading: "이미지 생성과 스타일 탐색",
      description:
        "스타일 카드에서 바로 상세를 보고, 이미지 탭과 생성 플로우로 이어집니다.",
      featured: styleCards,
      rails: [
        {
          title: "스타일 라이브러리",
          description: "공유 카드에 바로 쓸 수 있는 스타일",
          items: styleCards,
        },
        {
          title: "이미지 연동 작품",
          description: "이미지 사용성이 높은 대표 작품",
          items: workCards.filter((card) =>
            data.feed.some(
              (work) =>
                work.id === card.id &&
                work.tags.some((tag) => tag.includes("이미지")),
            ),
          ),
        },
      ],
    },
  };
}

export function resolveCrackDetail(
  data: BootstrapPayload,
  kind: CrackDetailKind,
  id: string,
): CrackDetailEntity | null {
  if (kind === "work") {
    const work = data.feed.find((entry) => entry.id === id);
    if (!work) {
      return null;
    }

    const relatedCharacter = data.characters.find((entry) => entry.id === id);
    const relatedScenario = data.partyScenarios.find(
      (entry) => entry.id === partyScenarioByWorkId[id],
    );
    const relatedTemplate = data.creatorTemplates[0];
    const sections: CrackDetailSection[] = [
      {
        title: "작품 핵심 훅",
        body: `${work.label} · ${work.genre}`,
        items: work.hooks,
      },
      {
        title: "태그와 전환 포인트",
        body: "공개 피드에 노출되는 핵심 태그 묶음입니다.",
        items: work.tags,
      },
    ];

    if (work.module === "story" && data.episodes[0]) {
      sections.push({
        title: data.episodes[0].title,
        body: data.episodes[0].scene,
        items: data.episodes[0].choices.map((choice) => choice.label),
      });
    }

    if (work.module === "character" && relatedCharacter) {
      sections.push({
        title: `${relatedCharacter.name} 미리보기`,
        body: relatedCharacter.opener,
        items: [
          relatedCharacter.responsePools.calm[0],
          relatedCharacter.responsePools.intense[0],
          relatedCharacter.responsePools.intimate[0],
        ].filter(Boolean) as string[],
      });
    }

    if (work.module === "party" && relatedScenario) {
      sections.push({
        title: relatedScenario.title,
        body: relatedScenario.premise,
        items: [...relatedScenario.playerRoles, ...relatedScenario.twists].slice(0, 6),
      });
    }

    if (work.module === "creator" && relatedTemplate) {
      sections.push({
        title: relatedTemplate.title,
        body: relatedTemplate.monetization,
        items: relatedTemplate.outline,
      });
    }

    return {
      kind,
      id,
      tab: resolveTabFromModule(work.module),
      title: work.title,
      eyebrow: work.label,
      summary: work.summary,
      meta: work.genre,
      chips: work.tags,
      accent: workAccents[work.module],
      primaryCta: {
        label:
          work.module === "story"
            ? "스토리 플레이"
            : work.module === "party" && relatedScenario
            ? "파티챗 라이브 룸 열기"
            : workCtaLabel(work.module),
        href:
          work.module === "story"
            ? `/story/${work.id}`
            : work.module === "party" && relatedScenario
            ? `/party?scenario=${relatedScenario.id}`
            : `/?tab=${resolveTabFromModule(work.module)}`,
      },
      secondaryCta: {
        label: "홈 피드로 돌아가기",
        href: `/?tab=${resolveTabFromModule(work.module)}`,
      },
      stats: [
        {
          label: "동시 체험",
          value: work.metrics.concurrent,
          detail: "현재 홈 피드에서 강조하는 실시간 지표",
        },
        {
          label: "전환",
          value: work.metrics.conversion,
          detail: "구매 또는 구독 전환 포인트",
        },
        {
          label: "잔존",
          value: work.metrics.retention,
          detail: "반복 방문을 설명하는 유지 지표",
        },
      ],
      sections,
    };
  }

  if (kind === "character") {
    const character = data.characters.find((entry) => entry.id === id);
    if (!character) {
      return null;
    }

    return {
      kind,
      id,
      tab: "character",
      title: character.name,
      eyebrow: character.role,
      summary: character.vibe || character.opener,
      meta: "캐릭터 프리뷰",
      chips: ["감정형 채팅", "친밀도", "응답 풀"],
      accent: workAccents.character,
      primaryCta: {
        label: "캐릭터 탭으로 돌아가기",
        href: "/?tab=character",
      },
      secondaryCta: {
        label: "홈으로",
        href: "/",
      },
      stats: [
        {
          label: "오프너",
          value: character.opener ? "활성" : "기본형",
          detail: "첫 진입 메시지 구성 상태",
        },
        {
          label: "대화 톤",
          value: "3개",
          detail: "차분함, 긴장감, 친밀도 톤 응답 풀",
        },
        {
          label: "반응 수",
          value: `${Object.values(character.responsePools).flat().length}개`,
          detail: "로컬 fallback 포함 응답 샘플 수",
        },
      ],
      sections: [
        {
          title: "첫 진입 대사",
          body: character.opener,
          items: [],
        },
        {
          title: "대화 톤 샘플",
          body: "실제 채팅 응답 풀에서 가져온 샘플입니다.",
          items: [
            character.responsePools.calm[0],
            character.responsePools.intense[0],
            character.responsePools.intimate[0],
          ].filter(Boolean) as string[],
        },
      ],
    };
  }

  if (kind === "style") {
    const style = data.styles.find((entry) => entry.id === id);
    if (!style) {
      return null;
    }

    return {
      kind,
      id,
      tab: "image",
      title: style.name,
      eyebrow: "이미지 스타일",
      summary: style.summary,
      meta: style.palette,
      chips: style.palette.split(",").map((entry) => entry.trim()),
      accent: style.gradient,
      primaryCta: {
        label: "이미지 탭으로 돌아가기",
        href: "/?tab=image",
      },
      secondaryCta: {
        label: "홈으로",
        href: "/",
      },
      stats: [
        {
          label: "팔레트",
          value: style.palette,
          detail: "스타일 카드에 사용되는 대표 색상 조합",
        },
        {
          label: "용도",
          value: "공유 카드",
          detail: "썸네일, 이벤트 카드, 장면 컷에 적합",
        },
        {
          label: "연동",
          value: "스토리/캐릭터",
          detail: "콘텐츠 카드와 함께 노출되는 스타일 팩",
        },
      ],
      sections: [
        {
          title: "스타일 설명",
          body: style.summary,
          items: style.palette.split(",").map((entry) => entry.trim()),
        },
      ],
    };
  }

  if (kind === "template") {
    const template = data.creatorTemplates.find((entry) => entry.id === id);
    if (!template) {
      return null;
    }

    return {
      kind,
      id,
      tab: "works",
      title: template.title,
      eyebrow: "작품 템플릿",
      summary: templateMeta(template),
      meta: template.module,
      chips: template.outline,
      accent:
        templateAccents[
          data.creatorTemplates.findIndex((entry) => entry.id === template.id) %
            templateAccents.length
        ],
      primaryCta: {
        label: "내 작품 탭으로 돌아가기",
        href: "/?tab=works",
      },
      secondaryCta: {
        label: "홈으로",
        href: "/",
      },
      stats: [
        {
          label: "대상",
          value: template.audience,
          detail: "이 템플릿이 겨냥하는 핵심 사용자층",
        },
        {
          label: "수익화",
          value: template.monetization,
          detail: "대표 과금 루프",
        },
        {
          label: "구성",
          value: `${template.outline.length}단계`,
          detail: "기본 아웃라인 수",
        },
      ],
      sections: [
        {
          title: "기본 아웃라인",
          body: template.monetization,
          items: template.outline,
        },
      ],
    };
  }

  if (kind === "release") {
    const release = data.releases.find((entry) => entry.id === id);
    if (!release) {
      return null;
    }

    return {
      kind,
      id,
      tab: "works",
      title: release.title,
      eyebrow: release.module,
      summary: release.pitch,
      meta: releaseMeta(release),
      chips: [release.status, release.projection],
      accent:
        releaseAccents[
          data.releases.findIndex((entry) => entry.id === release.id) %
            releaseAccents.length
        ],
      primaryCta: {
        label: "내 작품 탭으로 돌아가기",
        href: "/?tab=works",
      },
      secondaryCta: {
        label: "홈으로",
        href: "/",
      },
      stats: [
        {
          label: "판매가",
          value: `₩${Number(release.price).toLocaleString("ko-KR")}`,
          detail: "설정된 기본 판매 가격",
        },
        {
          label: "상태",
          value: release.status,
          detail: "현재 발행 파이프라인 위치",
        },
        {
          label: "예상",
          value: release.projection,
          detail: "현재 저장된 예상 수익 문구",
        },
      ],
      sections: [
        {
          title: "작품 소개",
          body: release.pitch,
          items: [release.projection, release.status],
        },
      ],
    };
  }

  return null;
}
