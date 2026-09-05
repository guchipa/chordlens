import { useAtom, useSetAtom } from "jotai";
import { useMemo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonCheckbox,
  IonButton,
  IonNote,
  IonText,
} from "@ionic/react";

import { PITCH_NAME_LIST, OCTAVE_NUM_LIST } from "@chordlens/core/constants";
import { FormSchema, type Pitch } from "@chordlens/core/types";
import { MicInputButton } from "@/components/feature/MicInputButton";
import { pitchListAtom, addOrUpdatePitchAtom } from "@/lib/store";

import styles from "./PitchSettingForm.module.css";

// フォーム入力型（zodスキーマの入力型を明示的に取得）
type PitchFormInput = z.input<typeof FormSchema>;

export function PitchSettingForm() {
  const [currentPitchList] = useAtom(pitchListAtom);
  const addOrUpdatePitch = useSetAtom(addOrUpdatePitchAtom);

  const form = useForm<PitchFormInput, unknown, Pitch>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      pitchName: "",
      octaveNum: 4,
      isRoot: false,
      enabled: true,
    },
  });

  // マイク入力で検出した音を即時追加するハンドラ
  const handleMicDetect = useCallback(
    (pitch: Pitch) => {
      addOrUpdatePitch({ ...pitch, isRoot: false, enabled: true });
    },
    [addOrUpdatePitch]
  );

  const isRootChecked = form.watch("isRoot");
  const hasRoot = useMemo(
    () => currentPitchList?.some((p) => p.isRoot) ?? false,
    [currentPitchList]
  );

  const showRootWarning = useMemo(() => {
    // 根音がなく、かつ isRoot がチェックされていなければ警告
    return !hasRoot && !isRootChecked;
  }, [hasRoot, isRootChecked]);

  const pitchName = form.watch("pitchName");
  const octaveNum = form.watch("octaveNum");

  const isFormValid = useMemo(() => {
    return (
      pitchName !== undefined &&
      pitchName !== "" &&
      PITCH_NAME_LIST.includes(pitchName) &&
      octaveNum !== undefined &&
      !isNaN(octaveNum)
    );
  }, [pitchName, octaveNum]);

  const onSubmit = useCallback(
    (data: Pitch) => {
      addOrUpdatePitch(data);
      form.reset({
        pitchName: undefined,
        octaveNum: 4,
        isRoot: false,
        enabled: true,
      });
    },
    [addOrUpdatePitch, form]
  );

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>評価する音の追加</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <IonList>
            <Controller
              control={form.control}
              name="pitchName"
              render={({ field, fieldState }) => (
                <>
                  <IonItem lines="none">
                    <IonSelect
                      label="音名"
                      placeholder="音名を選んでください"
                      value={field.value || undefined}
                      onIonChange={(e) => field.onChange(e.detail.value)}
                    >
                      {PITCH_NAME_LIST.map((name) => (
                        <IonSelectOption key={name} value={name}>
                          {name}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </IonItem>
                  {fieldState.error?.message && (
                    <IonNote color="danger" className={styles.fieldNote}>
                      {fieldState.error.message}
                    </IonNote>
                  )}
                </>
              )}
            />

            <Controller
              control={form.control}
              name="octaveNum"
              render={({ field, fieldState }) => (
                <>
                  <IonItem lines="none">
                    <IonSelect
                      label="オクターブ"
                      placeholder="オクターブ番号を選んでください"
                      value={field.value ?? undefined}
                      onIonChange={(e) =>
                        field.onChange(Number(e.detail.value))
                      }
                    >
                      {OCTAVE_NUM_LIST.map((num) => (
                        <IonSelectOption key={num} value={num}>
                          {num}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                    <div slot="end">
                      <MicInputButton onDetect={handleMicDetect} />
                    </div>
                  </IonItem>
                  {fieldState.error?.message && (
                    <IonNote color="danger" className={styles.fieldNote}>
                      {fieldState.error.message}
                    </IonNote>
                  )}
                </>
              )}
            />

            <Controller
              control={form.control}
              name="isRoot"
              render={({ field }) => (
                <IonItem lines="none">
                  <IonCheckbox
                    checked={!!field.value}
                    disabled={hasRoot}
                    labelPlacement="end"
                    onIonChange={(e) => field.onChange(e.detail.checked)}
                  >
                    根音として設定
                  </IonCheckbox>
                  {hasRoot && (
                    <IonNote slot="helper">
                      根音は既に設定されています。2つ目の根音は設定できません。
                    </IonNote>
                  )}
                </IonItem>
              )}
            />

            <Controller
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <IonItem lines="none">
                  <IonCheckbox
                    checked={field.value !== false}
                    labelPlacement="end"
                    onIonChange={(e) => field.onChange(e.detail.checked)}
                  >
                    計測に含める
                  </IonCheckbox>
                  <IonNote slot="helper">
                    チェックを外すと、この音は解析の対象外となります（根音としての計算には使用されます）。
                  </IonNote>
                </IonItem>
              )}
            />
          </IonList>

          {showRootWarning && (
            <p className={styles.warning}>
              <IonText color="danger">
                警告: 根音が設定されていません。解析には根音の指定が必要です。
              </IonText>
            </p>
          )}

          <IonButton expand="block" type="submit" disabled={!isFormValid}>
            設定した音を追加
          </IonButton>
        </form>
      </IonCardContent>
    </IonCard>
  );
}
