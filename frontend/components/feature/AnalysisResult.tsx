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

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ isProcessing, analysisResult, currentPitchList, goodRangePercent }) => {
  return (
    <div className="mt-8 grid w-full max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
      {currentPitchList.length > 0
        ? currentPitchList.map((pitchData, index) => (
            <div
              key={`${pitchData.pitchName}-${pitchData.octaveNum}-${index}`}
              className="flex justify-center"
            >
              <TunerMeter
                pitchName={`${pitchData.pitchName}${pitchData.octaveNum}`}
                deviation={analysisResult?.[index] ?? null}
              />
            </div>
          ))
        : !isProcessing && (
            <div className="py-8 text-center text-gray-500 md:col-span-2 lg:col-span-3">
              <p>評価する音を追加して、解析を開始してください。</p>
            </div>
          )}
      {analysisResult && currentPitchList.length > 0 && (
        <div className="md:col-span-2 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>詳細な解析結果</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {currentPitchList.map((pitchData, index) => {
                  const val = analysisResult[index];
                  const isGood =
                    val !== null &&
                    Math.abs(val * 100) <= goodRangePercent;

                  const deviationColor =
                    val === null
                      ? "text-gray-500"
                      : isGood
                      ? "text-green-600"
                      : Math.abs(val * 100) < 30
                      ? "text-orange-500"
                      : "text-red-600";

                  return (
                    <li
                      key={`${pitchData.pitchName}-${pitchData.octaveNum}-${index}`}
                      className="flex items-center justify-between rounded-md p-2 transition-colors duration-200 even:bg-gray-50"
                    >
                      <span
                        className={cn("whitespace-nowrap font-semibold", {
                          "text-sky-700": pitchData.isRoot,
                        })}
                      >
                        {pitchData.pitchName}
                        {pitchData.octaveNum}
                        {pitchData.isRoot && " (R)"}
                      </span>
                      <div className="flex items-center gap-4">
                        <span
                          className={cn(
                            "w-24 text-right font-mono",
                            deviationColor
                          )}
                        >
                          {val !== null
                            ? `${val >= 0 ? "+" : ""}${(val * 100).toFixed(
                                2
                              )}%`
                            : "検出なし"}
                        </span>
                        {val !== null && (
                          <span className={cn("text-lg", deviationColor)}>
                            {isGood ? "✔" : "✖"}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};