import { useAtom } from "jotai";
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonNote,
} from "@ionic/react";

import {
  FEEDBACK_TYPES,
  FEEDBACK_TYPE_LABELS,
  FEEDBACK_TYPE_DESCRIPTIONS,
} from "@chordlens/core/constants";
import type { FeedbackType } from "@chordlens/core/constants";
import { feedbackTypeAtom } from "@/lib/store";

export function FeedbackTypeSelector() {
  const [feedbackType, setFeedbackType] = useAtom(feedbackTypeAtom);

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>フィードバック形式</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <IonItem lines="none">
          <IonSelect
            label="フィードバック形式"
            value={feedbackType}
            onIonChange={(e) =>
              setFeedbackType(e.detail.value as FeedbackType)
            }
          >
            {FEEDBACK_TYPES.map((type) => (
              <IonSelectOption key={type} value={type}>
                {FEEDBACK_TYPE_LABELS[type]}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>
        <IonNote>{FEEDBACK_TYPE_DESCRIPTIONS[feedbackType]}</IonNote>
      </IonCardContent>
    </IonCard>
  );
}
