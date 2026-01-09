"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formType } from "@/lib/schema";

// 根音を推定する関数
import { estimateRoot } from "@/lib/audio_analysis/rootEstimation";

interface PitchListProps {
  currentPitchList: formType[];
  removePitch: (index: number) => void;
  clearPitchList: () => void;
  setCurrentPitchList: (pitchList: formType[]) => void;
}

export const PitchList: React.FC<PitchListProps> = ({
  currentPitchList,
  removePitch,
  clearPitchList,
  setCurrentPitchList,
}) => {
  return (
    <Card className="mt-4 w-full max-w-lg">
      <CardHeader>
        <CardTitle>現在の評価対象音</CardTitle>
      </CardHeader>
      <CardContent>
        {currentPitchList.length === 0 ? (
          <p className="text-gray-500">
            まだ評価する音がありません。上のフォームから追加してください。
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {currentPitchList.map((data, index) => (
              <div
                key={`${data.pitchName}-${data.octaveNum}-${index}`}
                className={cn(
                  "flex items-center space-x-2 rounded-full px-3 py-1.5 text-sm font-medium",
                  data.enabled !== false
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-500"
                )}
              >
                <span
                  className={cn("whitespace-nowrap", {
                    "font-bold text-sky-700":
                      data.isRoot && data.enabled !== false,
                    "font-bold text-gray-600":
                      data.isRoot && data.enabled === false,
                  })}
                >
                  {data.pitchName}
                  {data.octaveNum}
                  {data.isRoot && " (R)"}
                  {data.enabled === false && " (OFF)"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removePitch(index)}
                  className={cn(
                    "h-5 w-5 rounded-full p-0",
                    data.enabled !== false
                      ? "hover:bg-blue-200"
                      : "hover:bg-gray-200"
                  )}
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    ></path>
                  </svg>
                </Button>
              </div>
            ))}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  estimateRoot(currentPitchList, setCurrentPitchList)
                }
                className="mt-2 sm:mt-0"
                disabled={currentPitchList.length === 0}
              >
                根音を推定する
              </Button>
              <Button
                variant="outline"
                onClick={clearPitchList}
                className="mt-2 sm:mt-0"
              >
                全てクリア
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
