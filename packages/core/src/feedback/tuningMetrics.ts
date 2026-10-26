/**
 * フィードバック表示用の指標 (純粋関数)。
 * deviation は ±evalRangeCents を ±1 に正規化した値。
 */

import { CLOSE_DEVIATION, IN_TUNE_DEVIATION } from "../constants";
import type { Pitch } from "../types";
import { pitchKey } from "./chordRoles";

export type TuningLevel = "inTune" | "close" | "off";

/**
 * 「ピッチの正解幅」(セント) を、±evalRangeCents 正規化の閾値に直す。
 * 「近い」の閾値 (CLOSE_DEVIATION) を超えると段階が逆転するため、そこで頭打ちにする
 */
export function inTuneDeviationFromCents(inTuneCents: number, evalRangeCents: number): number {
  if (!(inTuneCents > 0) || !(evalRangeCents > 0)) return IN_TUNE_DEVIATION;
  return Math.min(inTuneCents / evalRangeCents, CLOSE_DEVIATION);
}

/** 偏差の段階 (合っている / 近い / ずれている)。inTune は「合っている」の閾値 (正規化) */
export function tuningLevel(
  deviation: number,
  inTune: number = IN_TUNE_DEVIATION
): TuningLevel {
  const abs = Math.abs(deviation);
  if (abs < inTune) return "inTune";
  if (abs < CLOSE_DEVIATION) return "close";
  return "off";
}

/**
 * 偏差を表示用の軸 (±1) に写す非線形スケール。
 * 線形だと「合っている」帯 (±IN_TUNE_DEVIATION) が軸の 5% しかなく合わせにくいため、
 * asinh で 0 付近を拡大し、大きなずれを対数的に圧縮する。
 * knee には「合っている」の閾値を渡す。knee=0.05 (既定) なら「合っている」帯が約 24%、
 * 「近い」帯が約 57% を占める (knee=0.01 で約 17%、0.2 で約 38%)。
 * sqrt と違い 0 での傾きが有限 (約 5.4 倍) なので、0 付近の揺れを過剰に増幅しない。
 * 単調・奇関数で ±1 は ±1 に写る。範囲外は ±1 に丸める
 */
export function scaleDeviationForDisplay(
  deviation: number,
  knee: number = IN_TUNE_DEVIATION
): number {
  const d = Math.max(-1, Math.min(1, deviation));
  return Math.asinh(d / knee) / Math.asinh(1 / knee);
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
 * 根音が変わった場合は同名音でも期待周波数 (純正律の基準) が変わるため、
 * すべて null にする。
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
  if (rootKey(analyzedPitchList) !== rootKey(currentPitchList)) {
    return currentPitchList.map(() => null);
  }
  const byKey = new Map<string, number | null>();
  analyzedPitchList.forEach((p, i) => {
    byKey.set(pitchKey(p), results[i] ?? null);
  });
  return currentPitchList.map((p) => byKey.get(pitchKey(p)) ?? null);
}

function rootKey(pitchList: Pitch[]): string | null {
  const root = pitchList.find((p) => p.isRoot);
  return root ? pitchKey(root) : null;
}
