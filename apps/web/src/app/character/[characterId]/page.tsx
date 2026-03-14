import { CharacterChatShell } from "@/components/character-chat-shell";
import { fetchBootstrapPayloadServer } from "@/lib/projectr-api";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{
    characterId: string;
  }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { characterId } = await params;
  const data = await fetchBootstrapPayloadServer();
  const character = data.characters.find((entry) => entry.id === characterId);

  if (!character) {
    return {
      title: "Character",
    };
  }

  return {
    title: `${character.name} Chat`,
    description: character.vibe || character.opener,
  };
}

export default async function CharacterPage({ params }: PageProps) {
  const { characterId } = await params;
  const data = await fetchBootstrapPayloadServer();
  const character = data.characters.find((entry) => entry.id === characterId);

  if (!character) {
    notFound();
  }

  const relatedWork =
    data.feed.find((entry) => entry.id === character.id) ??
    data.feed.find((entry) => entry.module === "character");

  return <CharacterChatShell character={character} relatedWork={relatedWork} />;
}
