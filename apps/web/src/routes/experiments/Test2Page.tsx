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

export function Test2Page() {
  const { setPhase } = useExperimentSession();
  useEffect(() => {
    setPhase("test2");
  }, [setPhase]);
  return (
    <main className={styles.page}>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>2 回目テスト</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <p>
            1 回目と同じ手順で 3 和音を録音します。練習の成果を発揮してください。
          </p>
          <IonText color="warning">
            <p className={styles.warning}>
              ピッチが多少不安定でも、明確に音を外していなければやり直さないでください。
            </p>
          </IonText>
        </IonCardContent>
      </IonCard>
      <RecordingSession
        phase="test2"
        nextPath="/experiments/post-survey/"
        doneStatus="test2-done"
      />
    </main>
  );
}
