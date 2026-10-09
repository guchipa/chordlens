"use client";

import { useAtom } from "jotai";
import {
  FEEDBACK_TYPES,
  FEEDBACK_TYPE_LABELS,
  type FeedbackType,
} from "@chordlens/core/constants";
import { cn } from "@/lib/utils";
import { feedbackTypeAtom } from "@/lib/store";

/**
 * フィードバック形式のセグメント切替 (メイン画面のカードヘッダ用)。
 * 設定ドロワーの FeedbackTypeSelector と同じ feedbackTypeAtom を共有する。
 * 各セグメントは 44px 高のタップ領域。
 */
export function FeedbackTypeSwitch({ className }: { className?: string }) {
  const [feedbackType, setFeedbackType] = useAtom(feedbackTypeAtom);

  return (
    <div
      role="radiogroup"
      aria-label="フィードバック形式"
      className={cn("grid grid-cols-3 gap-0.5 rounded-lg bg-gray-100 p-0.5", className)}
    >
      {FEEDBACK_TYPES.map((type: FeedbackType) => {
        const selected = type === feedbackType;
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setFeedbackType(type)}
            className={cn(
              "h-11 rounded-md text-sm font-medium transition-colors",
              selected
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-800 active:bg-gray-200",
            )}
          >
            {FEEDBACK_TYPE_LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}
