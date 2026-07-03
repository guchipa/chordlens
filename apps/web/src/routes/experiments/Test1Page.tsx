import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordingSession } from "@/components/feature/experiments/RecordingSession";
import { useExperimentSession } from "@/lib/hooks/experiments/useExperimentSession";

export function Test1Page() {
  const { setPhase } = useExperimentSession();
  useEffect(() => {
    setPhase("test1");
  }, [setPhase]);
  return (
    <main className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1 回目テスト</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            B♭ メジャー / C マイナー / F7 の 3 和音について、各 5 秒間の演奏を録音します。
          </p>
          <p>
            ボタンを押すと 4 秒のカウントダウンが始まり、その間にシステムが根音を再生します。
            根音が鳴り続けている間、ペアそれぞれの担当音を演奏してください。
          </p>
          <p className="font-medium text-amber-700">
            ピッチが多少不安定でも、明確に音を外していなければやり直さないでください。
          </p>
        </CardContent>
      </Card>
      <RecordingSession
        phase="test1"
        nextPath="/experiments/practice/"
        doneStatus="test1-done"
      />
    </main>
  );
}
