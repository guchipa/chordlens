/**
 * 構成音推定 (Chord Tone Estimation)
 *
 * NoteDetector (adapters/noteDetection.ts) が返すノートイベント列を集約し、
 * チューナーの構成音リスト (Pitch[]) へ変換する。
 *
 * 処理の流れ:
 * 1. MIDI ノート番号ごとに発音時間と振幅を集約
 * 2. 絶対閾値 (発音時間・振幅) と相対スコア閾値で誤検出 (倍音など) を除去
 * 3. スコア上位 maxNotes 音を採用し、低い順に並べる
 * 4. ルート音をコード照合 (estimateRoot) で推定。確定できなければ最低音をルートとする
 */

import { OCTAVE_NUM_LIST, PITCH_NAME_LIST } from "../constants";
import type { DetectedNoteEvent } from "../adapters/noteDetection";
import type { Pitch } from "../types";
import { estimateRoot } from "./rootEstimation";

export interface ChordToneEstimationOptions {
  /** 集約後の合計発音時間がこの値未満の音を除外する (秒) */
  minTotalDurationSeconds?: number;
  /** 最大振幅がこの値未満の音を除外する (0〜1) */
  minAmplitude?: number;
  /** 最有力音に対するスコア比がこの値未満の音を除外する (0〜1) */
  relativeScoreThreshold?: number;
  /** 採用する構成音の最大数 */
  maxNotes?: number;
}

export const CHORD_TONE_ESTIMATION_DEFAULTS: Required<ChordToneEstimationOptions> =
  {
    minTotalDurationSeconds: 0.15,
    minAmplitude: 0.1,
    relativeScoreThreshold: 0.15,
    maxNotes: 6,
  };

/**
 * MIDI ノート番号を音名とオクターブ番号に変換する (C4 = 60, A4 = 69)
 */
export function midiNoteToPitch(midiNote: number): {
  pitchName: string;
  octaveNum: number;
} {
  const rounded = Math.round(midiNote);
  const pitchName = PITCH_NAME_LIST[((rounded % 12) + 12) % 12];
  const octaveNum = Math.floor(rounded / 12) - 1;
  return { pitchName, octaveNum };
}

interface AggregatedNote {
  midiNote: number;
  totalDurationSeconds: number;
  maxAmplitude: number;
  /** 採用判定に使うスコア = 合計発音時間 × 最大振幅 */
  score: number;
}

/**
 * ノートイベントを MIDI ノート番号ごとに集約してスコア付けする
 */
function aggregateNoteEvents(events: DetectedNoteEvent[]): AggregatedNote[] {
  const byMidi = new Map<
    number,
    { totalDurationSeconds: number; maxAmplitude: number }
  >();

  for (const event of events) {
    const midiNote = Math.round(event.midiNote);
    const existing = byMidi.get(midiNote);
    if (existing) {
      existing.totalDurationSeconds += event.durationSeconds;
      existing.maxAmplitude = Math.max(existing.maxAmplitude, event.amplitude);
    } else {
      byMidi.set(midiNote, {
        totalDurationSeconds: event.durationSeconds,
        maxAmplitude: event.amplitude,
      });
    }
  }

  return Array.from(byMidi.entries()).map(
    ([midiNote, { totalDurationSeconds, maxAmplitude }]) => ({
      midiNote,
      totalDurationSeconds,
      maxAmplitude,
      score: totalDurationSeconds * maxAmplitude,
    })
  );
}

/**
 * ルート音を割り当てる。
 * estimateRoot (コード定義との照合) で推定し、確定できなければ最低音をルートとする。
 * isRoot は必ず 1 音のみ true になるよう正規化する。
 */
function assignRoot(pitchList: Pitch[]): Pitch[] {
  if (pitchList.length === 0) {
    return pitchList;
  }

  let result: Pitch[] = pitchList.map((p) => ({ ...p, isRoot: false }));
  estimateRoot(result, (updated) => {
    result = updated;
  });

  // estimateRoot は同名の音すべてに isRoot を立てるため、最低音側の 1 音に絞る。
  // コード照合で確定しなかった場合は最低音をルートとする
  const firstRootIndex = result.findIndex((p) => p.isRoot);
  const rootIndex = firstRootIndex !== -1 ? firstRootIndex : 0;
  return result.map((p, i) => ({ ...p, isRoot: i === rootIndex }));
}

/**
 * ノートイベント列を構成音リスト (Pitch[]) に変換する
 *
 * @param events NoteDetector が返したノートイベント
 * @param options 閾値の調整 (省略時 CHORD_TONE_ESTIMATION_DEFAULTS)
 * @returns MIDI ノート番号の昇順に並んだ構成音リスト。検出なしの場合は空配列
 */
export function noteEventsToPitchList(
  events: DetectedNoteEvent[],
  options: ChordToneEstimationOptions = {}
): Pitch[] {
  const opts = { ...CHORD_TONE_ESTIMATION_DEFAULTS, ...options };

  const minOctave = Math.min(...OCTAVE_NUM_LIST);
  const maxOctave = Math.max(...OCTAVE_NUM_LIST);

  const aggregated = aggregateNoteEvents(events).filter((note) => {
    const { octaveNum } = midiNoteToPitch(note.midiNote);
    return (
      note.totalDurationSeconds >= opts.minTotalDurationSeconds &&
      note.maxAmplitude >= opts.minAmplitude &&
      octaveNum >= minOctave &&
      octaveNum <= maxOctave
    );
  });

  if (aggregated.length === 0) {
    return [];
  }

  const maxScore = Math.max(...aggregated.map((n) => n.score));
  const selected = aggregated
    .filter((n) => n.score >= maxScore * opts.relativeScoreThreshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.maxNotes)
    .sort((a, b) => a.midiNote - b.midiNote);

  const pitchList: Pitch[] = selected.map((note) => {
    const { pitchName, octaveNum } = midiNoteToPitch(note.midiNote);
    return { pitchName, octaveNum, isRoot: false, enabled: true };
  });

  return assignRoot(pitchList);
}
