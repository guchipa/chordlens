/**
 * フィードバック表示用の指標 (純粋関数)。
 * deviation は ±evalRangeCents を ±1 に正規化した値。
 */

import { CLOSE_DEVIATION, IN_TUNE_DEVIATION } from "../constants";
import type { Pitch } from "../types";
import { pitchKey } from "./chordRoles";

export type TuningLevel = "inTune" | "close" | "off";

/** 偏差の段階 (合っている / 近い / ずれている) */
export function tuningLevel(deviation: number): TuningLevel {
  const abs = Math.abs(deviation);
  if (abs < IN_TUNE_DEVIATION) return "inTune";
  if (abs < CLOSE_DEVIATION) return "close";
  return "off";
}

export interface PurityEntry {
  key: string;
  deviation: number | null;
}

export interface PuritySummary {
  /** 最も偏差の絶対値が大きい音。検出された音がなければ null */
  worst: { key: string; deviation: number } | null;
  /** 偏差が得られた音の数 */
  detectedCount: number;
  /** 構成音の数 */
  totalCount: number;
}

/**
 * 和音全体の純正度を最大絶対偏差でまとめる。
 * 直すべき音が 1 つに定まるよう、平均ではなく最悪値を採る
 */
export function summarizePurity(entries: PurityEntry[]): PuritySummary {
  let worst: PuritySummary["worst"] = null;
  let detectedCount = 0;
  for (const { key, deviation } of entries) {
    if (deviation === null || !Number.isFinite(deviation)) continue;
    detectedCount++;
    if (worst === null || Math.abs(deviation) > Math.abs(worst.deviation)) {
      worst = { key, deviation };
    }
  }
  return { worst, detectedCount, totalCount: entries.length };
}

/**
 * 解析結果 (配列の位置で並ぶ) を、解析に使った構成音リストのキーで
 * 現在の構成音リストに対応付ける。
 *
 * 構成音リストが差し替わった直後のフレームは、結果がまだ旧リストで
 * 計算されている。位置で対応付けると旧リストの偏差が別の音に
 * 割り当たるため、キーが一致しない音は null (未検出) にする。
 * analyzedPitchList が null の場合は位置で対応付ける (従来互換)
 */
export function alignResultsByKey(
  currentPitchList: Pitch[],
  analyzedPitchList: Pitch[] | null,
  results: ReadonlyArray<number | null> | null
): Array<number | null> {
  if (!results) return currentPitchList.map(() => null);
  if (!analyzedPitchList) {
    return currentPitchList.map((_, i) => results[i] ?? null);
  }
  const byKey = new Map<string, number | null>();
  analyzedPitchList.forEach((p, i) => {
    byKey.set(pitchKey(p), results[i] ?? null);
  });
  return currentPitchList.map((p) => byKey.get(pitchKey(p)) ?? null);
}
