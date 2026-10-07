import { useAtomValue } from "jotai";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonText,
} from "@ionic/react";

import { useAudioAnalysis } from "@/lib/hooks/useAudioAnalysis";
import { useChordFollow } from "@/lib/hooks/useChordFollow";

import { AppFooter } from "@/components/layout/AppFooter";
import { AnalysisControl } from "@/components/feature/AnalysisControl";
import { UnifiedFeedback } from "@/components/feedback/UnifiedFeedback";
import { CentDisplay } from "@/components/feature/CentDisplay";
import { SettingsDrawer } from "@/components/layout/SettingsDrawer";
import { ExperimentModePanel } from "@/components/feature/experiment/ExperimentModePanel";

import styles from "./App.module.css";

import {
  pitchListAtom,
  evalRangeCentsAtom,
  a4FreqAtom,
  evalThresholdAtom,
  fftSizeAtom,
  smoothingTimeConstantAtom,
  holdEnabledAtom,
  experimentModeAtom,
  feedbackTypeAtom,
  pitchAlgorithmAtom,
  swipeBandwidthCentsAtom,
} from "@/lib/store";

export function App() {
  const currentPitchList = useAtomValue(pitchListAtom);
  const evalRangeCents = useAtomValue(evalRangeCentsAtom);
  const a4Freq = useAtomValue(a4FreqAtom);
  const evalThreshold = useAtomValue(evalThresholdAtom);
  const fftSize = useAtomValue(fftSizeAtom);
  const smoothingTimeConstant = useAtomValue(smoothingTimeConstantAtom);
  const holdEnabled = useAtomValue(holdEnabledAtom);
  const experimentMode = useAtomValue(experimentModeAtom);
  const feedbackType = useAtomValue(feedbackTypeAtom);
  const pitchAlgorithm = useAtomValue(pitchAlgorithmAtom);
  const swipeBandwidthCents = useAtomValue(swipeBandwidthCentsAtom);

  const {
    isProcessing,
    analysisResult,
    centDeviations,
    peakSearchDebug,
    comparisonResults,
    startProcessing,
    stopProcessing,
    audioNodesRef,
  } = useAudioAnalysis({
    currentPitchList,
    evalRangeCents,
    a4Freq,
    evalThreshold,
    fftSize,
    smoothingTimeConstant,
    pitchAlgorithm,
    swipeBandwidthCents,
    enableComparison: experimentMode,
    enablePeakSearchDebug: experimentMode,
    peakSearchDebugFps: experimentMode ? 12 : undefined,
  });

  // 構成音の自動追従ループ (トグルは SettingsDrawer 内、状態は Jotai atom)。
  // 解析実行中のみ、チューナー本体の音声グラフを共有して推定を行う
  useChordFollow({ active: isProcessing, audioNodesRef });

  return (
    <>
      <SettingsDrawer />
      <IonPage id="main-content">
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonMenuButton aria-label="設定を開く" />
            </IonButtons>
            <IonTitle>和音チューナー</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonContent className="ion-padding">
          <div className={styles.main}>
            {experimentMode && (
              <ExperimentModePanel
                isProcessing={isProcessing}
                analysisResult={analysisResult}
                centDeviations={centDeviations}
                peakSearchDebug={peakSearchDebug}
                comparisonResults={comparisonResults}
              />
            )}

            <UnifiedFeedback
              feedbackType={feedbackType}
              analysisData={currentPitchList.map((pitch, index) => ({
                pitch,
                deviation: analysisResult?.[index] ?? null,
              }))}
              evalRangeCents={evalRangeCents}
              a4Freq={a4Freq}
              holdEnabled={holdEnabled}
            />

            <AnalysisControl
              isProcessing={isProcessing}
              startProcessing={startProcessing}
              stopProcessing={stopProcessing}
              isPitchListEmpty={currentPitchList.length === 0}
            />

            <CentDisplay
              pitchList={currentPitchList}
              a4Freq={a4Freq}
              title="和音情報"
            />
          </div>
        </IonContent>
        <AppFooter />
      </IonPage>
    </>
  );
}
