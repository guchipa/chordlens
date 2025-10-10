"use client";

import { Button } from "@/components/ui/button";
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
    <div className="mt-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-md">
      <h3 className="mb-4 text-xl font-semibold text-gray-700 sm:text-2xl">
        現在の評価対象音
      </h3>
      {currentPitchList.length === 0 ? (
        <p className="text-gray-500">
          まだ評価する音がありません。上のフォームから追加してください。
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {currentPitchList.map((data, index) => (
            <div
              key={`${data.pitchName}-${data.octaveNum}-${index}`}
              className="flex items-center space-x-2 rounded-full bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-800"
            >
              <span
                className={cn("whitespace-nowrap", {
                  "font-bold text-sky-700": data.isRoot,
                })}
              >
                {data.pitchName}
                {data.octaveNum}
                {data.isRoot && " (R)"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removePitch(index)}
                className="h-5 w-5 rounded-full p-0 hover:bg-blue-200"
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
    </div>
  );
};
