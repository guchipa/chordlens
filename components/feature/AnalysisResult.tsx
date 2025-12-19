"use client";

import { TunerMeter } from "@/components/feedback/MeterFeedback";
import { formType } from "@/lib/schema";
import { CentDisplay } from "./CentDisplay";

interface AnalysisResultProps {
  isProcessing: boolean;
  analysisResult: (number | null)[] | null;
  currentPitchList: formType[];
  evalRangeCents: number;
  a4Freq: number;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ isProcessing, analysisResult, currentPitchList, a4Freq }) => {
  const analysisData = currentPitchList.map((pitch, index) => ({
    pitch,
    deviation: analysisResult?.[index] ?? null,
  }));

  return (
    <div className="mt-8 flex flex-col items-center gap-8 w-full max-w-6xl">
      {currentPitchList.length > 0 ? (
        <div className="flex flex-col items-center gap-8 w-full max-w-6xl">
          <TunerMeter analysisData={analysisData} title="解析結果" />
          <CentDisplay pitchList={currentPitchList} a4Freq={a4Freq} title="平均律からの差" />
        </div>
      ) : (
        !isProcessing && (
          <div className="py-8 text-center text-gray-500">
            <p>評価する音を追加して、解析を開始してください。</p>
          </div>
        )
      )}
    </div>
  );
};