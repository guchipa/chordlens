import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  type ChordKey,
} from "@/lib/experiments/constants";
import {
  getRootFreqHz,
  type InstrumentKey,
} from "@/lib/experiments/instrumentChordMap";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { updatePairStatus } from "@/lib/firebase/session";

export function PracticeWithoutTuner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useExperimentSession();
  const [selectedChord, setSelectedChord] = useState<ChordKey>("Bb");
  const [navigated, setNavigated] = useState(false);

  const instruments: [InstrumentKey | null, InstrumentKey | null] = [
    (session?.members[0]?.instrument ?? null) as InstrumentKey | null,
    (session?.members[1]?.instrument ?? null) as InstrumentKey | null,
  ];
  
  const cond = searchParams.get("cond");
  const pairId = searchParams.get("pairId");

  const handleComplete = async () => {
    if (navigated) return;
    setNavigated(true);
    if (session && isFirebaseConfigured()) {
      try {
        await updatePairStatus(session.pairId, "practice-done");
      } catch (err) {
        console.error(
          "[PracticeWithoutTuner] failed to update status:",
          err
        );
      }
    }
    const queryString = new URLSearchParams({ cond: cond || "", pairId: pairId || "" }).toString();
    navigate(`/experiments/test2/?${queryString}`);
  };

  const { remainingMs, isRunning, start } = useCountdownTimer({
    durationMs: PRACTICE_MS,
    onComplete: handleComplete,
  });

  useEffect(() => {
    start();
  }, [start]);

  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  return (
    <Card>
      <CardHeader>
        <CardTitle>練習 (10分)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-900">
          <p className="font-medium">この練習では市販のチューナーを使用しないでください。</p>
          <p className="mt-1">
            視覚的なピッチフィードバックは用いず、ペアの聴覚のみを頼りに B♭ メジャー / C マイナー / F7
            の和音を 10 分間練習してください。
          </p>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">残り時間</p>
          <p className="text-6xl font-bold tabular-nums">
            {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
          </p>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">根音再生 (任意)</p>
          <p className="mb-2 text-xs text-muted-foreground">
            音を確かめたい時だけトグルで根音を鳴らせます。常時再生する必要はありません。
          </p>
          <div className="flex flex-wrap gap-2">
            {CHORD_KEYS.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={c === selectedChord ? "default" : "outline"}
                onClick={() => setSelectedChord(c)}
              >
                {CHORD_LABELS[c]}
              </Button>
            ))}
          </div>
          <div className="mt-2">
            <RootPlaybackToggle
              key={selectedChord}
              frequencyHz={getRootFreqHz(CHORD_ROOT_KEY[selectedChord], instruments)}
              label={`${CHORD_LABELS[selectedChord]} の根音 (${CHORD_ROOT_KEY[selectedChord]})`}
            />
          </div>
        </div>

        {!isRunning && remainingMs > 0 && (
          <Button onClick={start} className="w-full">
            タイマー再開
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
