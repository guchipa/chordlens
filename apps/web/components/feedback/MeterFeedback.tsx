"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CHORD_ROLE_COLORS,
  METER_MAX_DEVIATION_DEGREES,
  METER_NEEDLE_HOLD_MS,
  METER_NEEDLE_SMOOTHING_ALPHA,
  METER_REMAIN_MS,
  PITCH_COLOR_MAP,
} from "@chordlens/core/constants";
import type { Pitch } from "@chordlens/core/types";
import { getSingleEqualJustDiff } from "@chordlens/core/audio_analysis/calcJustFreq";
import { updateEmaHoldList, type EmaHoldState } from "@chordlens/core/utils/emaHold";
import { chordKey } from "@chordlens/core/feedback/chordName";
import { describeVoices } from "@chordlens/core/feedback/chordRoles";

interface TunerMeterProps {
  /**
   * 解析結果の配列。各要素が1つの針に対応します。
   */
  analysisData: Array<{
    pitch: Pitch;
    deviation: number | null;
  }>;
  /** メーターのタイトル */
  /** カードヘッダに表示する内容 (文字列、または形式切替などの要素) */
  title?: React.ReactNode;
  /** 根音の音名（例: "C4"） */
  rootPitchName?: string;
  /** A4の基準周波数（デフォルト: 442Hz） */
  a4Freq?: number;
  /** 表示保持（ホールド）を有効にするか（デフォルト: true） */
  holdEnabled?: boolean;
  /** カードヘッダを描かない (形式切替を外側に置くメイン画面のカルーセル用) */
  hideHeader?: boolean;
  /**
   * legacy: 従来の描画 (音名ごとの色。評価実験画面用)
   * enhanced: 構成音が動的に変わるメイン画面用。針と凡例を役割 (度数) の色にし、
   *   凡例を声部順 (低い順) に「長3度 E4」の形で出す。和音が変わったら
   *   針の保持・平滑化の状態を捨て、旧和音の針を残さない
   */
  variant?: "legacy" | "enhanced";
}

export const TunerMeter: React.FC<TunerMeterProps> = ({
  analysisData,
  title,
  rootPitchName,
  a4Freq = 442,
  holdEnabled = true,
  hideHeader = false,
  variant = "legacy",
}) => {
  const enhanced = variant === "enhanced";
  // 表示用のデータを保持する state
  const [displayData, setDisplayData] = useState(analysisData);
  // タイマーのIDを保持するための ref
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  // タイムアウト待ち状態かどうかを追跡するref（タイマーの無限リセットを防ぐ）
  const isWaitingForTimeoutRef = useRef<boolean>(false);

  // 針ごとの状態（保持・スムージング）
  const needleStateRef = useRef<Map<string, EmaHoldState>>(new Map());
  // enhanced: 和音の変化を検出して状態を捨てるための直前の和音キー
  const lastChordKeyRef = useRef<string | null>(null);

  const getKey = (pitch: Pitch) => `${pitch.pitchName}${pitch.octaveNum}`;

  useEffect(() => {
    const now = performance.now();

    let chordChanged = false;
    if (enhanced) {
      const key = chordKey(analysisData.map(({ pitch }) => pitch));
      if (lastChordKeyRef.current !== key) {
        chordChanged = lastChordKeyRef.current !== null;
        lastChordKeyRef.current = key;
        needleStateRef.current.clear();
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        isWaitingForTimeoutRef.current = false;
      }
    }

    const keys = analysisData.map(({ pitch }) => getKey(pitch));
    const rawDeviations = analysisData.map(({ deviation }) => deviation);
    const { values: smoothedDeviations } = updateEmaHoldList(
      needleStateRef.current,
      keys,
      rawDeviations,
      now,
      {
        alpha: METER_NEEDLE_SMOOTHING_ALPHA,
        holdMs: holdEnabled ? METER_NEEDLE_HOLD_MS : 0,
      }
    );

    // 入力（analysisData）から、保持・スムージングを適用した表示データを作る
    const nextDisplayData = analysisData.map(({ pitch }, index) => ({
      pitch,
      deviation: smoothedDeviations[index] ?? null,
    }));

    const isAnySoundDetected = analysisData.some((data) => data.deviation !== null);

    if (isAnySoundDetected || chordChanged) {
      // 何かしら検出されている間は、毎フレーム追従しつつ、針ごとの保持/平滑化で安定化
      // 既存のタイマーがあればクリア
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      isWaitingForTimeoutRef.current = false;
      setDisplayData(nextDisplayData);
    } else {
      // 音が検出されなかった場合
      // 既にタイムアウト待ち状態なら、タイマーをリセットしない（無限リセット防止）
      if (!isWaitingForTimeoutRef.current) {
        isWaitingForTimeoutRef.current = true;
        // 1.5秒後に現在の analysisData（音が無い状態）で表示を更新するタイマーをセット
        // この間、displayData は古いままなので、針は表示され続ける
        timeoutRef.current = setTimeout(() => {
          setDisplayData(nextDisplayData);
          isWaitingForTimeoutRef.current = false;
          timeoutRef.current = null;
        }, METER_REMAIN_MS);
      }
      // 既にタイマー待ち中の場合は何もしない（タイマーは継続）
    }
  }, [analysisData, holdEnabled, enhanced]); // analysisData が変更されるたびに effect を実行

  // コンポーネントがアンマウントされるときにタイマーをクリア
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      isWaitingForTimeoutRef.current = false;
    };
  }, []);
  // enhanced: 役割 (度数) と声部順。和音が変わっても色の意味 (3 度は青など) が変わらない
  const voices = enhanced ? describeVoices(displayData.map(({ pitch }) => pitch)) : [];
  const roleByKey = new Map(voices.map((v) => [v.key, v]));
  const colorOf = (pitch: Pitch): string => {
    if (enhanced) {
      const role = roleByKey.get(getKey(pitch))?.role;
      return role ? CHORD_ROLE_COLORS[role] : "#888";
    }
    return PITCH_COLOR_MAP[pitch.pitchName] || "#888";
  };
  const legend = enhanced
    ? voices.map((v) => ({ key: v.key, color: colorOf(v.pitch), label: `${v.intervalLabel ?? ""} ${v.key}`.trim() }))
    : displayData.map(({ pitch }, index) => ({
        key: `${pitch.pitchName}-${pitch.octaveNum}-${index}`,
        color: PITCH_COLOR_MAP[pitch.pitchName] || "#888",
        label: `${pitch.pitchName}${pitch.octaveNum}`,
      }));

  return (
    <Card className="w-full max-w-md mx-auto">
      {!hideHeader && (
        <CardHeader className="px-4 pt-3 pb-0">
          {typeof title === "string" || title == null ? (
            <CardTitle className="text-sm font-medium text-muted-foreground">{title || "Tuner"}</CardTitle>
          ) : (
            title
          )}
        </CardHeader>
      )}
      <CardContent className={hideHeader ? "flex flex-col items-center px-3 py-3" : "flex flex-col items-center px-3 pb-3 pt-1"}>
        <div className="flex w-full aspect-[2/1] overflow-hidden">
          {/* メーターの背景（半円） */}
          <svg
            className="w-full h-full"
            viewBox="0 0 100 50"
          >
            <path d="M 0 50 A 50 50 0 0 1 100 50 L 0 50 Z" fill="#e0e0e0" />
            {/* 目盛り */}
            {[
              -METER_MAX_DEVIATION_DEGREES,
              -METER_MAX_DEVIATION_DEGREES / 2,
              0,
              METER_MAX_DEVIATION_DEGREES / 2,
              METER_MAX_DEVIATION_DEGREES,
            ].map((angle, idx) => {
              const rotationRad = (angle + 90) * (Math.PI / 180);
              const x1 = 50 + 40 * Math.cos(rotationRad);
              const y1 = 50 - 40 * Math.sin(rotationRad); // Y軸の向きを修正
              const x2 = 50 + 45 * Math.cos(rotationRad);
              const y2 = 50 - 45 * Math.sin(rotationRad); // Y軸の向きを修正
              return (
                <line
                  key={idx}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="black"
                  strokeWidth="1"
                />
              );
            })}

            {/* 平均律マーカー */}
            {rootPitchName && displayData?.map(({ pitch }, index) => {
              const pitchName = `${pitch.pitchName}${pitch.octaveNum}`;
              const equalJustDiffCents = getSingleEqualJustDiff(pitchName, rootPitchName, a4Freq);

              if (equalJustDiffCents === null) return null;

              // セントを-1.0〜1.0の範囲に正規化（±50セントが±1.0に対応）
              const normalizedDiff = equalJustDiffCents / 50;
              const markerRotation = normalizedDiff * METER_MAX_DEVIATION_DEGREES;
              const markerColor = colorOf(pitch);

              // マーカー用の座標計算
              const markerRotationRad = (-markerRotation + 90) * (Math.PI / 180);
              const x1 = 50 + 42 * Math.cos(markerRotationRad);
              const y1 = 50 - 42 * Math.sin(markerRotationRad);
              const x2 = 50 + 45 * Math.cos(markerRotationRad);
              const y2 = 50 - 45 * Math.sin(markerRotationRad);

              return (
                <line
                  key={`marker-${pitch.pitchName}-${pitch.octaveNum}-${index}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={markerColor}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity="0.6"
                />
              );
            })}

            {/* 各音に対応する針を描画 */}
            {displayData?.map(({ pitch, deviation }, index) => {
              if (deviation === null) return null; // 検出されなかった音は表示しない

              const needleRotation =
                deviation * METER_MAX_DEVIATION_DEGREES;
              const needleColor = colorOf(pitch); // マップにない場合はデフォルト色

              return (
                <line
                  key={`${pitch.pitchName}-${pitch.octaveNum}-${index}`}
                  x1="50"
                  y1="50"
                  x2="50"
                  y2="10"
                  stroke={needleColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{
                    transformOrigin: "50px 50px",
                    transform: `rotate(${needleRotation}deg)`,
                  }}
                />
              );
            })}
            <circle cx="50" cy="50" r="3" fill="black" />
          </svg>
        </div>
        {/*
          enhanced: 構成音が 3↔4 で変わると凡例が 1↔2 行に折り返し、カードの高さが
          変わって下の要素が上下する。2 行ぶん (24px×2 + 行間 8px) を常に確保する
        */}
        <div
          className={
            enhanced
              ? "mt-3 flex min-h-14 w-full flex-wrap content-start justify-center gap-x-4 gap-y-2"
              : "flex flex-wrap justify-center gap-x-4 gap-y-2 mt-3"
          }
        >
          {legend.map(({ key, color, label }) => (
            <div key={key} className="flex items-center gap-2 text-base">
              <span className="size-3.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="font-semibold">{label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
