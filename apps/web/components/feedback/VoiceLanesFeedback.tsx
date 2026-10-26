"use client";

import React from "react";
import {
  CHORD_ROLE_COLORS,
  FEEDBACK_NUMBER_UPDATE_MS,
  IN_TUNE_DEVIATION,
  TUNING_LEVEL_COLORS,
} from "@chordlens/core/constants";
import { tuningLevel } from "@chordlens/core/feedback/tuningMetrics";
import { Card, CardContent } from "@/components/ui/card";
import {
  useStabilizedFeedback,
  useThrottledValue,
  type StabilizedVoice,
} from "@/lib/hooks/useStabilizedFeedback";
import { cn } from "@/lib/utils";
import type { FeedbackDatum } from "./FeedbackSlide";

/**
 * 構成音の数が 3↔4 で変わってもレーンの幅・位置が動かないよう、
 * 最低この数のレーンを常に確保する
 */
const MIN_LANES = 4;

interface VoiceLanesFeedbackProps {
  analysisData: FeedbackDatum[];
  evalRangeCents: number;
  holdEnabled: boolean;
  /** 「合っている」の閾値 (±1 正規化) */
  inTuneDeviation?: number;
  /** 表示の平滑化 (EMA) の時定数 (ms) */
  smoothingMs?: number;
}

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));
/** 偏差 (±1) → トラック上端からの位置 (%)。上が高い */
const toTopPercent = (deviation: number) => 50 - clamp1(deviation) * 50;

function formatCents(cents: number): string {
  const rounded = Math.round(cents);
  if (rounded === 0) return "±0";
  return rounded > 0 ? `+${rounded}` : `−${Math.abs(rounded)}`;
}

/**
 * 声部レーン形式。声部 (音の高さ順) ごとの縦レーンを低い声部から左に並べ、
 * 各レーンに役割 (度数)・音名・偏差を出す。
 *
 * 和音が変わっても奏者の声部 (何番目に高い音か) は変わりにくいため、レーンの
 * 位置で自分の音を追える。役割が変わったらラベルだけが切り替わる。
 * 1 台を全員で見る前提で、離れても読めるよう数値と方向の指示を大きく出す。
 */
export const VoiceLanesFeedback: React.FC<VoiceLanesFeedbackProps> = ({
  analysisData,
  evalRangeCents,
  holdEnabled,
  inTuneDeviation = IN_TUNE_DEVIATION,
  smoothingMs = 0,
}) => {
  const { voices, chordKey } = useStabilizedFeedback(analysisData, holdEnabled, smoothingMs);
  const shownDeviations = useThrottledValue(
    voices.map((v) => v.deviation),
    FEEDBACK_NUMBER_UPDATE_MS,
    chordKey,
  );
  const laneCount = Math.max(MIN_LANES, voices.length);
  const emptyCount = laneCount - voices.length;

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardContent className="px-2 py-3">
        <div
          role="list"
          aria-label="声部ごとの偏差 (左が低い声部)"
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${laneCount}, minmax(0, 1fr))` }}
        >
          {voices.map((voice, i) => (
            <VoiceLane
              key={voice.key}
              voice={voice}
              shownDeviation={shownDeviations[i] ?? null}
              evalRangeCents={evalRangeCents}
              inTuneDeviation={inTuneDeviation}
            />
          ))}
          {Array.from({ length: emptyCount }, (_, i) => (
            <div
              key={`empty-${i}`}
              role="listitem"
              aria-label="空きレーン"
              className="flex min-h-[22rem] items-center justify-center rounded-lg border border-dashed border-gray-200 text-gray-300"
            >
              —
            </div>
          ))}
        </div>
        <p className="mt-2 flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <span>上が高い / 下が低い</span>
          <span className="flex items-center gap-1">
            <span aria-hidden="true" className="inline-block h-0 w-4 border-t-2 border-dashed border-blue-500" />
            平均律の位置
          </span>
        </p>
      </CardContent>
    </Card>
  );
};

interface VoiceLaneProps {
  voice: StabilizedVoice;
  /** 数値表示用 (間引き後) の偏差 */
  shownDeviation: number | null;
  evalRangeCents: number;
  inTuneDeviation: number;
}

const VoiceLane: React.FC<VoiceLaneProps> = ({
  voice,
  shownDeviation,
  evalRangeCents,
  inTuneDeviation,
}) => {
  const { deviation, role, intervalLabel, justOffsetCents } = voice;
  const pitchLabel = `${voice.pitch.pitchName}${voice.pitch.octaveNum}`;
  const level = deviation === null ? null : tuningLevel(deviation, inTuneDeviation);
  const color = level ? TUNING_LEVEL_COLORS[level] : undefined;
  const shownLevel =
    shownDeviation === null ? null : tuningLevel(shownDeviation, inTuneDeviation);

  // 平均律の位置: 純正律の目標から見て −justOffset セント
  const etDeviation =
    justOffsetCents === null ? null : -justOffsetCents / evalRangeCents;

  const hint =
    shownLevel === null
      ? null
      : shownLevel === "inTune"
        ? "✓"
        : shownDeviation! > 0
          ? "▼ 下げる"
          : "▲ 上げる";

  return (
    <div
      role="listitem"
      aria-label={`${intervalLabel ?? "役割不明"} ${pitchLabel}`}
      data-testid="voice-lane"
      className="flex min-h-[22rem] min-w-0 flex-col items-center gap-1 rounded-lg bg-gray-50 px-1 py-2"
    >
      <span
        className="max-w-full truncate rounded-full px-2 py-0.5 text-xs font-semibold text-white"
        style={{ backgroundColor: role ? CHORD_ROLE_COLORS[role] : "#9ca3af" }}
      >
        {intervalLabel ?? "—"}
      </span>
      <span className="text-xl font-bold tabular-nums text-gray-900">{pitchLabel}</span>

      {/* 縦トラック: 中央 = 純正律、上 = 高い */}
      <div className="relative my-1 h-48 w-full max-w-14 overflow-hidden rounded-md bg-gray-200">
        <div
          className="absolute inset-x-0 bg-green-100"
          style={{
            top: `${toTopPercent(inTuneDeviation)}%`,
            bottom: `${100 - toTopPercent(-inTuneDeviation)}%`,
          }}
        />
        <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-gray-500" />
        {etDeviation !== null && Math.abs(etDeviation) <= 1 && (
          <div
            data-testid="et-marker"
            className="absolute inset-x-0 border-t-2 border-dashed border-blue-500"
            style={{ top: `${toTopPercent(etDeviation)}%` }}
          />
        )}
        {deviation !== null && (
          <>
            <div
              className="absolute inset-x-2 rounded-sm opacity-80"
              style={{
                backgroundColor: color,
                top: `${Math.min(50, toTopPercent(deviation))}%`,
                bottom: `${100 - Math.max(50, toTopPercent(deviation))}%`,
              }}
            />
            <div
              className="absolute inset-x-0 h-1 -translate-y-1/2 bg-gray-900"
              style={{ top: `${toTopPercent(deviation)}%` }}
            />
          </>
        )}
      </div>

      <span
        data-testid="lane-cents"
        className="text-2xl font-bold tabular-nums"
        style={{ color: shownLevel ? TUNING_LEVEL_COLORS[shownLevel] : "#9ca3af" }}
      >
        {shownDeviation === null ? (
          "—"
        ) : (
          <>
            {formatCents(shownDeviation * evalRangeCents)}
            <span className="text-sm">c</span>
          </>
        )}
      </span>
      <span className={cn("h-5 text-sm font-semibold", shownLevel === "inTune" ? "text-green-600" : "text-gray-700")}>
        {hint ?? "未検出"}
      </span>
      {justOffsetCents !== null && Math.abs(justOffsetCents) >= 0.5 && (
        <span className="text-[11px] leading-tight text-muted-foreground tabular-nums">
          平均律{formatCents(justOffsetCents)}c
        </span>
      )}
    </div>
  );
};
