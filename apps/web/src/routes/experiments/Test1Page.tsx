import { useEffect } from "react";
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonText,
} from "@ionic/react";
import { RecordingSession } from "@/components/feature/experiments/RecordingSession";
import { useExperimentSession } from "@/lib/hooks/experiments/useExperimentSession";

import styles from "./TestPage.module.css";

export function Test1Page() {
  const { setPhase } = useExperimentSession();
  useEffect(() => {
    setPhase("test1");
  }, [setPhase]);
  return (
    <main className={styles.page}>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>1 回目テスト</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <p>
            B♭ メジャー / C マイナー / F7 の 3 和音について、各 5 秒間の演奏を録音します。
          </p>
          <p>
            ボタンを押すと 4 秒のカウントダウンが始まり、その間にシステムが根音を再生します。
            根音が鳴り続けている間、ペアそれぞれの担当音を演奏してください。
          </p>
          <IonText color="warning">
            <p className={styles.warning}>
              ピッチが多少不安定でも、明確に音を外していなければやり直さないでください。
            </p>
          </IonText>
        </IonCardContent>
      </IonCard>
      <RecordingSession
        phase="test1"
        nextPath="/experiments/practice/"
        doneStatus="test1-done"
      />
    </main>
  );
}
