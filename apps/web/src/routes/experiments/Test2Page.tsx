import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordingSession } from "@/components/feature/experiments/RecordingSession";
import { useExperimentSession } from "@/lib/hooks/experiments/useExperimentSession";

export function Test2Page() {
  const { setPhase } = useExperimentSession();
  useEffect(() => {
    setPhase("test2");
  }, [setPhase]);
  return (
    <main className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>2 回目テスト</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            1 回目と同じ手順で 3 和音を録音します。練習の成果を発揮してください。
          </p>
          <p className="font-medium text-amber-700">
            ピッチが多少不安定でも、明確に音を外していなければやり直さないでください。
          </p>
        </CardContent>
      </Card>
      <RecordingSession
        phase="test2"
        nextPath="/experiments/post-survey/"
        doneStatus="test2-done"
      />
    </main>
  );
}
