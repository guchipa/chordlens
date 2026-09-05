import { useAtom, useSetAtom } from "jotai";
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonChip,
  IonIcon,
  IonLabel,
  IonButton,
  IonNote,
} from "@ionic/react";
import { closeCircle } from "ionicons/icons";

// 根音を推定する関数
import { estimateRoot } from "@chordlens/core/audio_analysis/rootEstimation";

// Jotai atoms
import {
  pitchListAtom,
  removePitchAtom,
  clearPitchListAtom,
} from "@/lib/store";

import styles from "./PitchList.module.css";

export function PitchList() {
  const [currentPitchList, setCurrentPitchList] = useAtom(pitchListAtom);
  const removePitch = useSetAtom(removePitchAtom);
  const clearPitchList = useSetAtom(clearPitchListAtom);

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>現在の評価対象音</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        {currentPitchList.length === 0 ? (
          <IonNote>
            まだ評価する音がありません。上のフォームから追加してください。
          </IonNote>
        ) : (
          <div className={styles.chipRow}>
            {currentPitchList.map((data, index) => {
              const label = `${data.pitchName}${data.octaveNum}${data.isRoot ? " (R)" : ""
                }${data.enabled === false ? " (OFF)" : ""}`;
              return (
                <IonChip
                  key={`${data.pitchName}-${data.octaveNum}-${index}`}
                  color={data.enabled !== false ? "tertiary" : "medium"}
                  outline={data.enabled !== false}
                >
                  <IonLabel>
                    <span className={data.isRoot ? styles.rootLabel : undefined}>
                      {label}
                    </span>
                  </IonLabel>
                  <IonIcon
                    icon={closeCircle}
                    role="button"
                    aria-label={`${data.pitchName}${data.octaveNum} を削除`}
                    onClick={() => removePitch(index)}
                  />
                </IonChip>
              );
            })}
            <div className={styles.actions}>
              <IonButton
                fill="outline"
                size="small"
                onClick={() => estimateRoot(currentPitchList, setCurrentPitchList)}
                disabled={currentPitchList.length === 0}
              >
                根音を推定する
              </IonButton>
              <IonButton
                fill="outline"
                size="small"
                onClick={() => clearPitchList()}
              >
                全てクリア
              </IonButton>
            </div>
          </div>
        )}
      </IonCardContent>
    </IonCard>
  );
}
