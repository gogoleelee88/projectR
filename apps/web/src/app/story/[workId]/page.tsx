import { StoryPlayerShell } from "@/components/story-player-shell";
import { getStoryCampaign } from "@/data/story-campaigns";
import { fetchBootstrapPayloadServer } from "@/lib/projectr-api";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{
    workId: string;
  }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { workId } = await params;
  const data = await fetchBootstrapPayloadServer();
  const work = data.feed.find((entry) => entry.id === workId && entry.module === "story");
  const campaign = getStoryCampaign(workId, work ?? null, data.episodes);

  if (!work || !campaign) {
    return { title: "Story Player" };
  }

  return {
    title: `${work.title} - ${campaign.seasonLabel}`,
    description: campaign.logline,
  };
}

export default async function StoryPlayerPage({ params }: PageProps) {
  const { workId } = await params;
  const data = await fetchBootstrapPayloadServer();
  const work = data.feed.find((entry) => entry.id === workId && entry.module === "story");
  const campaign = getStoryCampaign(workId, work ?? null, data.episodes);

  if (!work || !campaign) {
    notFound();
  }

  return <StoryPlayerShell work={work} campaign={campaign} />;
}
