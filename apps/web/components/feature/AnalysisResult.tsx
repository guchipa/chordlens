import { TunerMeter } from "@/components/feedback/MeterFeedback";
import type { Pitch } from "@chordlens/core/types";
import { CentDisplay } from "./CentDisplay";

import styles from "./AnalysisResult.module.css";

interface AnalysisResultProps {
  isProcessing: boolean;
  analysisResult: (number | null)[] | null;
  currentPitchList: Pitch[];
  evalRangeCents: number;
  a4Freq: number;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ isProcessing, analysisResult, currentPitchList, a4Freq }) => {
  const analysisData = currentPitchList.map((pitch, index) => ({
    pitch,
    deviation: analysisResult?.[index] ?? null,
  }));

  return (
    <div className={styles.container}>
      {currentPitchList.length > 0 ? (
        <div className={styles.innerContainer}>
          <TunerMeter analysisData={analysisData} title="解析結果" />
          <CentDisplay pitchList={currentPitchList} a4Freq={a4Freq} title="平均律からの差" />
        </div>
      ) : (
        !isProcessing && (
          <div className={styles.emptyMessage}>
            <p>評価する音を追加して、解析を開始してください。</p>
          </div>
        )
      )}
    </div>
  );
};