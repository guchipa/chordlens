import { useAtom } from "jotai";
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonRange,
  IonLabel,
  IonNote,
  IonAccordionGroup,
  IonAccordion,
  IonToggle,
} from "@ionic/react";

import {
  evalRangeCentsAtom,
  a4FreqAtom,
  fftSizeAtom,
  smoothingTimeConstantAtom,
  sensitivityAtom,
  holdEnabledAtom,
  experimentModeAtom,
  pitchAlgorithmAtom,
  swipeBandwidthCentsAtom,
} from "@/lib/store";
import {
  SENSITIVITY_MIN,
  SENSITIVITY_MAX,
  PITCH_ALGORITHMS,
  PITCH_ALGORITHM_LABELS,
  PITCH_ALGORITHM_DESCRIPTIONS,
} from "@chordlens/core/constants";

import styles from "./SettingsForm.module.css";

const FFT_SIZE_OPTIONS = [1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072];

export function SettingsForm() {
  // Jotai atoms を直接使用
  const [evalRange, setEvalRange] = useAtom(evalRangeCentsAtom);
  const [a4Freq, setA4Freq] = useAtom(a4FreqAtom);
  const [sensitivity, setSensitivity] = useAtom(sensitivityAtom);
  const [fftSize, setFftSize] = useAtom(fftSizeAtom);
  const [smoothingTimeConstant, setSmoothingTimeConstant] = useAtom(
    smoothingTimeConstantAtom
  );
  const [holdEnabled, setHoldEnabled] = useAtom(holdEnabledAtom);
  const [experimentMode, setExperimentMode] = useAtom(experimentModeAtom);
  const [pitchAlgorithm, setPitchAlgorithm] = useAtom(pitchAlgorithmAtom);
  const [swipeBandwidthCents, setSwipeBandwidthCents] = useAtom(
    swipeBandwidthCentsAtom
  );

  const handleEvalRangeChange = (value: string | null | undefined) => {
    const parsed = parseInt(value ?? "", 10);
    if (!isNaN(parsed)) {
      setEvalRange(parsed);
    }
  };

  const handleA4FreqChange = (value: string | null | undefined) => {
    const parsed = parseInt(value ?? "", 10);
    if (!isNaN(parsed)) {
      setA4Freq(parsed);
    }
  };

  const handleSwipeBandwidthChange = (value: string | null | undefined) => {
    const parsed = parseInt(value ?? "", 10);
    if (!isNaN(parsed) && parsed >= 100) {
      setSwipeBandwidthCents(parsed);
    }
  };

  const handleSmoothingTimeConstantChange = (
    value: string | null | undefined
  ) => {
    const parsed = parseFloat(value ?? "");
    if (!isNaN(parsed) && parsed >= 0.0 && parsed <= 1.0) {
      setSmoothingTimeConstant(parsed);
    }
  };

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>設定</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <IonList>
          <IonItem lines="none">
            <IonSelect
              label="アルゴリズム"
              value={pitchAlgorithm}
              onIonChange={(e) =>
                setPitchAlgorithm(
                  e.detail.value as typeof pitchAlgorithm
                )
              }
            >
              {PITCH_ALGORITHMS.map((alg) => (
                <IonSelectOption key={alg} value={alg}>
                  {PITCH_ALGORITHM_LABELS[alg]}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
          <IonNote className={styles.fieldNote}>
            {PITCH_ALGORITHM_DESCRIPTIONS[pitchAlgorithm]}
          </IonNote>

          {pitchAlgorithm === "swipe" && (
            <>
              <IonItem lines="none">
                <IonInput
                  label="バンドパス幅 (セント)"
                  labelPlacement="stacked"
                  type="number"
                  inputmode="decimal"
                  value={swipeBandwidthCents}
                  min={100}
                  max={4800}
                  step="100"
                  onIonInput={(e) =>
                    handleSwipeBandwidthChange(e.detail.value)
                  }
                />
              </IonItem>
              <IonNote className={styles.fieldNote}>
                各構成音の周囲をこの幅でバンドパスフィルタします。広いほど倍音を含みます。
              </IonNote>
            </>
          )}

          <IonItem lines="none">
            <IonInput
              label="音程評価範囲 (セント)"
              labelPlacement="stacked"
              type="number"
              inputmode="decimal"
              value={evalRange}
              min={1}
              max={100}
              onIonInput={(e) => handleEvalRangeChange(e.detail.value)}
            />
          </IonItem>
          <IonNote className={styles.fieldNote}>
            ±この値の範囲で音程のズレを評価します。
          </IonNote>

          <IonItem lines="none">
            <IonInput
              label="A4周波数 (Hz)"
              labelPlacement="stacked"
              type="number"
              inputmode="decimal"
              value={a4Freq}
              min={430}
              max={450}
              onIonInput={(e) => handleA4FreqChange(e.detail.value)}
            />
          </IonItem>
          <IonNote className={styles.fieldNote}>
            基準となるA4の周波数を設定します。
          </IonNote>

          <IonItem lines="none">
            <IonRange
              aria-label="音量感度"
              min={SENSITIVITY_MIN}
              max={SENSITIVITY_MAX}
              step={1}
              pin={true}
              value={sensitivity}
              onIonChange={(e) =>
                setSensitivity(e.detail.value as number)
              }
            >
              <IonLabel slot="start">低（大きい音のみ）</IonLabel>
              <IonLabel slot="end">高（小さい音も検出）</IonLabel>
            </IonRange>
          </IonItem>
          <IonNote className={styles.fieldNote}>
            小さい音も検出したい場合は感度を上げてください。
          </IonNote>

          <IonAccordionGroup className={styles.accordionGroup}>
            <IonAccordion value="advanced">
              <IonItem slot="header" lines="none">
                <IonLabel>高度な設定</IonLabel>
              </IonItem>
              <div slot="content" className={styles.accordionContent}>
                <IonItem lines="none">
                  <IonSelect
                    label="FFTサイズ"
                    value={fftSize}
                    onIonChange={(e) =>
                      setFftSize(Number(e.detail.value))
                    }
                  >
                    {FFT_SIZE_OPTIONS.map((size) => (
                      <IonSelectOption key={size} value={size}>
                        {size}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>
                <IonNote className={styles.fieldNote}>
                  周波数分解能に影響します (2のべき乗)。
                </IonNote>

                <IonItem lines="none">
                  <IonInput
                    label="平滑化定数"
                    labelPlacement="stacked"
                    type="number"
                    inputmode="decimal"
                    value={smoothingTimeConstant}
                    min={0.0}
                    max={1.0}
                    step="0.1"
                    onIonInput={(e) =>
                      handleSmoothingTimeConstantChange(e.detail.value)
                    }
                  />
                </IonItem>
                <IonNote className={styles.fieldNote}>
                  スペクトルの変化の滑らかさを調整します (0.0-1.0)。
                </IonNote>

                <IonItem lines="none">
                  <IonToggle
                    checked={holdEnabled}
                    labelPlacement="end"
                    onIonChange={(e) =>
                      setHoldEnabled(e.detail.checked)
                    }
                  >
                    表示保持（ホールド）
                  </IonToggle>
                </IonItem>
                <IonNote className={styles.fieldNote}>
                  音が途切れても約250ms表示を保持します。
                </IonNote>

                <IonItem lines="none">
                  <IonToggle
                    checked={experimentMode}
                    labelPlacement="end"
                    onIonChange={(e) =>
                      setExperimentMode(e.detail.checked)
                    }
                  >
                    実験用機能を使う
                  </IonToggle>
                </IonItem>
                <IonNote className={styles.fieldNote}>
                  ログ記録・周波数観測パネルを表示します。
                </IonNote>
              </div>
            </IonAccordion>
          </IonAccordionGroup>
        </IonList>
      </IonCardContent>
    </IonCard>
  );
}
