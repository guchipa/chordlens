"use client";

import React from "react";
import {
  CHORD_ROLE_COLORS,
  FEEDBACK_NUMBER_UPDATE_MS,
  TUNING_LEVEL_COLORS,
} from "@chordlens/core/constants";
import { summarizePurity, tuningLevel, type TuningLevel } from "@chordlens/core/feedback/tuningMetrics";
import { Card, CardContent } from "@/components/ui/card";
import { useStabilizedFeedback, useThrottledValue } from "@/lib/hooks/useStabilizedFeedback";
import { cn } from "@/lib/utils";
import type { FeedbackDatum } from "./FeedbackSlide";

interface PurityFeedbackProps {
  analysisData: FeedbackDatum[];
  evalRangeCents: number;
  holdEnabled: boolean;
}

const LEVEL_LABELS: Record<TuningLevel, string> = {
  inTune: "純正に合っています",
  close: "あと少し",
  off: "ずれています",
};

const RING_RADIUS = 80;
const RING_STROKE = 16;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function formatSignedCents(cents: number): string {
  const rounded = Math.round(cents);
  if (rounded === 0) return "±0";
  return rounded > 0 ? `+${rounded}` : `−${Math.abs(rounded)}`;
}

/**
 * 純正度インジケータ形式。和音全体の純正度を最大絶対偏差 (最もずれた音) で
 * 1 つにまとめて大きく出す。構成音の区別に頼らないため、構成音の入れ替わりに
 * 影響されず、1 台を全員で見て「今の和音が合っているか」を一目で判断できる。
 * 最もずれた音の役割・音名・直す方向を併記し、下に全音の内訳を並べる。
 */
export const PurityFeedback: React.FC<PurityFeedbackProps> = ({
  analysisData,
  evalRangeCents,
  holdEnabled,
}) => {
  const { voices, chordKey } = useStabilizedFeedback(analysisData, holdEnabled);
  const summary = summarizePurity(voices.map((v) => ({ key: v.key, deviation: v.deviation })));
  // 数値と文言は間引いて表示する (毎フレーム変わると読めない)
  const shown = useThrottledValue(
    { summary, deviations: voices.map((v) => v.deviation) },
    FEEDBACK_NUMBER_UPDATE_MS,
    chordKey,
  );

  const worst = summary.worst;
  const level = worst ? tuningLevel(worst.deviation) : null;
  const ringColor = level ? TUNING_LEVEL_COLORS[level] : "#d1d5db";
  // 合っているほどリングが満ちる (最大偏差 0 で満、±evalRange で空)
  const fill = worst ? 1 - Math.min(1, Math.abs(worst.deviation)) : 0;

  const shownWorst = shown.summary.worst;
  const shownLevel = shownWorst ? tuningLevel(shownWorst.deviation) : null;
  const worstVoice = shownWorst ? voices.find((v) => v.key === shownWorst.key) : undefined;

  let advice: string | null = null;
  if (shownWorst && worstVoice && shownLevel !== "inTune") {
    const name = `${worstVoice.intervalLabel ?? ""} ${worstVoice.key}`.trim();
    advice = `${name} を${shownWorst.deviation > 0 ? "下げる ▼" : "上げる ▲"}`;
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardContent className="flex flex-col items-center gap-3 px-3 py-4">
        <div className="relative size-56">
          <svg viewBox="0 0 200 200" className="size-full -rotate-90" aria-hidden="true">
            <circle cx="100" cy="100" r={RING_RADIUS} fill="none" stroke="#e5e7eb" strokeWidth={RING_STROKE} />
            <circle
              data-testid="purity-ring"
              cx="100"
              cy="100"
              r={RING_RADIUS}
              fill="none"
              stroke={ringColor}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - fill)}
              className="transition-[stroke-dashoffset,stroke] duration-150 motion-reduce:transition-none"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-muted-foreground">最大のずれ</span>
            <span
              data-testid="purity-value"
              className="text-6xl font-bold tabular-nums"
              style={{ color: shownLevel ? TUNING_LEVEL_COLORS[shownLevel] : "#9ca3af" }}
            >
              {shownWorst ? Math.round(Math.abs(shownWorst.deviation) * evalRangeCents) : "—"}
              {shownWorst && <span className="text-2xl">c</span>}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {shown.summary.detectedCount}/{shown.summary.totalCount} 音を検出
            </span>
          </div>
        </div>

        <div role="status" className="flex min-h-14 flex-col items-center text-center">
          <span className={cn("text-xl font-bold", shownLevel === "inTune" ? "text-green-600" : "text-gray-900")}>
            {shownLevel ? LEVEL_LABELS[shownLevel] : "音を待っています"}
          </span>
          {advice && <span className="text-base font-semibold text-gray-700">{advice}</span>}
        </div>

        <ul aria-label="構成音ごとの偏差 (左が低い声部)" className="flex w-full flex-wrap justify-center gap-1.5">
          {voices.map((v, i) => {
            const d = shown.deviations[i] ?? null;
            const lv = d === null ? null : tuningLevel(d);
            const isWorst = shownWorst?.key === v.key && lv !== "inTune";
            return (
              <li
                key={v.key}
                data-testid="purity-chip"
                className={cn(
                  "flex min-w-16 flex-col items-center rounded-lg border bg-gray-50 px-2 py-1",
                  isWorst && "border-2 border-gray-900",
                )}
              >
                <span
                  className="rounded-full px-1.5 text-[11px] font-semibold text-white"
                  style={{ backgroundColor: v.role ? CHORD_ROLE_COLORS[v.role] : "#9ca3af" }}
                >
                  {v.intervalLabel ?? "—"}
                </span>
                <span className="text-sm font-semibold">{v.key}</span>
                <span
                  className="text-base font-bold tabular-nums"
                  style={{ color: lv ? TUNING_LEVEL_COLORS[lv] : "#9ca3af" }}
                >
                  {d === null ? "—" : `${formatSignedCents(d * evalRangeCents)}c`}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
};
