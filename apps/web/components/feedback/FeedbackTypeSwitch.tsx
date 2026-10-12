"use client";

import { useAtom } from "jotai";
import {
  LEGACY_FEEDBACK_TYPES,
  FEEDBACK_TYPE_LABELS,
  toLegacyFeedbackType,
  type LegacyFeedbackType,
} from "@chordlens/core/constants";
import { cn } from "@/lib/utils";
import { feedbackTypeAtom } from "@/lib/store";

/**
 * フィードバック形式のセグメント切替 (評価実験画面のカードヘッダ用)。
 * 実験条件を固定するため従来の 3 形式のみを扱う (メイン画面は FeedbackCarousel)。
 * 設定ドロワーの FeedbackTypeSelector と同じ feedbackTypeAtom を共有する。
 * 各セグメントは 44px 高のタップ領域。
 */
export function FeedbackTypeSwitch({ className }: { className?: string }) {
  const [storedType, setFeedbackType] = useAtom(feedbackTypeAtom);
  const feedbackType = toLegacyFeedbackType(storedType);

  return (
    <div
      role="radiogroup"
      aria-label="フィードバック形式"
      className={cn("grid grid-cols-3 gap-0.5 rounded-lg bg-gray-100 p-0.5", className)}
    >
      {LEGACY_FEEDBACK_TYPES.map((type: LegacyFeedbackType) => {
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
