"use client";

import React from "react";
import { useAtom, useAtomValue } from "jotai";
import { Lock, LockOpen } from "lucide-react";
import { chordKey, nameChord } from "@chordlens/core/feedback/chordName";
import type { Pitch } from "@chordlens/core/types";
import { Button } from "@/components/ui/button";
import {
  chordFollowEnabledAtom,
  chordFollowLockedAtom,
  chordFollowPendingAtom,
  chordFollowStatusAtom,
} from "@/lib/store";
import { cn } from "@/lib/utils";

interface ChordHeaderProps {
  pitchList: Pitch[];
}

type HeaderStatus = "manual" | "waiting" | "listening" | "tracking" | "pending" | "locked";

const STATUS_LABELS: Record<HeaderStatus, string> = {
  manual: "手動で指定した和音",
  waiting: "解析を開始すると自動追従します",
  listening: "自動追従: 楽器音を待機中",
  tracking: "自動追従中",
  pending: "和音を判定中…",
  locked: "和音を固定中",
};

const STATUS_DOT: Record<HeaderStatus, string> = {
  manual: "bg-gray-300",
  waiting: "bg-gray-300",
  listening: "bg-gray-400",
  tracking: "bg-blue-500",
  pending: "bg-amber-500 animate-pulse motion-reduce:animate-none",
  locked: "bg-gray-700",
};

/**
 * フィードバックの上に置く和音名ヘッダ。1 台を全員で見る前提で大きく表示する。
 * 自動推定の結果 (和音名・根音) を常に見せ、推定が正しいかをその場で確かめられる
 * ようにする。自動追従中は和音の固定ボタンを出す。
 */
export const ChordHeader: React.FC<ChordHeaderProps> = ({ pitchList }) => {
  const followEnabled = useAtomValue(chordFollowEnabledAtom);
  const followStatus = useAtomValue(chordFollowStatusAtom);
  const pending = useAtomValue(chordFollowPendingAtom);
  const [locked, setLocked] = useAtom(chordFollowLockedAtom);

  const chord = nameChord(pitchList);
  const root = pitchList.find((p) => p.isRoot && p.enabled);

  let status: HeaderStatus;
  if (!followEnabled) status = "manual";
  else if (locked) status = "locked";
  else if (followStatus === "idle") status = "waiting";
  else if (pending) status = "pending";
  else status = followStatus;

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white px-4 py-2 shadow-sm">
      <div className="min-w-0 grow">
        <div className="flex items-baseline gap-3">
          <span
            // 和音が変わるたびに再マウントして、変化に気づけるよう軽く出し直す
            key={chordKey(pitchList)}
            data-testid="chord-symbol"
            className="animate-in fade-in zoom-in-95 truncate text-4xl leading-tight font-bold tracking-tight text-gray-900 duration-300 motion-reduce:animate-none"
          >
            {chord?.symbol ?? (chord ? `${chord.rootName} (?)` : "—")}
          </span>
          {root && (
            <span className="shrink-0 text-base text-gray-600">
              根音 <span className="font-semibold text-gray-900">{`${root.pitchName}${root.octaveNum}`}</span>
            </span>
          )}
        </div>
        <p role="status" className="flex items-center gap-1.5 text-sm text-gray-600">
          <span aria-hidden="true" className={cn("size-2 rounded-full", STATUS_DOT[status])} />
          {STATUS_LABELS[status]}
        </p>
      </div>
      {followEnabled && (
        <Button
          type="button"
          variant={locked ? "default" : "outline"}
          className="h-11 shrink-0 gap-1.5 px-3 text-sm"
          aria-pressed={locked}
          onClick={() => setLocked(!locked)}
        >
          {locked ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
          {locked ? "固定中" : "固定"}
        </Button>
      )}
    </div>
  );
};
