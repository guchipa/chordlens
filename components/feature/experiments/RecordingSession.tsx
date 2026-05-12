"use client";

import { useState } from "react";
import { useAtomValue } from "jotai";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChordRecordingCard,
  type ChordRecordingResult,
} from "./ChordRecordingCard";
import { useExperimentSession } from "@/lib/hooks/experiments/useExperimentSession";
import { uploadAttempt } from "@/lib/firebase/upload";
import { markAttemptFinal, updatePairStatus } from "@/lib/firebase/session";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { CHORD_KEYS, type ChordKey } from "@/lib/experiments/constants";
import { type InstrumentKey } from "@/lib/experiments/instrumentChordMap";
import {
  evalRangeCentsAtom,
  a4FreqAtom,
  evalThresholdAtom,
  fftSizeAtom,
  smoothingTimeConstantAtom,
} from "@/lib/store";

interface Props {
  phase: "test1" | "test2";
  /** 完了時の遷移先 (例: "/experiments/practice/" or "/experiments/post-survey/")。 */
  nextPath: string;
  /** Firestore に書き込む phase 完了マーカー。 */
  doneStatus: "test1-done" | "test2-done";
}

export function RecordingSession({ phase, nextPath, doneStatus }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cond = searchParams.get("cond") ?? "";
  const pairId = searchParams.get("pairId") ?? "";
  const {
    session,
    incrementAttempt,
    finalizeAttempt,
    queuePendingUpload,
  } = useExperimentSession();

  const evalRangeCents = useAtomValue(evalRangeCentsAtom);
  const a4Freq = useAtomValue(a4FreqAtom);
  const evalThreshold = useAtomValue(evalThresholdAtom);
  const fftSize = useAtomValue(fftSizeAtom);
  const smoothingTimeConstant = useAtomValue(smoothingTimeConstantAtom);

  const [chordIndex, setChordIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const instruments: [InstrumentKey | null, InstrumentKey | null] = [
    (session?.members[0]?.instrument ?? null) as InstrumentKey | null,
    (session?.members[1]?.instrument ?? null) as InstrumentKey | null,
  ];

  if (!session || !session.partAssignment || !session.chordPitches) {
    return (
      <div className="rounded-md bg-yellow-50 p-4 text-sm">
        セッション情報が見つかりません。最初から始めてください。
      </div>
    );
  }

  const chord: ChordKey | null = CHORD_KEYS[chordIndex] ?? null;

  const handleResult = async (
    result: ChordRecordingResult,
    isFinal: boolean
  ): Promise<void> => {
    if (!chord) return;
    const attempt = incrementAttempt(phase, chord);

    if (!isFirebaseConfigured()) {
      // Firebase 未設定 (開発環境) では pendingUploads にだけ積む
      const url = URL.createObjectURL(result.audioBlob);
      queuePendingUpload({
        id: `${session.pairId}-${phase}-${chord}-${attempt}`,
        pairId: session.pairId,
        phase,
        chord,
        attempt,
        final: isFinal,
        mimeType: result.mimeType,
        durationMs: result.durationMs,
        rootFreqHz: result.rootFreqHz,
        audioBlobUrl: url,
        csvText: result.csvText,
        createdAt: Date.now(),
      });
      console.warn(
        "[RecordingSession] Firebase 未設定。録音は queue に保留されました。"
      );
      return;
    }

    try {
      const csvBlob = new Blob(["﻿" + result.csvText], {
        type: "text/csv;charset=utf-8",
      });
      await uploadAttempt({
        pairId: session.pairId,
        phase,
        chord,
        attempt,
        final: isFinal,
        audioBlob: result.audioBlob,
        csvBlob,
        mimeType: result.mimeType,
        durationMs: result.durationMs,
        rootFreqHz: result.rootFreqHz,
      });
      if (isFinal) {
        finalizeAttempt(phase, chord, attempt);
        await markAttemptFinal(session.pairId, phase, chord, attempt);
      }
    } catch (err) {
      console.error("[RecordingSession] upload failed:", err);
      const url = URL.createObjectURL(result.audioBlob);
      queuePendingUpload({
        id: `${session.pairId}-${phase}-${chord}-${attempt}`,
        pairId: session.pairId,
        phase,
        chord,
        attempt,
        final: isFinal,
        mimeType: result.mimeType,
        durationMs: result.durationMs,
        rootFreqHz: result.rootFreqHz,
        audioBlobUrl: url,
        csvText: result.csvText,
        createdAt: Date.now(),
      });
      throw err;
    }
  };

  const handleAccept = async (result: ChordRecordingResult) => {
    await handleResult(result, true);
    if (chordIndex + 1 < CHORD_KEYS.length) {
      setChordIndex(chordIndex + 1);
    } else {
      setSubmitting(true);
      if (isFirebaseConfigured()) {
        try {
          await updatePairStatus(session.pairId, doneStatus);
        } catch (err) {
          console.error(
            "[RecordingSession] failed to update pair status:",
            err
          );
        }
      }
      const queryString = new URLSearchParams({ cond, pairId }).toString();
      router.push(`${nextPath}?${queryString}`);
    }
  };

  const handleRetry = async (result: ChordRecordingResult) => {
    await handleResult(result, false);
  };

  if (!chord) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        全ての和音が完了しました。次のページへ移動します…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {chordIndex + 1} / {CHORD_KEYS.length} 和音目
      </p>
      <ChordRecordingCard
        key={`${phase}-${chord}`}
        chord={chord}
        pitchList={session.chordPitches[chord]}
        partAssignment={session.partAssignment}
        instruments={instruments}
        evalRangeCents={evalRangeCents}
        a4Freq={a4Freq}
        evalThreshold={evalThreshold}
        fftSize={fftSize}
        smoothingTimeConstant={smoothingTimeConstant}
        onAccept={handleAccept}
        onRetry={handleRetry}
      />
      {submitting && (
        <p className="text-center text-sm text-muted-foreground">
          完了処理中…
        </p>
      )}
      <p className="text-center text-xs text-muted-foreground">
        ※ ピッチが多少悪くてもやり直さないでください。明確に音を外した場合のみ「やり直し」を選んでください。
      </p>
    </div>
  );
}
