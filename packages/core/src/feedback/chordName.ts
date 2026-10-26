/**
 * 構成音リストからの和音名 (コードシンボル) の決定。
 *
 * 根音は構成音リストの isRoot を正とする (自動追従なら推定器の結果、
 * 手入力ならユーザー指定)。ここでは度数集合を記号に引くだけで、
 * 根音の推定はしない。
 */

import type { Pitch } from "../types";
import { pitchListKey } from "../presets/pitchListKey";
import { INTERVAL_LABELS, intervalFromRoot } from "./chordRoles";

/** 度数集合 (昇順を "," 連結) → コードの接尾辞 */
const CHORD_SUFFIXES: Record<string, string> = {
  "0,4,7": "",
  "0,3,7": "m",
  "0,3,6": "dim",
  "0,4,8": "aug",
  "0,5,7": "sus4",
  "0,2,7": "sus2",
  "0,4,7,10": "7",
  "0,4,7,11": "maj7",
  "0,3,7,10": "m7",
  "0,3,7,11": "mMaj7",
  "0,3,6,10": "m7(♭5)",
  "0,3,6,9": "dim7",
  "0,4,7,9": "6",
  "0,3,7,9": "m6",
  "0,5,7,10": "7sus4",
  "0,4,10": "7(omit5)",
  "0,3,10": "m7(omit5)",
  "0,4,11": "maj7(omit5)",
  "0,7": "5",
};

export interface ChordName {
  /** 根音の音名 (オクターブなし) */
  rootName: string;
  /**
   * コードシンボル (例: "C", "Am7")。2 音の場合は音程名で表す
   * (例: "C + 長3度")。表に無い組み合わせは null
   */
  symbol: string | null;
}

/**
 * 有効な構成音から和音名を決める。根音が 1 つに定まらない場合は null
 */
export function nameChord(pitchList: Pitch[]): ChordName | null {
  const enabled = pitchList.filter((p) => p.enabled);
  const roots = enabled.filter((p) => p.isRoot);
  if (roots.length !== 1) return null;
  const root = roots[0];

  const intervals = [...new Set(enabled.map((p) => intervalFromRoot(p, root)))].sort(
    (a, b) => a - b
  );

  if (intervals.length === 1) {
    return { rootName: root.pitchName, symbol: root.pitchName };
  }

  const suffix = CHORD_SUFFIXES[intervals.join(",")];
  if (suffix !== undefined) {
    return { rootName: root.pitchName, symbol: `${root.pitchName}${suffix}` };
  }

  if (intervals.length === 2) {
    return {
      rootName: root.pitchName,
      symbol: `${root.pitchName} + ${INTERVAL_LABELS[intervals[1]]}`,
    };
  }

  return { rootName: root.pitchName, symbol: null };
}

/**
 * 和音の同一判定キー。自動追従と食い違わないよう pitchListKey と同じ
 * (有効な音のみ・音高順で、登録順に依存しない)
 */
export function chordKey(pitchList: Pitch[]): string {
  return pitchListKey(pitchList);
}
