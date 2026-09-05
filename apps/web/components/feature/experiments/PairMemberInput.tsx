import { useFormContext, Controller } from "react-hook-form";
import {
  IonList,
  IonListHeader,
  IonLabel,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonNote,
} from "@ionic/react";
import {
  INSTRUMENT_KEYS,
  INSTRUMENT_LABELS,
} from "@/lib/experiments/instrumentChordMap";
import {
  JUST_INTONATION_FAMILIARITY_LABELS,
  type PreSurveyInput,
} from "@/lib/experiments/surveySchemas";

const FIVE_LABELS: Record<number, string> = {
  1: "1: まったくそう思わない",
  2: "2: あまりそう思わない",
  3: "3: どちらともいえない",
  4: "4: ややそう思う",
  5: "5: とてもそう思う",
};

interface Props {
  /** memberA / memberB */
  member: "memberA" | "memberB";
  title: string;
}

export function PairMemberInput({ member, title }: Props) {
  const { control } = useFormContext<PreSurveyInput>();

  return (
    <IonList>
      <IonListHeader>
        <IonLabel>{title}</IonLabel>
      </IonListHeader>

      <Controller
        control={control}
        name={`${member}.instrument` as const}
        render={({ field, fieldState }) => (
          <>
            <IonItem lines="none">
              <IonSelect
                label="担当楽器"
                labelPlacement="stacked"
                placeholder="楽器を選択"
                value={(field.value as string | undefined) ?? undefined}
                onIonChange={(e) => field.onChange(e.detail.value)}
              >
                {INSTRUMENT_KEYS.map((key) => (
                  <IonSelectOption key={key} value={key}>
                    {INSTRUMENT_LABELS[key]}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
            {fieldState.error?.message && (
              <IonNote color="danger">{fieldState.error.message}</IonNote>
            )}
          </>
        )}
      />

      <Controller
        control={control}
        name={`${member}.experienceYears` as const}
        render={({ field, fieldState }) => (
          <>
            <IonItem lines="none">
              <IonInput
                label="演奏歴 (年)"
                labelPlacement="stacked"
                type="number"
                inputmode="numeric"
                min={0}
                max={80}
                value={(field.value as number | undefined) ?? ""}
                onIonInput={(e) => field.onChange(e.detail.value)}
              />
            </IonItem>
            <IonNote>1 年未満の場合は実験対象外となります。</IonNote>
            {fieldState.error?.message && (
              <IonNote color="danger">{fieldState.error.message}</IonNote>
            )}
          </>
        )}
      />

      <Controller
        control={control}
        name={`${member}.pitchMatchingSkill` as const}
        render={({ field, fieldState }) => (
          <>
            <IonItem lines="none">
              <IonSelect
                label="音程（ピッチ）を耳で合わせるのは得意だと思う"
                labelPlacement="stacked"
                placeholder="5段階で選択"
                value={field.value ?? undefined}
                onIonChange={(e) => field.onChange(Number(e.detail.value))}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <IonSelectOption key={n} value={n}>
                    {FIVE_LABELS[n]}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
            {fieldState.error?.message && (
              <IonNote color="danger">{fieldState.error.message}</IonNote>
            )}
          </>
        )}
      />

      <Controller
        control={control}
        name={`${member}.chordEvaluationSkill` as const}
        render={({ field, fieldState }) => (
          <>
            <IonItem lines="none">
              <IonSelect
                label="和音を聞いて「合っている / 濁っている」が分かる"
                labelPlacement="stacked"
                placeholder="5段階で選択"
                value={field.value ?? undefined}
                onIonChange={(e) => field.onChange(Number(e.detail.value))}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <IonSelectOption key={n} value={n}>
                    {FIVE_LABELS[n]}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
            {fieldState.error?.message && (
              <IonNote color="danger">{fieldState.error.message}</IonNote>
            )}
          </>
        )}
      />

      <Controller
        control={control}
        name={`${member}.justIntonationFamiliarity` as const}
        render={({ field, fieldState }) => (
          <>
            <IonItem lines="none">
              <IonSelect
                label="純正律という概念を知っている"
                labelPlacement="stacked"
                placeholder="最も近いものを選択"
                value={(field.value as string | undefined) ?? undefined}
                onIonChange={(e) => field.onChange(e.detail.value)}
              >
                {(
                  Object.keys(
                    JUST_INTONATION_FAMILIARITY_LABELS
                  ) as (keyof typeof JUST_INTONATION_FAMILIARITY_LABELS)[]
                ).map((key) => (
                  <IonSelectOption key={key} value={key}>
                    {JUST_INTONATION_FAMILIARITY_LABELS[key]}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
            {fieldState.error?.message && (
              <IonNote color="danger">{fieldState.error.message}</IonNote>
            )}
          </>
        )}
      />
    </IonList>
  );
}
