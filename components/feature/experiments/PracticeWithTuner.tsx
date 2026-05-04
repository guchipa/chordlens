"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAtomValue, useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCountdownTimer } from "@/lib/hooks/experiments/useCountdownTimer";
import { RootPlaybackToggle } from "./RootPlaybackToggle";
import { useExperimentSession } from "@/lib/hooks/experiments/useExperimentSession";
import {
  CHORD_KEYS,
  CHORD_LABELS,
  CHORD_ROOT_KEY,
  PRACTICE_MS,
  ROOT_FREQ_HZ,
  type ChordKey,
} from "@/lib/experiments/constants";
import {
  installExperimentPresets,
  restoreUserPresets,
} from "@/lib/experiments/presetGuard";
import { useAudioAnalysis } from "@/lib/hooks/useAudioAnalysis";
import { UnifiedFeedback } from "@/components/feedback/UnifiedFeedback";
import { CentDisplay } from "@/components/feature/CentDisplay";
import {
  pitchListAtom,
  loadPresetAtom,
  evalRangeCentsAtom,
  a4FreqAtom,
  evalThresholdAtom,
  fftSizeAtom,
  smoothingTimeConstantAtom,
  holdEnabledAtom,
  feedbackTypeAtom,
} from "@/lib/store";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { updatePairStatus } from "@/lib/firebase/session";

export function PracticeWithTuner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useExperimentSession();
  const loadPreset = useSetAtom(loadPresetAtom);
  const currentPitchList = useAtomValue(pitchListAtom);
  const evalRangeCents = useAtomValue(evalRangeCentsAtom);
  const a4Freq = useAtomValue(a4FreqAtom);
  const evalThreshold = useAtomValue(evalThresholdAtom);
  const fftSize = useAtomValue(fftSizeAtom);
  const smoothingTimeConstant = useAtomValue(smoothingTimeConstantAtom);
  const holdEnabled = useAtomValue(holdEnabledAtom);
  const feedbackType = useAtomValue(feedbackTypeAtom);

  const [selectedChord, setSelectedChord] = useState<ChordKey>("Bb");
  const [navigated, setNavigated] = useState(false);
  
  const cond = searchParams.get("cond");
  const pairId = searchParams.get("pairId");

  const {
    isProcessing,
    analysisResult,
    startProcessing,
    stopProcessing,
  } = useAudioAnalysis({
    currentPitchList,
    evalRangeCents,
    a4Freq,
    evalThreshold,
    fftSize,
    smoothingTimeConstant,
  });

  // マウント時：ユーザーの presets を退避し、実験 preset を注入
  useEffect(() => {
    if (!session?.pairId || !session.chordPitches) return;
    installExperimentPresets(session.pairId, session.chordPitches);
    // pitchListAtom に Bb をセット
    loadPreset(session.chordPitches.Bb);
    return () => {
      stopProcessing();
      restoreUserPresets(session.pairId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.pairId]);

  const handleComplete = async () => {
    if (navigated) return;
    setNavigated(true);
    stopProcessing();
    if (session && isFirebaseConfigured()) {
      try {
        await updatePairStatus(session.pairId, "practice-done");
      } catch (err) {
        console.error(
          "[PracticeWithTuner] failed to update status:",
          err
        );
      }
    }
    if (session?.pairId) restoreUserPresets(session.pairId);
    const queryString = new URLSearchParams({ cond: cond || "", pairId: pairId || "" }).toString();
    router.push(`/experiments/test2/?${queryString}`);
  };

  const { remainingMs, start } = useCountdownTimer({
    durationMs: PRACTICE_MS,
    onComplete: handleComplete,
  });

  useEffect(() => {
    start();
  }, [start]);

  const handleSelectChord = (chord: ChordKey) => {
    if (!session?.chordPitches) return;
    setSelectedChord(chord);
    loadPreset(session.chordPitches[chord]);
  };

  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  return (
    <Card>
      <CardHeader>
        <CardTitle>練習 (10分) — ChordLens あり</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-900">
          ChordLens の視覚フィードバックを参考に、純正律のピッチに合わせる練習を行ってください。
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">残り時間</p>
          <p className="text-6xl font-bold tabular-nums">
            {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
          </p>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">練習する和音</p>
          <div className="flex flex-wrap gap-2">
            {CHORD_KEYS.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={c === selectedChord ? "default" : "outline"}
                onClick={() => handleSelectChord(c)}
              >
                {CHORD_LABELS[c]}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={isProcessing ? stopProcessing : startProcessing}>
            {isProcessing ? "解析停止" : "解析開始"}
          </Button>
          <RootPlaybackToggle
            key={selectedChord}
            frequencyHz={ROOT_FREQ_HZ[CHORD_ROOT_KEY[selectedChord]]}
            label={`根音 (${CHORD_ROOT_KEY[selectedChord]})`}
          />
        </div>

        <UnifiedFeedback
          feedbackType={feedbackType}
          analysisData={currentPitchList.map((pitch, index) => ({
            pitch,
            deviation: analysisResult?.[index] ?? null,
          }))}
          evalRangeCents={evalRangeCents}
          a4Freq={a4Freq}
          holdEnabled={holdEnabled}
        />

        <CentDisplay
          pitchList={currentPitchList}
          a4Freq={a4Freq}
          title="現在の和音"
        />
      </CardContent>
    </Card>
  );
}
