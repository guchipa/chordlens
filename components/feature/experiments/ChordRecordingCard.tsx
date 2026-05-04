"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  COUNTDOWN_MS,
  RECORD_MS,
  ROOT_FREQ_HZ,
  CHORD_ROOT_KEY,
  CHORD_LABELS,
  type ChordKey,
} from "@/lib/experiments/constants";
import { useRecordingWithAnalysis } from "@/lib/hooks/experiments/useRecordingWithAnalysis";
import type { Pitch } from "@/lib/types";
import type { ChordPartAssignments } from "@/lib/experiments/types";

type Stage = "idle" | "countdown" | "recording" | "review" | "submitting";

export interface ChordRecordingResult {
  audioBlob: Blob;
  csvText: string;
  mimeType: string;
  durationMs: number;
  rootFreqHz: number;
}

interface Props {
  chord: ChordKey;
  pitchList: Pitch[];
  partAssignment: ChordPartAssignments;
  evalRangeCents: number;
  a4Freq: number;
  evalThreshold: number;
  fftSize: number;
  smoothingTimeConstant: number;
  /** 採用 (final にする) を押されたら呼ばれる。 */
  onAccept: (result: ChordRecordingResult) => void | Promise<void>;
  /** やり直しの度に呼ばれる。録音は完了している。 */
  onRetry: (result: ChordRecordingResult) => void | Promise<void>;
}

export function ChordRecordingCard(props: Props) {
  const { chord } = props;
  const recorder = useRecordingWithAnalysis({
    pitchList: props.pitchList,
    evalRangeCents: props.evalRangeCents,
    a4Freq: props.a4Freq,
    evalThreshold: props.evalThreshold,
    fftSize: props.fftSize,
    smoothingTimeConstant: props.smoothingTimeConstant,
  });

  const [stage, setStage] = useState<Stage>("idle");
  const [remainMs, setRemainMs] = useState<number>(COUNTDOWN_MS);
  const [error, setError] = useState<string | null>(null);
  const [pendingResult, setPendingResult] =
    useState<ChordRecordingResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const rafRef = useRef<number | null>(null);
  const tStartRef = useRef<number | null>(null);
  const stageRef = useRef<Stage>("idle");

  // setStage はバッチングで非同期にコミットされるため、その前に走り得る
  // requestAnimationFrame コールバックから参照しても古い値になる可能性がある。
  // ref を同期的に更新するため、必ずこのヘルパー経由で stage を変更する。
  const advanceStage = (next: Stage) => {
    stageRef.current = next;
    setStage(next);
  };

  const rootKey = CHORD_ROOT_KEY[chord];
  const rootFreqHz = ROOT_FREQ_HZ[rootKey];
  const assignment = props.partAssignment[chord];

  const cancelRaf = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cancelRaf();
      recorder.release();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const beginCountdown = async () => {
    setError(null);
    setPendingResult(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    const ok = await recorder.prepare();
    if (!ok) {
      setError(
        "マイクへのアクセスを許可してください。ブラウザの設定を確認したら再度ボタンを押してください。"
      );
      return;
    }
    recorder.startRoot(rootFreqHz);
    advanceStage("countdown");
    setRemainMs(COUNTDOWN_MS);
    tStartRef.current = performance.now();

    const tickCountdown = () => {
      if (stageRef.current !== "countdown") return;
      const now = performance.now();
      const elapsed = now - (tStartRef.current ?? now);
      const remain = Math.max(0, COUNTDOWN_MS - elapsed);
      setRemainMs(remain);
      if (remain <= 0) {
        beginRecording();
        return;
      }
      rafRef.current = requestAnimationFrame(tickCountdown);
    };
    cancelRaf();
    rafRef.current = requestAnimationFrame(tickCountdown);
  };

  const beginRecording = () => {
    advanceStage("recording");
    setRemainMs(RECORD_MS);
    tStartRef.current = performance.now();
    const started = recorder.startRecording();
    if (!started) {
      setError("録音の開始に失敗しました。もう一度お試しください。");
      recorder.stopRoot();
      advanceStage("idle");
      return;
    }
    const tickRecording = () => {
      if (stageRef.current !== "recording") return;
      const now = performance.now();
      const elapsed = now - (tStartRef.current ?? now);
      const remain = Math.max(0, RECORD_MS - elapsed);
      setRemainMs(remain);
      if (remain <= 0) {
        finishRecording();
        return;
      }
      rafRef.current = requestAnimationFrame(tickRecording);
    };
    cancelRaf();
    rafRef.current = requestAnimationFrame(tickRecording);
  };

  const finishRecording = async () => {
    cancelRaf();
    recorder.stopRoot();
    const result = await recorder.stopRecording();
    if (!result) {
      setError("録音の停止に失敗しました。もう一度お試しください。");
      advanceStage("idle");
      return;
    }
    const enriched: ChordRecordingResult = { ...result, rootFreqHz };
    setPendingResult(enriched);
    const url = URL.createObjectURL(result.audioBlob);
    setPreviewUrl(url);
    advanceStage("review");
  };

  const handleAccept = async () => {
    if (!pendingResult) return;
    advanceStage("submitting");
    try {
      await props.onAccept(pendingResult);
    } catch (err) {
      console.error("[ChordRecordingCard] onAccept threw:", err);
      setError("採用処理に失敗しました。再度お試しください。");
      advanceStage("review");
    }
  };

  const handleRetry = async () => {
    if (pendingResult) {
      // 失敗扱いとして送信しておく
      try {
        await props.onRetry(pendingResult);
      } catch (err) {
        console.error("[ChordRecordingCard] onRetry threw:", err);
      }
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPendingResult(null);
    beginCountdown();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{CHORD_LABELS[chord]}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-900">
          <p>
            <span className="font-medium">担当音 A：</span>
            {assignment.memberA}

            <span className="font-medium">担当音 B：</span>
            {assignment.memberB}
          </p>
          <p className="mt-1 text-xs">
            根音 ({rootKey}) はシステムが再生します。
            ピッチが多少不安定でも、音を外していなければやり直さないでください。
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {stage === "idle" && (
          <Button onClick={beginCountdown} className="w-full">
            録音を開始
          </Button>
        )}

        {(stage === "countdown" || stage === "recording") && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {stage === "countdown" ? "カウントダウン" : "録音中..."}
            </p>
            <p className="text-5xl font-bold tabular-nums">
              {(remainMs / 1000).toFixed(1)}s
            </p>
            {stage === "recording" && (
              <p className="mt-2 text-sm text-red-600">● Recording</p>
            )}
          </div>
        )}

        {stage === "review" && pendingResult && (
          <div className="space-y-3">
            <p className="text-sm">
              録音が完了しました。聴き直して問題なければ「採用」を、
              音を外したなどの失敗があれば「やり直し」を押してください。
            </p>
            {previewUrl && (
              <audio src={previewUrl} controls className="w-full" />
            )}
            <div className="flex gap-2">
              <Button onClick={handleAccept} className="flex-1">
                この録音を採用
              </Button>
              <Button
                onClick={handleRetry}
                variant="outline"
                className="flex-1"
              >
                やり直し
              </Button>
            </div>
          </div>
        )}

        {stage === "submitting" && (
          <p className="text-center text-sm text-muted-foreground">
            アップロード中…
          </p>
        )}
      </CardContent>
    </Card>
  );
}
