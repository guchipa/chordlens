/**
 * 構成音の「役割」(根音からの度数) と「声部」(音高順) の判定。
 *
 * 自動追従で構成音が入れ替わると、音名で色分け・並べ替えた表示は
 * 奏者が自分の音を見失う。和音が変わっても奏者ごとに安定しているのは
 * 声部 (何番目に高い音か)、狙うべきズレを決めるのは役割 (3 度・5 度など)
 * なので、フィードバックはこの 2 軸で構成する。
 */

import { JUST_RATIOS, PITCH_NAME_LIST } from "../constants";
import type { Pitch } from "../types";

/** 役割の大分類 (色分けの単位) */
export type ChordRole = "root" | "third" | "fifth" | "seventh" | "other";

/** 根音からの半音数 (0〜11) ごとの音程名 */
export const INTERVAL_LABELS: Record<number, string> = {
  0: "根音",
  1: "短2度",
  2: "長2度",
  3: "短3度",
  4: "長3度",
  5: "完全4度",
  6: "増4度/減5度",
  7: "完全5度",
  8: "短6度",
  9: "長6度",
  10: "短7度",
  11: "長7度",
};

const ROLE_BY_INTERVAL: Record<number, ChordRole> = {
  0: "root",
  1: "other",
  2: "other",
  3: "third",
  4: "third",
  5: "other",
  6: "fifth",
  7: "fifth",
  8: "fifth",
  9: "other",
  10: "seventh",
  11: "seventh",
};

/** 音名+オクターブのキー (例: "E4")。解析結果との対応付けにも使う */
export function pitchKey(pitch: Pick<Pitch, "pitchName" | "octaveNum">): string {
  return `${pitch.pitchName}${pitch.octaveNum}`;
}

/** 半音の通し番号 (音高の比較用) */
export function semitoneIndex(pitch: Pick<Pitch, "pitchName" | "octaveNum">): number {
  return PITCH_NAME_LIST.indexOf(pitch.pitchName) + 12 * pitch.octaveNum;
}

/** 根音からの半音数を 0〜11 に正規化した値 */
export function intervalFromRoot(
  pitch: Pick<Pitch, "pitchName" | "octaveNum">,
  root: Pick<Pitch, "pitchName" | "octaveNum">
): number {
  const distance = semitoneIndex(pitch) - semitoneIndex(root);
  return ((distance % 12) + 12) % 12;
}

export function chordRoleOf(interval: number): ChordRole {
  return ROLE_BY_INTERVAL[((interval % 12) + 12) % 12];
}

/**
 * 純正律の目標が平均律から何セント離れているか (純正律 − 平均律)。
 * 例: 長3度 ≈ −13.7、完全5度 ≈ +2.0。奏者が「平均律から何セント直すか」の目安
 */
export function justOffsetFromEqualCents(interval: number): number {
  const i = ((interval % 12) + 12) % 12;
  return 1200 * Math.log2(JUST_RATIOS[i]) - 100 * i;
}

export interface VoiceInfo {
  /** 音名+オクターブのキー */
  key: string;
  pitch: Pitch;
  /** 根音からの半音数 (0〜11)。根音がなければ null */
  interval: number | null;
  /** 音程名 (例: "長3度")。根音がなければ null */
  intervalLabel: string | null;
  role: ChordRole | null;
  /** 純正律 − 平均律 (セント)。根音がなければ null */
  justOffsetCents: number | null;
}

/**
 * 有効な構成音を低い順に並べ、役割を付ける。
 * 根音が 1 つに定まらない場合、役割関連の値は null になる
 */
export function describeVoices(pitchList: Pitch[]): VoiceInfo[] {
  const enabled = pitchList.filter((p) => p.enabled);
  const roots = enabled.filter((p) => p.isRoot);
  const root = roots.length === 1 ? roots[0] : null;

  return [...enabled]
    .sort((a, b) => semitoneIndex(a) - semitoneIndex(b))
    .map((pitch) => {
      const interval = root ? intervalFromRoot(pitch, root) : null;
      return {
        key: pitchKey(pitch),
        pitch,
        interval,
        intervalLabel: interval === null ? null : INTERVAL_LABELS[interval],
        role: interval === null ? null : chordRoleOf(interval),
        justOffsetCents: interval === null ? null : justOffsetFromEqualCents(interval),
      };
    });
}
