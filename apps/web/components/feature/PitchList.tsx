"use client";

import { useAtom, useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/components/layout/SettingsSection";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// 根音を推定する関数
import { estimateRoot } from "@chordlens/core/audio_analysis/rootEstimation";

// Jotai atoms
import {
  pitchListAtom,
  removePitchWithUndoAtom,
  clearPitchListWithUndoAtom,
} from "@/lib/store";

export function PitchList() {
  const [currentPitchList, setCurrentPitchList] = useAtom(pitchListAtom);
  const removePitch = useSetAtom(removePitchWithUndoAtom);
  const clearPitchList = useSetAtom(clearPitchListWithUndoAtom);

  return (
    <SettingsSection title="現在の評価対象音">
      {currentPitchList.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          まだ評価する音がありません。下のフォームから追加してください。
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {currentPitchList.map((data, index) => {
              const label = `${data.pitchName}${data.octaveNum}`;
              return (
                <div
                  key={`${data.pitchName}-${data.octaveNum}-${index}`}
                  className={cn(
                    "flex h-11 items-center rounded-full pl-4 text-base font-medium",
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
                    aria-label={`${label} を削除`}
                    className={cn(
                      "size-11 rounded-full",
                      data.enabled !== false
                        ? "hover:bg-blue-200"
                        : "hover:bg-gray-200"
                    )}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() =>
                estimateRoot(currentPitchList, setCurrentPitchList)
              }
              className="h-11"
            >
              根音を推定する
            </Button>
            <Button
              variant="outline"
              onClick={() => clearPitchList()}
              className="h-11"
            >
              全てクリア
            </Button>
          </div>
        </div>
      )}
    </SettingsSection>
  );
}
