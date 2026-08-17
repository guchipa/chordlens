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
  /**
   * 集約後の合計発音時間がこの値未満の音を除外する (秒)。
   * scoreMode "medianSalience" では適用しない (中央値が窓の過半で
   * 鳴っていることを暗黙に要求するため、別途の発音時間フィルタは不要)
   */
  minTotalDurationSeconds?: number;
  /**
   * 最大振幅がこの値未満の音を除外する (0〜1)。
   * scoreMode "medianSalience" では適用しない (minTotalDurationSeconds と同様)
   */
  minAmplitude?: number;
  /** 最有力音に対するスコア比がこの値未満の音を除外する (0〜1) */
  relativeScoreThreshold?: number;
  /** 採用する構成音の最大数 */
  maxNotes?: number;
  /**
   * 倍音位置 (オクターブ下 -12 / 12度下 -19) の音に対するスコア比が
   * この値未満の音を倍音の残滓として除外する (0〜1)。
   * フレーム単位の倍音抑制をすり抜けて一部フレームだけに出た第2・第3倍音を、
   * 時間集約後のスコアで刈る。真の重ねはスコアが同程度になるため残る。
   * 0 で無効
   */
  harmonicSuppressionScoreRatio?: number;
  /**
   * サブオクターブの差音 (combination tone) 幽霊音に対するスコア比の下限
   * (0〜1)。ある音 m の 12 半音上 (m+12) が検出リストにあり、m のスコアが
   * (m+12 のスコア) × この比率未満なら m を除外する。
   * 純正五度の2音 (根音 + 完全5度上) は録音系の非線形性により根音の
   * 1オクターブ下の狭帯域差音を生むことがあり、この差音は倍音系列
   * (差音自身の 1f/2f/3f...) を丸ごと持つため harmonicSuppressionScoreRatio
   * (系列の下方抑制) をすり抜ける。差音は一次音より 20dB 以上弱いことを
   * 利用して除去する。真のオクターブ重ね (2 音が実際に同時に鳴っている) は
   * スコアが拮抗するため残る。0 で無効 (既定)
   */
  subOctaveSuppressionScoreRatio?: number;
  /**
   * フレーム間集約の方式。
   * - "durationAmplitude" (既定): 合計発音時間 × 最大振幅 (二値採択の数え上げ)。
   *   basic-pitch 互換のため既定値として維持する
   * - "medianSalience": 連続サリエンス (provisional イベント含む) の時間中央値。
   *   閾値境界での採択の揺れに頑健 (pitchplease 推奨)
   */
  scoreMode?: "durationAmplitude" | "medianSalience";
  /** scoreMode "medianSalience" で使う分位点 (0〜1、線形補間) */
  salienceQuantile?: number;
  /** scoreMode "medianSalience" でこの値未満のスコアの音を除外する (0〜1) */
  minMedianSalience?: number;
}

export const CHORD_TONE_ESTIMATION_DEFAULTS: Required<ChordToneEstimationOptions> =
  {
    minTotalDurationSeconds: 0.15,
    minAmplitude: 0.1,
    relativeScoreThreshold: 0.15,
    maxNotes: 6,
    // 0.5 は実データの座標降下法探索の結果 (docs/CHORD_DETECTION.md §5)。
    // 調整用 (TUS)・検証用 (YCY) の両方で batch の誤検出が減った
    harmonicSuppressionScoreRatio: 0.5,
    subOctaveSuppressionScoreRatio: 0,
    scoreMode: "durationAmplitude",
    salienceQuantile: 0.5,
    minMedianSalience: 0.1,
  };

/** 集約段の倍音フィルタで参照する下方の半音オフセット (2f: -12, 3f: -19) */
const HARMONIC_SEMITONE_OFFSETS = [12, 19];

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

/** ノート開始時刻をミリ秒丸めで一意キー化する (フレーム境界の浮動小数誤差を吸収) */
function frameKey(startTimeSeconds: number): number {
  return Math.round(startTimeSeconds * 1000);
}

/** 分位点を線形補間で求める (values は空でないこと) */
function quantile(values: number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const pos = q * (sorted.length - 1);
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (pos - lower);
}

/**
 * ノートイベントを MIDI ノート番号ごとに集約し、連続サリエンスの時間中央値
 * (分位点 salienceQuantile) をスコアとする (scoreMode: "medianSalience")。
 *
 * provisional イベント (採択閾値未満の候補標本) も含めて標本とする。
 * アクティブフレーム (いずれかの MIDI が鳴ったフレーム) の集合を基準に、
 * 各 MIDI について「鳴っていないフレームは振幅 0」として埋めたベクトルの
 * 分位点をとる。二値採択の数え上げと異なり、閾値境界での採択の揺れに
 * 頑健である一方、ゼロ埋めにより「アクティブフレームの過半で鳴っている」
 * ことを暗黙に要求する
 */
function aggregateNoteEventsByMedianSalience(
  events: DetectedNoteEvent[],
  salienceQuantile: number
): AggregatedNote[] {
  const activeFrames = new Set<number>();
  for (const event of events) {
    activeFrames.add(frameKey(event.startTimeSeconds));
  }
  const frameList = [...activeFrames];
  if (frameList.length === 0) {
    return [];
  }

  const byMidi = new Map<number, Map<number, number>>();
  for (const event of events) {
    const midiNote = Math.round(event.midiNote);
    const key = frameKey(event.startTimeSeconds);
    let frames = byMidi.get(midiNote);
    if (!frames) {
      frames = new Map();
      byMidi.set(midiNote, frames);
    }
    frames.set(key, Math.max(frames.get(key) ?? 0, event.amplitude));
  }

  const result: AggregatedNote[] = [];
  for (const [midiNote, frames] of byMidi) {
    const vector = frameList.map((key) => frames.get(key) ?? 0);
    const score = quantile(vector, salienceQuantile);
    result.push({
      midiNote,
      // durationAmplitude モード専用のフィールドなので中央値集約では使わない
      totalDurationSeconds: 0,
      maxAmplitude: score,
      score,
    });
  }
  return result;
}

/**
 * 倍音位置 (オクターブ下 / 12度下) の音より大幅にスコアが低い音を
 * 第2・第3倍音の残滓として除外する
 */
function suppressWeakHarmonicDuplicates(
  notes: AggregatedNote[],
  scoreRatio: number
): AggregatedNote[] {
  if (scoreRatio <= 0) {
    return notes;
  }
  const scoreByMidi = new Map(notes.map((n) => [n.midiNote, n.score]));
  return notes.filter((note) =>
    HARMONIC_SEMITONE_OFFSETS.every((offset) => {
      const baseScore = scoreByMidi.get(note.midiNote - offset);
      return baseScore === undefined || note.score >= baseScore * scoreRatio;
    })
  );
}

/**
 * 差音 (combination tone) 由来のサブオクターブ幽霊音を除去する。
 * suppressWeakHarmonicDuplicates (下方向: m の系列を m-12/-19 と比較) と
 * 対称の、上方向 (m+12) 参照の抑制。詳細は
 * subOctaveSuppressionScoreRatio のコメント参照
 */
function suppressSubOctaveGhosts(
  notes: AggregatedNote[],
  scoreRatio: number
): AggregatedNote[] {
  if (scoreRatio <= 0) {
    return notes;
  }
  const scoreByMidi = new Map(notes.map((n) => [n.midiNote, n.score]));
  return notes.filter((note) => {
    const upperScore = scoreByMidi.get(note.midiNote + 12);
    return upperScore === undefined || note.score >= upperScore * scoreRatio;
  });
}

/**
 * 隣接半音のペアはスコアの高い方に解決する。
 * デチューンした音 (格子の中間の音程) はフレームによって上下どちらの
 * 半音に量子化されるかが揺れ、集約すると両方が残ってしまう。
 * この文脈 (和音の構成音) で短2度が同時に鳴ることはないとみなす
 */
function resolveAdjacentSemitones(notes: AggregatedNote[]): AggregatedNote[] {
  const scoreByMidi = new Map(notes.map((n) => [n.midiNote, n.score]));
  return notes.filter((note) => {
    const lower = scoreByMidi.get(note.midiNote - 1);
    const upper = scoreByMidi.get(note.midiNote + 1);
    // 同点は低い方を優先する (どちらかは必ず残る)
    if (lower !== undefined && note.score <= lower) return false;
    if (upper !== undefined && note.score < upper) return false;
    return true;
  });
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
  const inOctaveRange = (note: AggregatedNote) => {
    const { octaveNum } = midiNoteToPitch(note.midiNote);
    return octaveNum >= minOctave && octaveNum <= maxOctave;
  };

  const aggregated =
    opts.scoreMode === "medianSalience"
      ? suppressSubOctaveGhosts(
          suppressWeakHarmonicDuplicates(
            resolveAdjacentSemitones(
              aggregateNoteEventsByMedianSalience(
                events,
                opts.salienceQuantile
              ).filter(
                (note) =>
                  note.score >= opts.minMedianSalience && inOctaveRange(note)
              )
            ),
            opts.harmonicSuppressionScoreRatio
          ),
          opts.subOctaveSuppressionScoreRatio
        )
      : suppressSubOctaveGhosts(
          suppressWeakHarmonicDuplicates(
            resolveAdjacentSemitones(
              // durationAmplitude (legacy) は provisional (採択閾値未満の候補標本)
              // を集約前に除外する。provisional は medianSalience 専用の標本であり、
              // legacy の二値採択に混ぜると閾値未満の音が発音時間としてカウントされ
              // てしまう (streaming の短い集約窓で特に汚染が大きい)
              aggregateNoteEvents(events.filter((e) => !e.provisional)).filter(
                (note) =>
                  note.totalDurationSeconds >= opts.minTotalDurationSeconds &&
                  note.maxAmplitude >= opts.minAmplitude &&
                  inOctaveRange(note)
              )
            ),
            opts.harmonicSuppressionScoreRatio
          ),
          opts.subOctaveSuppressionScoreRatio
        );

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
