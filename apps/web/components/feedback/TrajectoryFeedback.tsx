"use client";

import React, { useMemo, useRef } from "react";
import {
  CHORD_ROLE_COLORS,
  CLOSE_DEVIATION,
  IN_TUNE_DEVIATION,
} from "@chordlens/core/constants";
import { chordKey as toChordKey, nameChord } from "@chordlens/core/feedback/chordName";
import { describeVoices, type ChordRole } from "@chordlens/core/feedback/chordRoles";
import { scaleDeviationForDisplay } from "@chordlens/core/feedback/tuningMetrics";
import {
  TrajectoryBuffer,
  type TrajectorySample,
} from "@chordlens/core/feedback/trajectory";
import { Card, CardContent } from "@/components/ui/card";
import { useStabilizedFeedback } from "@/lib/hooks/useStabilizedFeedback";
import type { FeedbackDatum } from "./FeedbackSlide";

interface TrajectoryFeedbackProps {
  analysisData: FeedbackDatum[];
  evalRangeCents: number;
  /** 和音の切替中 (この間のサンプルは切替区間として灰色で描く) */
  transitioning: boolean;
  /** 「合っている」の閾値 (±1 正規化)。緑の帯と縦軸の拡大の基準 */
  inTuneDeviation?: number;
  /** 表示の平滑化 (EMA) の時定数 (ms)。0 で平滑化なし */
  smoothingMs?: number;
}

const W = 360;
const H = 220;
/** 左の目盛りラベル幅 */
const PLOT_LEFT = 30;
/** 右端の現在値ラベル幅 */
const PLOT_RIGHT = W - 34;
const PLOT_TOP = 18;
const PLOT_BOTTOM = H - 6;
const TRANSITION_COLOR = "#9ca3af";
/** 凡例の最低枠数 (2 列 × 2 行) */
const MIN_LEGEND_SLOTS = 4;

/** 目盛りラベルが重ならない最小の間隔 */
const MIN_TICK_GAP = 12;

/**
 * 縦軸は 0 付近を拡大する非線形スケール (「合っている」帯を合わせやすい幅にする)。
 * 拡大の基準 (knee) は「合っている」の閾値
 */
const makeYOf = (knee: number) => (deviation: number) =>
  PLOT_TOP + ((1 - scaleDeviationForDisplay(deviation, knee)) / 2) * (PLOT_BOTTOM - PLOT_TOP);

interface Run {
  key: string;
  role: ChordRole | null;
  transition: boolean;
  points: string[];
}

/** サンプル列を、音ごと・連続区間ごとの折れ線に分ける (未検出・役割の変化・切替区間で切る) */
function buildRuns(
  samples: readonly TrajectorySample[],
  xOf: (t: number) => number,
  yOf: (deviation: number) => number,
): Run[] {
  const runs: Run[] = [];
  const open = new Map<string, Run>();
  for (const s of samples) {
    const seen = new Set<string>();
    for (const v of s.voices) {
      if (v.deviation === null) continue;
      seen.add(v.key);
      let run = open.get(v.key);
      if (!run || run.role !== v.role || run.transition !== s.transition) {
        run = { key: v.key, role: v.role, transition: s.transition, points: [] };
        open.set(v.key, run);
        runs.push(run);
      }
      run.points.push(`${xOf(s.t).toFixed(1)},${yOf(v.deviation).toFixed(1)}`);
    }
    for (const key of [...open.keys()]) {
      if (!seen.has(key)) open.delete(key);
    }
  }
  return runs;
}

function formatCents(cents: number): string {
  // 「合っている」帯の境界 (既定 ±2.5) のような 10 未満の端数は小数 1 桁で出す
  const r = Math.abs(cents) < 10 ? Math.round(cents * 10) / 10 : Math.round(cents);
  return r > 0 ? `+${r}` : r < 0 ? `−${Math.abs(r)}` : "0";
}

/**
 * ピッチ軌跡形式。直近 10 秒の偏差を声部ごとの線で描き、和音ごとの区間に
 * 帯と和音名を付ける。持続する和音では揺れや合わせ込みの過程を、コード進行では
 * 和音ごとの合い具合を振り返れる。和音の確定遅れのぶん、切替の判定中と
 * その直前は切替区間として灰色の帯・破線で描き、和音の区間に含めない。
 */
export const TrajectoryFeedback: React.FC<TrajectoryFeedbackProps> = ({
  analysisData,
  evalRangeCents,
  transitioning,
  inTuneDeviation = IN_TUNE_DEVIATION,
  smoothingMs = 0,
}) => {
  // 保持 (ホールド) はかけない: 未検出の間は線を切って見せる
  const { voices: stabilized } = useStabilizedFeedback(analysisData, false, smoothingMs);
  const bufferRef = useRef<TrajectoryBuffer | null>(null);
  bufferRef.current ??= new TrajectoryBuffer();
  const buffer = bufferRef.current;

  // 新しい解析結果が届くたびに 1 サンプル追加する (平滑化後の値を使う)
  const now = useMemo(() => {
    const t = performance.now();
    const pitchList = analysisData.map((d) => d.pitch);
    const chord = nameChord(pitchList);
    buffer.push(t, {
      chordKey: toChordKey(pitchList),
      chordLabel: chord?.symbol ?? chord?.rootName ?? "?",
      transitioning,
      voices: stabilized.map((v) => ({ key: v.key, role: v.role, deviation: v.deviation })),
    });
    return t;
    // stabilized は analysisData から作られるので、解析フレームの更新は analysisData で判定する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisData, transitioning, buffer]);

  const yOf = makeYOf(inTuneDeviation);

  const windowStart = now - buffer.windowMs;
  const xOf = (t: number) =>
    PLOT_LEFT + ((t - windowStart) / buffer.windowMs) * (PLOT_RIGHT - PLOT_LEFT);

  const samples = buffer.getSamples();
  const segments = buffer.getSegments();
  const runs = buildRuns(samples, xOf, yOf);
  const latest = samples[samples.length - 1];
  const currentVoices = describeVoices(analysisData.map((d) => d.pitch));

  // 正解幅が「近い」の閾値に近いとラベルが重なるので、そのときは「近い」の目盛りを省く
  const showClose = Math.abs(yOf(inTuneDeviation) - yOf(CLOSE_DEVIATION)) >= MIN_TICK_GAP;
  const ticks = [
    1,
    ...(showClose ? [CLOSE_DEVIATION] : []),
    inTuneDeviation,
    0,
    -inTuneDeviation,
    ...(showClose ? [-CLOSE_DEVIATION] : []),
    -1,
  ];

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardContent className="px-2 py-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-label={`直近 ${buffer.windowMs / 1000} 秒の偏差の推移`}
        >
          {/* 和音ごとの区間の帯と和音名 */}
          {segments.map((seg, i) => {
            if (seg.chordKey === null) return null;
            const x1 = Math.max(PLOT_LEFT, xOf(seg.start));
            const x2 = Math.min(PLOT_RIGHT, xOf(seg.end));
            if (x2 <= x1) return null;
            return (
              <g key={`seg-${seg.start}`} data-testid="trajectory-segment">
                <rect
                  x={x1}
                  y={PLOT_TOP}
                  width={x2 - x1}
                  height={PLOT_BOTTOM - PLOT_TOP}
                  fill={i % 2 === 0 ? "#f8fafc" : "#eef2f7"}
                />
                {x2 - x1 > 24 && (
                  <text x={x1 + 3} y={PLOT_TOP - 5} fontSize="12" fontWeight="700" fill="#111827">
                    {seg.chordLabel}
                  </text>
                )}
              </g>
            );
          })}

          {/* 合っている帯 */}
          <rect
            data-testid="trajectory-in-tune-band"
            x={PLOT_LEFT}
            y={yOf(inTuneDeviation)}
            width={PLOT_RIGHT - PLOT_LEFT}
            height={yOf(-inTuneDeviation) - yOf(inTuneDeviation)}
            fill="#dcfce7"
            opacity="0.9"
          />

          {/*
            切替区間の帯は合っている帯より手前に描く。切替中の偏差は旧和音基準で
            信頼できないため、緑の帯で「合っている」ように見せない
          */}
          {segments.map((seg) => {
            if (seg.chordKey !== null) return null;
            const x1 = Math.max(PLOT_LEFT, xOf(seg.start));
            const x2 = Math.min(PLOT_RIGHT, xOf(seg.end));
            if (x2 <= x1) return null;
            return (
              <rect
                key={`transition-${seg.start}`}
                data-testid="trajectory-transition"
                x={x1}
                y={PLOT_TOP}
                width={x2 - x1}
                height={PLOT_BOTTOM - PLOT_TOP}
                fill="#e5e7eb"
              />
            );
          })}

          {/* 目盛り */}
          {ticks.map((d) => (
            <g key={d}>
              <line
                x1={PLOT_LEFT}
                x2={PLOT_RIGHT}
                y1={yOf(d)}
                y2={yOf(d)}
                stroke={d === 0 ? "#6b7280" : "#d1d5db"}
                strokeWidth={d === 0 ? 1.2 : 0.8}
                strokeDasharray={d === 0 ? undefined : "3 3"}
              />
              <text x={PLOT_LEFT - 4} y={yOf(d) + 4} fontSize="10" textAnchor="end" fill="#6b7280">
                {formatCents(d * evalRangeCents)}
              </text>
            </g>
          ))}

          {/* 声部ごとの軌跡 */}
          {runs.map((run, i) =>
            run.points.length < 2 ? null : (
              <polyline
                key={`run-${i}`}
                data-testid="trajectory-line"
                points={run.points.join(" ")}
                fill="none"
                stroke={run.transition || !run.role ? TRANSITION_COLOR : CHORD_ROLE_COLORS[run.role]}
                strokeWidth={run.transition ? 1.5 : 2.5}
                strokeDasharray={run.transition ? "4 3" : undefined}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ),
          )}

          {/* 右端: 現在値 */}
          {latest &&
            !latest.transition &&
            latest.voices.map((v) =>
              v.deviation === null ? null : (
                <g key={`now-${v.key}`}>
                  <circle
                    cx={PLOT_RIGHT}
                    cy={yOf(v.deviation)}
                    r="3.5"
                    fill={v.role ? CHORD_ROLE_COLORS[v.role] : TRANSITION_COLOR}
                  />
                  <text x={PLOT_RIGHT + 6} y={yOf(v.deviation) + 4} fontSize="10" fill="#111827">
                    {v.key}
                  </text>
                </g>
              ),
            )}
        </svg>

        {/*
          凡例は 2 列の固定グリッドにし、最低 2 行ぶん (4 声部) の枠を確保する。
          流し込み (flex-wrap) だと声部の数や音程名の長さで行数が変わり、
          カードの高さが変わって下の要素が上下する
        */}
        <ul
          aria-label="線の色 (役割)"
          className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 px-2 text-sm"
        >
          {currentVoices.map((v) => (
            <li key={v.key} className="flex h-5 min-w-0 items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-1 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: v.role ? CHORD_ROLE_COLORS[v.role] : TRANSITION_COLOR }}
              />
              <span className="truncate font-semibold">{v.intervalLabel ?? "—"}</span>
              <span className="shrink-0 text-muted-foreground">{v.key}</span>
            </li>
          ))}
          {Array.from({ length: Math.max(0, MIN_LEGEND_SLOTS - currentVoices.length) }, (_, i) => (
            <li key={`empty-${i}`} aria-hidden="true" className="h-5" />
          ))}
        </ul>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden="true" className="inline-block h-3 w-4 rounded-sm bg-gray-200" />
          灰色の帯・破線は和音の切替中
        </p>
      </CardContent>
    </Card>
  );
};
