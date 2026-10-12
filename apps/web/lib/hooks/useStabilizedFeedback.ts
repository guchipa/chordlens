import { useMemo, useRef } from "react";
import {
  METER_NEEDLE_HOLD_MS,
  METER_NEEDLE_SMOOTHING_ALPHA,
  METER_REMAIN_MS,
} from "@chordlens/core/constants";
import { chordKey } from "@chordlens/core/feedback/chordName";
import { describeVoices, type VoiceInfo } from "@chordlens/core/feedback/chordRoles";
import { DeviationStabilizer } from "@chordlens/core/feedback/deviationStabilizer";
import type { Pitch } from "@chordlens/core/types";

export interface StabilizedVoice extends VoiceInfo {
  /** 平滑化・ホールド後の偏差 (±1 正規化)。未検出は null */
  deviation: number | null;
}

interface FeedbackInput {
  pitch: Pitch;
  deviation: number | null;
}

/**
 * フィードバック表示用に、構成音を声部順 (低い順) に並べて役割を付け、
 * 偏差を安定化 (音ごとのホールド + 全音無音時の表示保持) する。
 * 和音が変わったら安定化の状態を捨てる。
 */
export function useStabilizedFeedback(
  analysisData: FeedbackInput[],
  holdEnabled: boolean,
): { voices: StabilizedVoice[]; chordKey: string } {
  const stabilizerRef = useRef<DeviationStabilizer | null>(null);
  const lastChordKeyRef = useRef<string | null>(null);

  return useMemo(() => {
    const pitchList = analysisData.map((d) => d.pitch);
    const key = chordKey(pitchList);
    const options = {
      alpha: METER_NEEDLE_SMOOTHING_ALPHA,
      holdMs: holdEnabled ? METER_NEEDLE_HOLD_MS : 0,
      remainMs: holdEnabled ? METER_REMAIN_MS : 0,
    };
    if (!stabilizerRef.current) {
      stabilizerRef.current = new DeviationStabilizer(options);
    } else {
      stabilizerRef.current.setOptions(options);
    }
    if (lastChordKeyRef.current !== key) {
      stabilizerRef.current.reset();
      lastChordKeyRef.current = key;
    }

    const rawByKey = new Map(
      analysisData.map((d) => [`${d.pitch.pitchName}${d.pitch.octaveNum}`, d.deviation]),
    );
    const voiceInfos = describeVoices(pitchList);
    const values = stabilizerRef.current.update(
      voiceInfos.map((v) => v.key),
      voiceInfos.map((v) => rawByKey.get(v.key) ?? null),
      performance.now(),
    );
    return {
      chordKey: key,
      voices: voiceInfos.map((v, i) => ({ ...v, deviation: values[i] ?? null })),
    };
  }, [analysisData, holdEnabled]);
}

/**
 * 値の表示更新を intervalMs ごとに間引く (セントの数値を読めるようにする)。
 * resetKey が変わったら即座に反映する (和音の切替直後に古い数値を残さない)
 */
export function useThrottledValue<T>(value: T, intervalMs: number, resetKey?: string): T {
  const shownRef = useRef<{ value: T; at: number; resetKey?: string } | null>(null);
  const now = performance.now();
  const shown = shownRef.current;
  if (!shown || shown.resetKey !== resetKey || now - shown.at >= intervalMs) {
    shownRef.current = { value, at: now, resetKey };
    return value;
  }
  return shown.value;
}
