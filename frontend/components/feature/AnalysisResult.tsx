"use client";

import { TunerMeter } from "@/components/TunerMeter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formType } from "@/lib/schema";

interface AnalysisResultProps {
  isProcessing: boolean;
  analysisResult: (number | null)[] | null;
  currentPitchList: formType[];
  evalRangeCents: number; 
  goodRangePercent: number; 
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ isProcessing, analysisResult, currentPitchList}) => {
  const analysisData = currentPitchList.map((pitch, index) => ({
    pitch,
    deviation: analysisResult?.[index] ?? null,
  }));

  return (
    <div className="mt-8 flex flex-col items-center gap-8 w-full max-w-6xl">
      {currentPitchList.length > 0 ? (
        <TunerMeter analysisData={analysisData} title="Tuning Meter" />
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