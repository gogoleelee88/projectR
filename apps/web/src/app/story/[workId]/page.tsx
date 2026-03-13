import { StoryPlayerShell } from "@/components/story-player-shell";
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

  if (!work) {
    return {
      title: "Story Player",
    };
  }

  return {
    title: `${work.title} · Story Player`,
    description: work.summary,
  };
}

export default async function StoryPlayerPage({ params }: PageProps) {
  const { workId } = await params;
  const data = await fetchBootstrapPayloadServer();
  const work = data.feed.find((entry) => entry.id === workId && entry.module === "story");

  if (!work || data.episodes.length === 0) {
    notFound();
  }

  return <StoryPlayerShell work={work} episodes={data.episodes} />;
}
