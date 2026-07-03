/**
 * 楽器→担当音マッピング（仮置き）
 *
 * 論文の実験では、ペアが B♭(D+F) / Cm(E♭+G) / F7(A+E♭) の 2 音を演奏し、
 * 根音はシステムが再生する。どちらのメンバーがどの音を担当するかを、
 * 楽器の音域（= INSTRUMENT_RANGE）から自動的に割り振る。
 *
 */
import { A4_FREQ } from "@chordlens/core/constants";
import type { Pitch } from "@chordlens/core/types";
import type { ChordKey, RootNote } from "./constants";
import { CHORD_ROOT_KEY } from "./constants";
import type {
  ChordPartAssignments,
  ChordPitches,
  PartAssignment,
} from "./types";

export const INSTRUMENT_KEYS = [
  "trumpet",
  "trombone",
  "horn",
  "tuba",
  "euphonium",
  "clarinet",
  "bass-clarinet",
  "alto-sax",
  "tenor-sax",
  "baritone-sax",
  "flute",
  "oboe",
  "bassoon",
] as const;

export type InstrumentKey = (typeof INSTRUMENT_KEYS)[number];

export const INSTRUMENT_LABELS: Record<InstrumentKey, string> = {
  trumpet: "トランペット",
  trombone: "トロンボーン",
  horn: "ホルン",
  tuba: "チューバ",
  euphonium: "ユーフォニアム",
  clarinet: "クラリネット",
  "bass-clarinet": "バスクラリネット",
  "alto-sax": "アルトサックス",
  "tenor-sax": "テナーサックス",
  "baritone-sax": "バリトンサックス",
  flute: "フルート",
  oboe: "オーボエ",
  bassoon: "ファゴット",
};

/**
 * 楽器のおおよその得意音域（実音オクターブ）。担当音割当のためのヒント。
 */
const INSTRUMENT_RANGE_CENTER: Record<InstrumentKey, number> = {
  trumpet: 4,
  trombone: 3,
  horn: 3,
  tuba: 2,
  euphonium: 3,
  clarinet: 4,
  "bass-clarinet": 3,
  "alto-sax": 4,
  "tenor-sax": 3,
  "baritone-sax": 2,
  flute: 5,
  oboe: 4,
  bassoon: 2,
};

/**
 * 各和音の「担当音名（実音）」と「根音以外の2音の既定オクターブ」。
 * オクターブは後で楽器に合わせて再調整する。
 */
const CHORD_PART_NOTES: Record<
  ChordKey,
  { notes: [string, string]; defaultOctave: number }
> = {
  Bb: { notes: ["D", "F"], defaultOctave: 4 },
  Cm: { notes: ["Eb", "G"], defaultOctave: 4 },
  F7: { notes: ["A", "Eb"], defaultOctave: 4 },
};

/** 根音の音名から C を基準とした半音クラス */
const ROOT_PITCH_CLASS: Record<RootNote, number> = {
  C: 0,
  F: 5,
  Bb: 10,
};

/** 楽器音域平均オクターブからの根音オクターブ補正値 */
const ROOT_OCTAVE_OFFSET: Record<RootNote, number> = {
  C: 0,
  F: 0,
  Bb: -1,
};

// OCTAVE_NUM_LIST = [1,2,3,4,5,6] なので A4 の半音インデックス = 9 + 12*(4-1) = 45
const A4_SEMITONE_IDX = 45;

/**
 * 2人の楽器の得意オクターブの平均から根音を再生するオクターブを決定する。
 */
function getRootOctaveForInstruments(
  instruments: [InstrumentKey | null, InstrumentKey | null]
): number {
  const [instA, instB] = instruments;
  const centerA = instA ? INSTRUMENT_RANGE_CENTER[instA] : 4;
  const centerB = instB ? INSTRUMENT_RANGE_CENTER[instB] : 4;
  return Math.round((centerA + centerB) / 2);
}

/**
 * 2人の楽器の得意オクターブに合わせた根音の周波数 (Hz) を返す。
 * A4 = A4_FREQ Hz の平均律を使用。
 */
export function getRootFreqHz(
  rootNote: RootNote,
  instruments: [InstrumentKey | null, InstrumentKey | null]
): number {
  const octave = getRootOctaveForInstruments(instruments) + ROOT_OCTAVE_OFFSET[rootNote];
  const semitoneIdx = ROOT_PITCH_CLASS[rootNote] + 12 * (octave - 1);
  return A4_FREQ * Math.pow(2, (semitoneIdx - A4_SEMITONE_IDX) / 12);
}

/**
 * オクターブ数を楽器音域に合わせてシフトする（＋/−1オクターブのみ許容）。
 */
function adjustOctaveForInstrument(
  baseOctave: number,
  instrument: InstrumentKey | null
): number {
  if (!instrument) return baseOctave;
  const center = INSTRUMENT_RANGE_CENTER[instrument];
  if (center >= baseOctave + 1) return baseOctave + 1;
  if (center <= baseOctave - 1) return baseOctave - 1;
  return baseOctave;
}

/**
 * ペアの楽器から各和音のパート割当を決定する。
 *
 * - 2 つの担当音のうち、楽器音域が低い方のメンバーに低い音を、
 *   高い方のメンバーに高い音を割り当てる（入れ替え UI で後から変更可能）。
 * - 同率の場合は 1 番目のメンバーを低音担当とする。
 */
export function derivePartAssignment(
  instruments: [InstrumentKey | null, InstrumentKey | null]
): ChordPartAssignments {
  const [instA, instB] = instruments;
  const centerA = instA ? INSTRUMENT_RANGE_CENTER[instA] : 3;
  const centerB = instB ? INSTRUMENT_RANGE_CENTER[instB] : 3;
  const aPlaysLow = centerA <= centerB;

  const assign = (chord: ChordKey): PartAssignment => {
    const [low, high] = CHORD_PART_NOTES[chord].notes;
    return aPlaysLow
      ? { memberA: low, memberB: high }
      : { memberA: high, memberB: low };
  };

  return {
    Bb: assign("Bb"),
    Cm: assign("Cm"),
    F7: assign("F7"),
  };
}

/**
 * ペアの楽器＋担当割当から、ChordLens 解析プリセット用の Pitch[] を生成する。
 * 根音は `isRoot: true, enabled: false` で含める。純正律計算が根音を必須とする
 * ためで、`enabled: false` により評価・表示からは除外される。
 */
export function derivePitchLists(
  instruments: [InstrumentKey | null, InstrumentKey | null],
  assignment: ChordPartAssignments
): ChordPitches {
  const rootOctave = getRootOctaveForInstruments(instruments);
  const build = (chord: ChordKey): Pitch[] => {
    const { defaultOctave } = CHORD_PART_NOTES[chord];
    const octA = adjustOctaveForInstrument(defaultOctave, instruments[0]);
    const octB = adjustOctaveForInstrument(defaultOctave, instruments[1]);
    const rootKey = CHORD_ROOT_KEY[chord];
    const notes: Pitch[] = [
      {
        pitchName: rootKey,
        octaveNum: rootOctave + ROOT_OCTAVE_OFFSET[rootKey],
        isRoot: true,
        enabled: false,
      },
      {
        pitchName: assignment[chord].memberA,
        octaveNum: octA,
        isRoot: false,
        enabled: true,
      },
      {
        pitchName: assignment[chord].memberB,
        octaveNum: octB,
        isRoot: false,
        enabled: true,
      },
    ];
    // 同音同オクターブになった場合は重複除去。
    return dedupePitches(notes);
  };

  return {
    Bb: build("Bb"),
    Cm: build("Cm"),
    F7: build("F7"),
  };
}

export function dedupePitches(pitches: Pitch[]): Pitch[] {
  const seen = new Set<string>();
  const out: Pitch[] = [];
  for (const p of pitches) {
    const key = `${p.pitchName}${p.octaveNum}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}
