"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  SavedItemRecord,
  SessionState,
  UserProfile,
} from "@/lib/projectr-api";

const gradientPresets = [
  {
    label: "Neon Orbit",
    value: "linear-gradient(135deg, #1a2840 0%, #214d72 45%, #f76b1c 100%)",
  },
  {
    label: "Creator Mint",
    value: "linear-gradient(135deg, #14242e 0%, #1f5c68 48%, #ffd36b 100%)",
  },
  {
    label: "Ops Pulse",
    value: "linear-gradient(135deg, #151c32 0%, #304c90 52%, #78f0d5 100%)",
  },
];

const genreOptions = [
  "Story",
  "Character",
  "Party Chat",
  "Fantasy",
  "Romance",
  "Mystery",
  "Sci-Fi",
  "Martial Arts",
];

export type ProfileDraft = {
  name: string;
  focus: string;
  handle: string;
  bio: string;
  location: string;
  avatarGradient: string;
  favoriteGenres: string[];
};

type ProfileSheetProps = {
  isOpen: boolean;
  session: SessionState | null;
  profile: UserProfile | null;
  savedItems: SavedItemRecord[];
  pending: boolean;
  message: string;
  onClose: () => void;
  onSave: (draft: ProfileDraft) => void;
  onRemoveSavedItem: (item: SavedItemRecord) => void;
};

function createDraft(profile: UserProfile | null, session: SessionState | null): ProfileDraft {
  return {
    name: profile?.name ?? session?.name ?? "",
    focus: profile?.focus ?? session?.focus ?? "",
    handle: profile?.handle ?? session?.name.toLowerCase().replace(/\s+/g, "-") ?? "",
    bio: profile?.bio ?? "",
    location: profile?.location ?? "",
    avatarGradient:
      profile?.avatarGradient ?? gradientPresets[0].value,
    favoriteGenres: profile?.favoriteGenres ?? ["Story", "Character"],
  };
}

export function ProfileSheet({
  isOpen,
  session,
  profile,
  savedItems,
  pending,
  message,
  onClose,
  onSave,
  onRemoveSavedItem,
}: ProfileSheetProps) {
  const [draft, setDraft] = useState<ProfileDraft>(() => createDraft(profile, session));

  useEffect(() => {
    setDraft(createDraft(profile, session));
  }, [profile, session]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="max-h-full w-full max-w-5xl overflow-auto rounded-[2rem] border border-white/10 bg-[#0d121c] p-6 shadow-2xl shadow-black/40">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[#ffb978]">
              Profile and Save
            </div>
            <h2 className="mt-2 text-3xl font-semibold text-white">
              프로필과 저장 라이브러리
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70"
          >
            닫기
          </button>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="rounded-[1.8rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-5">
            <div
              className="rounded-[1.8rem] p-5"
              style={{ backgroundImage: draft.avatarGradient }}
            >
              <div className="text-xs uppercase tracking-[0.16em] text-white/70">
                {profile?.membership ?? session?.membership ?? "Explorer"}
              </div>
              <div className="mt-2 text-3xl font-semibold text-white">{draft.name || "Profile"}</div>
              <div className="mt-2 text-sm text-white/78">@{draft.handle || "projectr-user"}</div>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/84">
                {draft.bio || "프로필 소개가 아직 없습니다."}
              </p>
            </div>

            <div className="mt-5 grid gap-3">
              <input
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="이름"
                className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
              />
              <input
                value={draft.handle}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, handle: event.target.value }))
                }
                placeholder="핸들"
                className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
              />
              <input
                value={draft.location}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, location: event.target.value }))
                }
                placeholder="위치"
                className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
              />
              <textarea
                value={draft.focus}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, focus: event.target.value }))
                }
                placeholder="현재 집중하는 플레이/창작/운영 포인트"
                className="min-h-24 rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
              />
              <textarea
                value={draft.bio}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, bio: event.target.value }))
                }
                placeholder="프로필 소개"
                className="min-h-28 rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
              />
            </div>

            <div className="mt-5">
              <div className="text-xs uppercase tracking-[0.16em] text-white/50">
                Avatar
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {gradientPresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        avatarGradient: preset.value,
                      }))
                    }
                    className={`rounded-[1.2rem] border p-3 text-left ${
                      draft.avatarGradient === preset.value
                        ? "border-[#f76b1c] bg-[rgba(247,107,28,0.12)]"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div
                      className="h-16 rounded-[1rem]"
                      style={{ backgroundImage: preset.value }}
                    />
                    <div className="mt-3 text-sm font-semibold text-white">{preset.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <div className="text-xs uppercase tracking-[0.16em] text-white/50">
                Favorite Genres
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {genreOptions.map((genre) => {
                  const active = draft.favoriteGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          favoriteGenres: active
                            ? current.favoriteGenres.filter((entry) => entry !== genre)
                            : [...current.favoriteGenres, genre].slice(0, 6),
                        }))
                      }
                      className={`rounded-full px-3 py-2 text-xs ${
                        active
                          ? "bg-[rgba(247,107,28,0.18)] text-[#fff0dc]"
                          : "border border-white/10 bg-white/5 text-white/70"
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
            </div>

            {message && (
              <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/74">
                {message}
              </div>
            )}

            <button
              type="button"
              onClick={() => onSave(draft)}
              disabled={pending}
              className="mt-5 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#121722] disabled:opacity-60"
            >
              {pending ? "저장 중..." : "프로필 저장"}
            </button>
          </section>

          <section className="rounded-[1.8rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-white/50">
                  Saved Library
                </div>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  저장한 작품과 카드
                </h3>
              </div>
              <div className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/70">
                {savedItems.length} saved
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {savedItems.length === 0 && (
                <div className="rounded-[1.3rem] border border-dashed border-white/12 px-4 py-5 text-sm text-white/54">
                  아직 저장된 항목이 없습니다. 홈 카드나 상세 화면에서 저장을 누르면 여기에 쌓입니다.
                </div>
              )}
              {savedItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[1.4rem] border border-white/10 bg-[#0d1520] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link href={item.href} className="block">
                        <div className="text-sm font-semibold text-white">{item.title}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[#ffb978]">
                          {item.meta}
                        </div>
                        <p className="mt-3 text-sm leading-7 text-white/66">
                          {item.summary}
                        </p>
                      </Link>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.chips.map((chip) => (
                          <span
                            key={chip}
                            className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/70"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveSavedItem(item)}
                      className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/72"
                    >
                      제거
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
