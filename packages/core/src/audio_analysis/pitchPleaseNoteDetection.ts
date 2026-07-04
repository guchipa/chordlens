/**
 * PitchPleaseNoteDetector - pitchplease による NoteDetector 実装
 *
 * pitchplease (https://www.npmjs.com/package/pitchplease) は音名ごとの
 * 周波数相関 (単一周波数 DFT) で振幅を求める純粋 TypeScript ライブラリ。
 * 本来は単音チューナー向けだが、ここでは全候補音の相関振幅を計算し、
 * 閾値を超えた音を構成音とみなす多音拡張として使う。
 *
 * basic-pitch と異なりプラットフォーム非依存 (ブラウザ API・モデル不要) の
 * ため core に置く。候補音の周波数を a4Freq から生成するので、
 * A4=442Hz などの基準設定にも追従する。
 *
 * 処理の流れ:
 * 1. 音声バッファを frameSeconds ごとのフレームに分割
 * 2. フレームごとに全候補音 (minMidi〜maxMidi) の相関振幅を計算
 * 3. フレーム内最大値に対する相対閾値で候補を選別
 * 4. 倍音抑制: より強い低音の整数倍周波数に一致する弱い候補を除去
 * 5. 採用候補をフレーム時刻付きの DetectedNoteEvent として出力
 *    (フレーム間の集約は chordToneEstimation.ts が担う)
 */

import { audioProcessing } from "pitchplease";
import { A4_FREQ, PITCH_NAME_LIST } from "../constants";
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
  /** フレーム内最大振幅に対する採用閾値 (0〜1) */
  relativeMagnitudeThreshold?: number;
  /** 無音とみなすフレーム RMS 閾値 */
  silenceRmsThreshold?: number;
  /** 倍音抑制を行うか */
  suppressHarmonics?: boolean;
}

export const PITCH_PLEASE_DEFAULTS: Required<PitchPleaseNoteDetectorOptions> = {
  a4Freq: A4_FREQ,
  sampleRate: 22050,
  minMidiNote: 24, // C1
  maxMidiNote: 95, // B6
  frameSeconds: 0.25,
  relativeMagnitudeThreshold: 0.2,
  silenceRmsThreshold: 0.01,
  suppressHarmonics: true,
};

/** 倍音とみなす周波数比の許容誤差 (セント) */
const HARMONIC_TOLERANCE_CENTS = 40;
/** この比率より弱い整数倍音候補を倍音として除去する */
const HARMONIC_SUPPRESSION_RATIO = 0.6;
/** 倍音チェックする次数の上限 */
const MAX_HARMONIC_ORDER = 8;

/** MIDI ノート番号 → 周波数 (Hz) */
function midiNoteToFreq(midiNote: number, a4Freq: number): number {
  return a4Freq * Math.pow(2, (midiNote - 69) / 12);
}

interface NoteCandidate {
  midiNote: number;
  frequencyHz: number;
  /** フレーム内最大値で正規化した振幅 (0〜1) */
  amplitude: number;
}

/**
 * より強い低音候補の整数倍周波数 (±tolerance セント) に一致する
 * 弱い候補を倍音とみなして除去する
 */
export function suppressHarmonicCandidates(
  candidates: NoteCandidate[]
): NoteCandidate[] {
  const toleranceRatio = Math.pow(2, HARMONIC_TOLERANCE_CENTS / 1200);
  const byStrength = [...candidates].sort((a, b) => b.amplitude - a.amplitude);
  const accepted: NoteCandidate[] = [];

  for (const candidate of byStrength) {
    const isWeakHarmonic = accepted.some((base) => {
      if (base.frequencyHz >= candidate.frequencyHz) return false;
      const ratio = candidate.frequencyHz / base.frequencyHz;
      const order = Math.round(ratio);
      return (
        order >= 2 &&
        order <= MAX_HARMONIC_ORDER &&
        ratio / order <= toleranceRatio &&
        ratio / order >= 1 / toleranceRatio &&
        candidate.amplitude < base.amplitude * HARMONIC_SUPPRESSION_RATIO
      );
    });
    if (!isWeakHarmonic) {
      accepted.push(candidate);
    }
  }

  return accepted.sort((a, b) => a.midiNote - b.midiNote);
}

function frameRms(frame: number[]): number {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) {
    sum += frame[i] * frame[i];
  }
  return Math.sqrt(sum / frame.length);
}

export class PitchPleaseNoteDetector implements NoteDetector {
  readonly requiredSampleRate: number;

  private options: Required<PitchPleaseNoteDetectorOptions>;
  /** pitchplease に渡す候補音リスト (index = midiNote - minMidiNote) */
  private notesFrequencies: { name: string; frequencyInHz: number }[];

  constructor(options: PitchPleaseNoteDetectorOptions = {}) {
    this.options = { ...PITCH_PLEASE_DEFAULTS, ...options };
    this.requiredSampleRate = this.options.sampleRate;

    const { minMidiNote, maxMidiNote, a4Freq } = this.options;
    this.notesFrequencies = [];
    for (let midiNote = minMidiNote; midiNote <= maxMidiNote; midiNote++) {
      this.notesFrequencies.push({
        name: PITCH_NAME_LIST[((midiNote % 12) + 12) % 12],
        frequencyInHz: midiNoteToFreq(midiNote, a4Freq),
      });
    }
  }

  detectNotes(monoAudio: Float32Array): Promise<DetectedNoteEvent[]> {
    const {
      sampleRate,
      minMidiNote,
      frameSeconds,
      relativeMagnitudeThreshold,
      silenceRmsThreshold,
      suppressHarmonics,
    } = this.options;

    const frameLength = Math.floor(frameSeconds * sampleRate);
    const events: DetectedNoteEvent[] = [];

    for (
      let frameStart = 0;
      frameStart + frameLength <= monoAudio.length;
      frameStart += frameLength
    ) {
      // pitchplease は number[] を受け取るためコピーする
      const frame = Array.from(
        monoAudio.subarray(frameStart, frameStart + frameLength)
      );

      // 無音フレームは解析しない
      if (frameRms(frame) < silenceRmsThreshold) {
        continue;
      }

      const amplitudes = audioProcessing.calculateAmplitudes(
        frame,
        this.notesFrequencies,
        sampleRate
      );
      const magnitudes = audioProcessing.computeMagnitudes(amplitudes);

      const maxMagnitude = Math.max(...magnitudes);
      if (maxMagnitude <= 0) {
        continue;
      }

      let candidates: NoteCandidate[] = [];
      for (let i = 0; i < magnitudes.length; i++) {
        // 隣接半音への漏れを除くため、局所ピークのみ候補にする
        const isLocalPeak =
          (i === 0 || magnitudes[i] >= magnitudes[i - 1]) &&
          (i === magnitudes.length - 1 || magnitudes[i] >= magnitudes[i + 1]);
        if (!isLocalPeak) {
          continue;
        }
        // magnitude は振幅の2乗なので、比較は振幅スケールに戻して行う
        const amplitude = Math.sqrt(magnitudes[i] / maxMagnitude);
        if (amplitude >= relativeMagnitudeThreshold) {
          candidates.push({
            midiNote: minMidiNote + i,
            frequencyHz: this.notesFrequencies[i].frequencyInHz,
            amplitude,
          });
        }
      }

      if (suppressHarmonics) {
        candidates = suppressHarmonicCandidates(candidates);
      }

      const startTimeSeconds = frameStart / sampleRate;
      for (const candidate of candidates) {
        events.push({
          midiNote: candidate.midiNote,
          startTimeSeconds,
          durationSeconds: frameSeconds,
          amplitude: candidate.amplitude,
        });
      }
    }

    return Promise.resolve(events);
  }
}
