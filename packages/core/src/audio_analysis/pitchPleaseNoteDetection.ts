/**
 * PitchPleaseNoteDetector - 倍音和サリエンスによる NoteDetector 実装
 *
 * pitchplease (https://www.npmjs.com/package/pitchplease) の「音名別の
 * 単一周波数 DFT」という発想を出発点に、実楽器の多音検出へ拡張した実装。
 * 相関計算は Goertzel アルゴリズム (goertzel.ts) で行う。
 *
 * 実録音 (吹奏楽器のアンサンブル) で成立させるための 3 つの仕組み:
 *
 * 1. デチューン耐性: 奏者の音程は平均律格子から ±50 セント近くズレる
 *    (そもそも本アプリはそのズレを可視化するチューナーである)。
 *    各音名ビンは ±40 セントの複数オフセットで測り最大値を採る。
 * 2. 倍音和サリエンス: 金管の第2倍音・クラリネットの第3倍音は基音より
 *    強いことがあり、ビン単体の振幅比較では基音と倍音を区別できない。
 *    候補ごとに倍音系列 (1f〜6f) の重み付き和 (サリエンス) を計算し、
 *    系列全体で音の実在を判定する。
 * 3. 貪欲減算: サリエンス最大の音から順に採用し、採用した音の倍音位置の
 *    エネルギーを残差から差し引いてから次を探す。倍音位置の候補は
 *    減算後の残差では立たなくなるため、倍音の誤検出が構造的に消える。
 *
 * フレーム間の集約は chordToneEstimation.ts が担う。
 */

import { A4_FREQ } from "../constants";
import { goertzelPower } from "./goertzel";
import type {
  DetectedNoteEvent,
  NoteDetector,
} from "../adapters/noteDetection";

export interface PitchPleaseNoteDetectorOptions {
  /** A4 の基準周波数 (Hz)。候補音の周波数生成に使う */
  a4Freq?: number;
  /** 入力バッファのサンプルレート (Hz) */
  sampleRate?: number;
  /** 候補音の下限 MIDI ノート番号 (デフォルト: C1 = 24) */
  minMidiNote?: number;
  /** 候補音の上限 MIDI ノート番号 (デフォルト: B6 = 95) */
  maxMidiNote?: number;
  /** 解析フレーム長 (秒) */
  frameSeconds?: number;
  /** 候補の基音ビンに要求する正規化振幅の下限 (0〜1) */
  fundamentalThreshold?: number;
  /** フレーム内最大サリエンスに対する採用閾値 (0〜1) */
  salienceThreshold?: number;
  /** 無音とみなすフレーム RMS 閾値 */
  silenceRmsThreshold?: number;
  /** 1 フレームで採用する音の最大数 */
  maxNotesPerFrame?: number;
  /** 倍音位置の減算率 (倍音が立っている複合音) */
  harmonicRichSubtract?: number;
  /** 倍音位置の減算率 (倍音を持たない純音) */
  harmonicPureSubtract?: number;
  /** サブオクターブ降下のサリエンス拮抗判定比 */
  subHarmonicDescendRatio?: number;
}

export const PITCH_PLEASE_DEFAULTS: Required<PitchPleaseNoteDetectorOptions> = {
  a4Freq: A4_FREQ,
  sampleRate: 22050,
  // C1 (32Hz) ではなく C2 (65Hz) を下限とする: 電源ハム (50/60Hz) が
  // C1-B1 の格子とデチューン探索幅の内側に落ちるため。管楽器の和音練習で
  // C2 未満の構成音は実用上現れない
  minMidiNote: 36, // C2
  maxMidiNote: 95, // B6
  frameSeconds: 0.25,
  fundamentalThreshold: 0.15,
  salienceThreshold: 0.3,
  silenceRmsThreshold: 0.01,
  maxNotesPerFrame: 6,
  harmonicRichSubtract: 0.9,
  harmonicPureSubtract: 0.3,
  // 0.85 は実データの座標降下法探索の結果 (docs/CHORD_DETECTION.md §5)。
  // 調整用 (TUS)・検証用 (YCY) の両方でストリーミング経路が改善した
  subHarmonicDescendRatio: 0.85,
};

/**
 * デチューン探索の目標カバー幅 (セント)。奏者の音程ズレ ±45 セント弱を
 * カバーする。オフセットの刻みは周波数ごとの DFT メインローブ幅に合わせる:
 * 低音域はローブが広く 0 オフセットだけで ±45 セントを覆える一方、
 * むやみに広く探索すると隣の半音の実音まで拾ってしまう
 * (65Hz ではローブ半幅が ±50 セント相当ある)
 */
const DETUNE_COVER_CENTS = 45;

/**
 * 周波数ごとのデチューン探索オフセットを返す。
 * frameSeconds の矩形窓 DFT の実効捕捉半幅 ≈ 1/(2·frameSeconds) Hz を
 * セントに換算し、それより粗い刻みで DETUNE_COVER_CENTS まで並べる
 */
function detuneOffsetsForFreq(
  freqHz: number,
  frameSeconds: number
): number[] {
  const captureHz = 1 / (2 * frameSeconds);
  const halfWidthCents = 1200 * Math.log2(1 + captureHz / freqHz);
  if (halfWidthCents >= DETUNE_COVER_CENTS) {
    return [0];
  }
  const step = Math.max(15, halfWidthCents);
  const offsets = [0];
  for (let c = step; c <= DETUNE_COVER_CENTS; c += step) {
    offsets.push(c, -c);
  }
  return offsets;
}

/**
 * 倍音系列の半音オフセット (1f〜6f)。平均律格子からの偏差は
 * 0, 0, +2, 0, -14, +2 セントで、デチューン探索幅に吸収される
 */
const HARMONIC_SEMITONE_OFFSETS = [0, 12, 19, 24, 28, 31];

/**
 * サリエンスの倍音重み。基音を 1 として高次ほど軽くするが、
 * 基音が弱い実楽器 (金管・クラリネット) でも倍音側から音の実在を
 * 拾えるよう、単純な 1/k より緩やかに減衰させる
 */
const SALIENCE_WEIGHTS = [1.0, 0.6, 0.45, 0.35, 0.3, 0.25];

/**
 * 減算の使い分け (harmonicRichSubtract / harmonicPureSubtract オプション):
 * - 倍音が立っている音 (実楽器の複合音) は倍音位置のエネルギーを
 *   ほぼすべてその音由来とみなして強く引く
 * - 倍音がまったくない音 (純音に近い) の倍音位置のエネルギーは
 *   別の実音の可能性が高いので少しだけ引く
 */
/** 「倍音が立っている」とみなす正規化振幅の下限 */
const HARMONIC_PRESENT_MIN = 0.15;
/** リッチ (複合音) 判定に要求する倍音の本数 */
const RICH_HARMONIC_COUNT = 1;
/**
 * サブオクターブ降下 (subHarmonicDescendRatio オプション):
 * 採用直前の候補に対し、そのオクターブ下 (または 12度下) のサリエンスが
 * この比率以上なら低い方を基音として優先する。
 * 基音が弱い実楽器では倍音位置 (2f) のサリエンスが基音をわずかに上回る
 * ことがある (倍音位置は自身の系列 {2f,4f,6f} を高い重みで拾うため)。
 * 真の基音は系列全体を拾うのでサリエンスは拮抗し、この降下で正しい側に倒す
 */
/** サブオクターブ降下で調べる下方オフセット (2f: -12, 3f: -19) */
const DESCEND_SEMITONE_OFFSETS = [12, 19];
/**
 * サブオクターブ降下の対象に要求する基音ビンの正規化振幅の下限。
 * 通常の採用閾値 (fundamentalThreshold) よりやや高くし、
 * ノイズ床程度の基音ビンしか持たない位置へ降下しないようにする
 */
const DESCEND_FUNDAMENTAL_MIN = 0.15;

/**
 * この MIDI ノート未満の候補は倍音サポート (2f または 3f) を必須にする。
 * 実楽器の低音は必ず倍音を持つ一方、電源ハム (50/60Hz とその倍波) や
 * 空調・息などの低域ランブルは半音格子に倍音が乗らないためここで除去される
 */
export const LOW_NOTE_SUPPORT_MAX_MIDI = 55; // G3 未満
/** 低音候補に要求する倍音サポートの正規化振幅の下限 */
export const LOW_NOTE_SUPPORT_MIN = 0.15;

/** MIDI ノート番号 → 周波数 (Hz) */
function midiNoteToFreq(midiNote: number, a4Freq: number): number {
  return a4Freq * Math.pow(2, (midiNote - 69) / 12);
}

function frameRms(frame: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) {
    sum += frame[i] * frame[i];
  }
  return Math.sqrt(sum / frame.length);
}

/**
 * この値以上のサンプルレート入力は隣接ペア平均で 1/2 にデシメーションする。
 * 解析対象の最高周波数は最高候補音 B6 の 6 倍音 ≈ 11.8kHz なので、
 * 24kHz (Nyquist 12kHz) あれば足りる。48kHz をそのまま解析すると
 * Goertzel のサンプルループが倍かかり、メインスレッドを塞ぐ
 */
const DECIMATION_MIN_SAMPLE_RATE = 32000;

/** 隣接 2 サンプルの平均で 1/2 デシメーションする (粗いローパス込み) */
function decimateByTwo(audio: Float32Array): Float32Array {
  const out = new Float32Array(Math.floor(audio.length / 2));
  for (let i = 0; i < out.length; i++) {
    out[i] = (audio[2 * i] + audio[2 * i + 1]) / 2;
  }
  return out;
}

/**
 * 残差振幅から倍音和サリエンスを計算する。
 * lookup は範囲外の MIDI ノートに対して 0 を返すこと
 */
export function harmonicSalience(
  midiNote: number,
  amplitudeByMidi: (midiNote: number) => number
): number {
  let salience = 0;
  for (let k = 0; k < HARMONIC_SEMITONE_OFFSETS.length; k++) {
    salience +=
      SALIENCE_WEIGHTS[k] *
      amplitudeByMidi(midiNote + HARMONIC_SEMITONE_OFFSETS[k]);
  }
  return salience;
}

export class PitchPleaseNoteDetector implements NoteDetector {
  readonly requiredSampleRate: number;

  private options: Required<PitchPleaseNoteDetectorOptions>;
  /** 実際に解析するサンプルレート (高レート入力はデシメーション後) */
  private analysisSampleRate: number;
  /** 候補音の数 (minMidiNote〜maxMidiNote) */
  private candidateCount: number;
  /**
   * 解析する周波数リスト (index = midiNote - minMidiNote)。
   * 候補範囲に加え、サリエンス計算用に最高候補音の 6f 相当まで拡張する
   * (Nyquist 未満のみ)
   */
  private noteFrequencies: number[];

  constructor(options: PitchPleaseNoteDetectorOptions = {}) {
    this.options = { ...PITCH_PLEASE_DEFAULTS, ...options };
    this.requiredSampleRate = this.options.sampleRate;
    this.analysisSampleRate =
      this.options.sampleRate >= DECIMATION_MIN_SAMPLE_RATE
        ? this.options.sampleRate / 2
        : this.options.sampleRate;

    const { minMidiNote, maxMidiNote, a4Freq } = this.options;
    const sampleRate = this.analysisSampleRate;
    this.candidateCount = maxMidiNote - minMidiNote + 1;
    const maxHarmonicOffset =
      HARMONIC_SEMITONE_OFFSETS[HARMONIC_SEMITONE_OFFSETS.length - 1];
    this.noteFrequencies = [];
    for (
      let midiNote = minMidiNote;
      midiNote <= maxMidiNote + maxHarmonicOffset;
      midiNote++
    ) {
      const freq = midiNoteToFreq(midiNote, a4Freq);
      // デチューン探索の上端が Nyquist を超えない範囲まで
      if (
        midiNote > maxMidiNote &&
        freq * Math.pow(2, DETUNE_COVER_CENTS / 1200) >= sampleRate / 2
      ) {
        break;
      }
      this.noteFrequencies.push(freq);
    }
  }

  /**
   * 各音名ビンをデチューン探索付きで測り、正規化振幅の配列を返す。
   * 正規化の基準は候補範囲内の最大値
   */
  private measureAmplitudes(frame: Float32Array): number[] | null {
    const { frameSeconds } = this.options;
    const sampleRate = this.analysisSampleRate;
    const powers = this.noteFrequencies.map((baseFreq) => {
      let best = 0;
      for (const cents of detuneOffsetsForFreq(baseFreq, frameSeconds)) {
        const freq = baseFreq * Math.pow(2, cents / 1200);
        if (freq >= sampleRate / 2) continue;
        const p = goertzelPower(frame, freq, sampleRate);
        if (p > best) best = p;
      }
      return best;
    });

    const maxPower = Math.max(...powers.slice(0, this.candidateCount));
    if (maxPower <= 0) {
      return null;
    }
    // power は振幅の2乗なので振幅スケールに戻して正規化する
    return powers.map((p) => Math.sqrt(p / maxPower));
  }

  /**
   * 1 フレームぶんの音を貪欲減算で選び出す。
   * 返り値は { midiNote, amplitude (= 正規化サリエンス) } のリスト
   */
  private detectFrameNotes(
    frame: Float32Array
  ): { midiNote: number; amplitude: number }[] {
    const {
      minMidiNote,
      fundamentalThreshold,
      salienceThreshold,
      maxNotesPerFrame,
      harmonicRichSubtract,
      harmonicPureSubtract,
      subHarmonicDescendRatio,
    } = this.options;

    const amplitudes = this.measureAmplitudes(frame);
    if (!amplitudes) {
      return [];
    }

    const residual = amplitudes.slice();
    const residualByMidi = (midiNote: number) =>
      residual[midiNote - minMidiNote] ?? 0;

    // 候補: 基音ビンが立っていて局所ピークであること (隣接半音への漏れ除去)。
    // 低音域は倍音サポートも要求する (電源ハム対策)
    const eligible: number[] = [];
    for (let i = 0; i < this.candidateCount; i++) {
      const isLocalPeak =
        (i === 0 || amplitudes[i] >= amplitudes[i - 1]) &&
        (i === this.candidateCount - 1 || amplitudes[i] >= amplitudes[i + 1]);
      if (!isLocalPeak) continue;
      const midiNote = minMidiNote + i;
      if (
        midiNote < LOW_NOTE_SUPPORT_MAX_MIDI &&
        Math.max(
          amplitudes[i + 12] ?? 0,
          amplitudes[i + 19] ?? 0
        ) < LOW_NOTE_SUPPORT_MIN
      ) {
        continue;
      }
      eligible.push(midiNote);
    }
    if (eligible.length === 0) {
      return [];
    }

    const initialMaxSalience = Math.max(
      ...eligible.map((m) => harmonicSalience(m, residualByMidi))
    );
    if (initialMaxSalience <= 0) {
      return [];
    }

    const accepted: { midiNote: number; amplitude: number }[] = [];
    const excluded = new Set<number>();
    const eligibleSet = new Set(eligible);
    const isAcceptable = (midiNote: number) =>
      eligibleSet.has(midiNote) &&
      !excluded.has(midiNote) &&
      residualByMidi(midiNote) >= fundamentalThreshold;

    while (accepted.length < maxNotesPerFrame) {
      // 残差からサリエンスを再計算し、最有力の候補を探す
      let best = -1;
      let bestSalience = 0;
      for (const midiNote of eligible) {
        if (!isAcceptable(midiNote)) continue;
        const s = harmonicSalience(midiNote, residualByMidi);
        if (s > bestSalience) {
          bestSalience = s;
          best = midiNote;
        }
      }
      if (best === -1 || bestSalience < salienceThreshold * initialMaxSalience) {
        break;
      }

      // サブオクターブ降下: 基音候補 (オクターブ下・12度下) のサリエンスが
      // 拮抗していれば、best は倍音位置とみなして低い方を採用する
      let descended = true;
      while (descended) {
        descended = false;
        for (const offset of DESCEND_SEMITONE_OFFSETS) {
          const lower = best - offset;
          if (!isAcceptable(lower)) continue;
          if (residualByMidi(lower) < DESCEND_FUNDAMENTAL_MIN) continue;
          const lowerSalience = harmonicSalience(lower, residualByMidi);
          if (lowerSalience >= subHarmonicDescendRatio * bestSalience) {
            best = lower;
            bestSalience = lowerSalience;
            descended = true;
            break;
          }
        }
      }

      accepted.push({
        midiNote: best,
        amplitude: Math.min(1, bestSalience / initialMaxSalience),
      });
      // 同一音の再判定と隣接半音 (デチューンした同じ音の漏れ) を除外する
      excluded.add(best);
      excluded.add(best - 1);
      excluded.add(best + 1);

      // 倍音減算: 倍音が複数立っている複合音は倍音位置をほぼ全て差し引き、
      // 純音に近い音は控えめに引く (倍音位置の実音の重ねを残すため)
      const baseIndex = best - minMidiNote;
      let presentHarmonics = 0;
      for (let k = 1; k < HARMONIC_SEMITONE_OFFSETS.length; k++) {
        if (
          (residual[baseIndex + HARMONIC_SEMITONE_OFFSETS[k]] ?? 0) >=
          HARMONIC_PRESENT_MIN
        ) {
          presentHarmonics++;
        }
      }
      const subtractFactor =
        presentHarmonics >= RICH_HARMONIC_COUNT
          ? harmonicRichSubtract
          : harmonicPureSubtract;
      residual[baseIndex] = 0;
      for (let k = 1; k < HARMONIC_SEMITONE_OFFSETS.length; k++) {
        const j = baseIndex + HARMONIC_SEMITONE_OFFSETS[k];
        if (j < residual.length) {
          residual[j] *= 1 - subtractFactor;
        }
      }
    }

    return accepted;
  }

  detectNotes(monoAudio: Float32Array): Promise<DetectedNoteEvent[]> {
    const { frameSeconds, silenceRmsThreshold } = this.options;
    const sampleRate = this.analysisSampleRate;

    const audio =
      this.analysisSampleRate !== this.options.sampleRate
        ? decimateByTwo(monoAudio)
        : monoAudio;
    const frameLength = Math.floor(frameSeconds * sampleRate);
    const events: DetectedNoteEvent[] = [];

    for (
      let frameStart = 0;
      frameStart + frameLength <= audio.length;
      frameStart += frameLength
    ) {
      const frame = audio.subarray(frameStart, frameStart + frameLength);

      // 無音フレームは解析しない
      if (frameRms(frame) < silenceRmsThreshold) {
        continue;
      }

      const startTimeSeconds = frameStart / sampleRate;
      for (const note of this.detectFrameNotes(frame)) {
        events.push({
          midiNote: note.midiNote,
          startTimeSeconds,
          durationSeconds: frameSeconds,
          amplitude: note.amplitude,
        });
      }
    }

    return Promise.resolve(events);
  }
}
