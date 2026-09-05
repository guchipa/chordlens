import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonRange,
  IonLabel,
  IonText,
} from "@ionic/react";
import { useCountdownTimer } from "@/lib/hooks/experiments/useCountdownTimer";
import { RootPlaybackToggle } from "./RootPlaybackToggle";
import { useExperimentSession } from "@/lib/hooks/experiments/useExperimentSession";
import {
  CHORD_KEYS,
  CHORD_LABELS,
  CHORD_ROOT_KEY,
  PRACTICE_MS,
  type ChordKey,
} from "@/lib/experiments/constants";
import {
  getRootFreqHz,
  type InstrumentKey,
} from "@/lib/experiments/instrumentChordMap";
import {
  installExperimentPresets,
  restoreUserPresets,
} from "@/lib/experiments/presetGuard";
import { useAudioAnalysis } from "@/lib/hooks/useAudioAnalysis";
import { UnifiedFeedback } from "@/components/feedback/UnifiedFeedback";
import { CentDisplay } from "@/components/feature/CentDisplay";
import {
  pitchListAtom,
  loadPresetAtom,
  evalRangeCentsAtom,
  a4FreqAtom,
  evalThresholdAtom,
  fftSizeAtom,
  smoothingTimeConstantAtom,
  holdEnabledAtom,
  feedbackTypeAtom,
  sensitivityAtom,
} from "@/lib/store";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { updatePairStatus } from "@/lib/firebase/session";

import styles from "./PracticeWithTuner.module.css";

export function PracticeWithTuner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useExperimentSession();
  const loadPreset = useSetAtom(loadPresetAtom);
  const currentPitchList = useAtomValue(pitchListAtom);
  const evalRangeCents = useAtomValue(evalRangeCentsAtom);
  const a4Freq = useAtomValue(a4FreqAtom);
  const evalThreshold = useAtomValue(evalThresholdAtom);
  const fftSize = useAtomValue(fftSizeAtom);
  const smoothingTimeConstant = useAtomValue(smoothingTimeConstantAtom);
  const holdEnabled = useAtomValue(holdEnabledAtom);
  const feedbackType = useAtomValue(feedbackTypeAtom);

  const [sensitivity, setSensitivity] = useAtom(sensitivityAtom);

  const instruments: [InstrumentKey | null, InstrumentKey | null] = [
    (session?.members[0]?.instrument ?? null) as InstrumentKey | null,
    (session?.members[1]?.instrument ?? null) as InstrumentKey | null,
  ];

  const [showInstructions, setShowInstructions] = useState(true);
  const [selectedChord, setSelectedChord] = useState<ChordKey>("Bb");
  const [navigated, setNavigated] = useState(false);

  const cond = searchParams.get("cond");
  const pairId = searchParams.get("pairId");

  const {
    isProcessing,
    analysisResult,
    startProcessing,
    stopProcessing,
  } = useAudioAnalysis({
    currentPitchList,
    evalRangeCents,
    a4Freq,
    evalThreshold,
    fftSize,
    smoothingTimeConstant,
  });

  // マウント時：ユーザーの presets を退避し、実験 preset を注入
  useEffect(() => {
    if (!session?.pairId || !session.chordPitches) return;
    installExperimentPresets(session.pairId, session.chordPitches);
    // pitchListAtom に Bb をセット
    loadPreset(session.chordPitches.Bb);
    return () => {
      stopProcessing();
      restoreUserPresets(session.pairId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.pairId]);

  const handleComplete = async () => {
    if (navigated) return;
    setNavigated(true);
    stopProcessing();
    if (session && isFirebaseConfigured()) {
      try {
        await updatePairStatus(session.pairId, "practice-done");
      } catch (err) {
        console.error(
          "[PracticeWithTuner] failed to update status:",
          err
        );
      }
    }
    if (session?.pairId) restoreUserPresets(session.pairId);
    const queryString = new URLSearchParams({ cond: cond || "", pairId: pairId || "" }).toString();
    navigate(`/experiments/test2/?${queryString}`);
  };

  const { remainingMs, start } = useCountdownTimer({
    durationMs: PRACTICE_MS,
    onComplete: handleComplete,
  });

  const handleStartPractice = () => {
    setShowInstructions(false);
    start();
  };

  const handleSelectChord = (chord: ChordKey) => {
    if (!session?.chordPitches) return;
    setSelectedChord(chord);
    loadPreset(session.chordPitches[chord]);
  };

  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  if (showInstructions) {
    return (
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>練習の前に — ChordLens の使い方</IonCardTitle>
        </IonCardHeader>
        <IonCardContent className={styles.content}>
          <div className={styles.instructionsSection}>
            <section>
              <p className={styles.sectionTitle}>ChordLens とは</p>
              <IonText color="medium">
                <p>
                  ChordLens はあなたのピッチをリアルタイムで解析し、目標ピッチとのずれを視覚的に表示するツールです。練習中はこのフィードバックを参考に、純正律のピッチに合わせていきます。
                </p>
              </IonText>
            </section>
            <section>
              <p className={styles.sectionTitle}>操作方法</p>
              <IonText color="medium">
                <ol>
                  <li>練習したい和音のボタンを選択します（B♭ major / C minor / F7）。</li>
                  <li>「根音再生」ボタンで根音を鳴らし、音程の基準を確認します。</li>
                  <li>「解析開始」ボタンを押してから歌い始めると、画面にピッチの偏差が表示されます。</li>
                  <li>フィードバック表示を見ながらピッチを調整してください。</li>
                </ol>
              </IonText>
            </section>
            <section>
              <p className={styles.sectionTitle}>フィードバックの見方</p>
              <IonText color="medium">
                <p>
                  各パートのバーが中央（0 cent）に近いほどピッチが合っています。上にずれているときは少し低めに、下にずれているときは少し高めに調整してください。
                </p>
              </IonText>
            </section>
            <section>
              <p className={styles.sectionTitle}>練習時間</p>
              <IonText color="medium">
                <p>
                  練習時間は <strong>10 分間</strong> です。3つの和音を自由に切り替えながら練習してください。時間になると自動的に次のフェーズへ進みます。
                </p>
              </IonText>
            </section>
          </div>
          <IonButton expand="block" onClick={handleStartPractice}>
            練習を始める
          </IonButton>
        </IonCardContent>
      </IonCard>
    );
  }

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>練習 (10分) — ChordLens あり</IonCardTitle>
      </IonCardHeader>
      <IonCardContent className={styles.content}>
        <div className={styles.infoBox}>
          ChordLens の視覚フィードバックを参考に、純正律のピッチに合わせる練習を行ってください。
        </div>

        <div className={styles.timerWrap}>
          <IonText color="medium">
            <p>残り時間</p>
          </IonText>
          <p className={styles.timerValue}>
            {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
          </p>
        </div>

        <div>
          <p className={styles.sectionTitle}>練習する和音</p>
          <div className={styles.chordButtons}>
            {CHORD_KEYS.map((c) => (
              <IonButton
                key={c}
                size="small"
                fill={c === selectedChord ? "solid" : "outline"}
                onClick={() => handleSelectChord(c)}
              >
                {CHORD_LABELS[c]}
              </IonButton>
            ))}
          </div>
        </div>

        <div className={styles.controlsRow}>
          <IonButton onClick={isProcessing ? stopProcessing : startProcessing}>
            {isProcessing ? "解析停止" : "解析開始"}
          </IonButton>
          <RootPlaybackToggle
            key={selectedChord}
            frequencyHz={getRootFreqHz(CHORD_ROOT_KEY[selectedChord], instruments)}
            label={`根音 (${CHORD_ROOT_KEY[selectedChord]})`}
          />
        </div>

        {cond === "with" && (
          <div>
            <div className={styles.sensitivityHeader}>
              <span>マイク感度</span>
              <IonText color="medium">
                <span className={styles.sensitivityValue}>{sensitivity}</span>
              </IonText>
            </div>
            <IonRange
              aria-label="マイク感度"
              min={0}
              max={100}
              step={1}
              pin={true}
              value={sensitivity}
              onIonChange={(e) => setSensitivity(e.detail.value as number)}
            >
              <IonLabel slot="start">低（大きい音のみ）</IonLabel>
              <IonLabel slot="end">高（小さい音も検出）</IonLabel>
            </IonRange>
          </div>
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

        <CentDisplay
          pitchList={currentPitchList}
          a4Freq={a4Freq}
          title="現在の和音"
        />
      </IonCardContent>
    </IonCard>
  );
}
