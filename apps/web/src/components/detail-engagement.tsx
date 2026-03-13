"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CrackDetailKind } from "@/data/crack-clone";
import {
  AUTH_TOKEN_KEY,
  requestAuthorizedApi,
  type SavedItemRecord,
} from "@/lib/projectr-api";

type DetailEngagementProps = {
  kind: CrackDetailKind;
  id: string;
};

export function DetailEngagement({ kind, id }: DetailEngagementProps) {
  const [token, setToken] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (!storedToken) {
      return;
    }
    setToken(storedToken);
  }, []);

  useEffect(() => {
    if (!token) {
      setSaved(false);
      return;
    }

    let alive = true;

    const loadSaves = async () => {
      const items = await requestAuthorizedApi<SavedItemRecord[]>(
        "/library/saves",
        token,
      );
      if (!alive || !items) {
        return;
      }
      setSaved(items.some((item) => item.itemKind === kind && item.itemId === id));
    };

    void loadSaves();

    return () => {
      alive = false;
    };
  }, [id, kind, token]);

  const toggleSave = async () => {
    if (!token) {
      return;
    }

    setPending(true);
    setMessage("");

    if (saved) {
      const response = await requestAuthorizedApi(
        `/library/saves/${kind}/${id}`,
        token,
        { method: "DELETE" },
      );
      setPending(false);
      if (!response) {
        setMessage("저장을 해제하지 못했습니다.");
        return;
      }
      setSaved(false);
      setMessage("저장에서 제거했습니다.");
      return;
    }

    const response = await requestAuthorizedApi<SavedItemRecord>(
      "/library/saves",
      token,
      {
        method: "POST",
        body: JSON.stringify({
          itemKind: kind,
          itemId: id,
        }),
      },
    );
    setPending(false);
    if (!response) {
      setMessage("저장에 실패했습니다.");
      return;
    }
    setSaved(true);
    setMessage("프로필 저장 라이브러리에 추가했습니다.");
  };

  if (!token) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href="/?login=1"
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/72"
        >
          로그인 후 저장
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => {
          void toggleSave();
        }}
        disabled={pending}
        className={`rounded-full px-4 py-2 text-sm ${
          saved
            ? "bg-[rgba(247,107,28,0.18)] text-[#fff0dc]"
            : "border border-white/10 bg-white/5 text-white/72"
        } disabled:opacity-60`}
      >
        {pending ? "처리 중..." : saved ? "저장됨" : "저장"}
      </button>
      {message && <div className="text-sm text-white/64">{message}</div>}
    </div>
  );
}
