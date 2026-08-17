/**
 * spectralAttenuation - レベル不均衡 augmentation 用のスペクトル減衰
 *
 * 評価用の持続和音録音から特定の音 (targetMidi) の倍音成分だけを弱め、
 * 「1 人だけ音量が小さい/欠けているアンサンブル」を模擬する。
 * 音源は定常な持続和音を想定しているため、フレーム分割はせず
 * ファイル全体を 1 回の FFT で処理する。
 */

import { nextPow2, radix2FFT } from "../../src/audio_analysis/fft";

/** デチューン探索の範囲 (セント)。この範囲内はフルゲインで減衰させる */
const FULL_GAIN_CENTS = 45;
/** フルゲインから素通し (ゲイン 1) へ raised-cosine で遷移し終えるセント */
const TRANSITION_END_CENTS = 60;
/** 対象とする倍音次数 (基音〜第 6 倍音) */
const HARMONIC_COUNT = 6;

function midiToFreq(midi: number, a4Freq: number): number {
  return a4Freq * Math.pow(2, (midi - 69) / 12);
}

/**
 * 単一の帯域中心 centerHz に対する強度 (1 = 中心 ±45c 以内, 0 = ±60c 以遠、
 * その間は raised-cosine で遷移)。freqHz <= 0 や centerHz <= 0 では 0
 */
function bandIntensity(freqHz: number, centerHz: number): number {
  if (freqHz <= 0 || centerHz <= 0) return 0;
  const cents = Math.abs(1200 * Math.log2(freqHz / centerHz));
  if (cents <= FULL_GAIN_CENTS) return 1;
  if (cents >= TRANSITION_END_CENTS) return 0;
  const t =
    (cents - FULL_GAIN_CENTS) / (TRANSITION_END_CENTS - FULL_GAIN_CENTS);
  return 0.5 * (1 + Math.cos(Math.PI * t));
}

/** f0 の第 1〜第 6 倍音のうち、freqHz に最も近い帯域の強度 (帯域は重ならない前提で最大値を採用) */
function harmonicBandIntensity(freqHz: number, f0: number): number {
  let maxIntensity = 0;
  for (let k = 1; k <= HARMONIC_COUNT; k++) {
    const intensity = bandIntensity(freqHz, f0 * k);
    if (intensity > maxIntensity) maxIntensity = intensity;
  }
  return maxIntensity;
}

/**
 * audio 中の targetMidi の音 (倍音 k=1..6) を attenuationDb だけ減衰させる。
 * protectMidi に含まれる音の倍音帯域と重なる部分は、保護度に応じて減衰を弱める
 * (実アンサンブルでは 1 人が弱くても他奏者が共有する部分音のエネルギーが残るため)。
 *
 * 実装: ファイル全体を次の 2 冪まで零詰めして 1 回の FFT にかけ、
 * 実数/共役対称のビンに同じゲインを適用してから逆 FFT で時間領域に戻す。
 */
export function attenuateNoteInAudio(
  audio: Float32Array,
  sampleRate: number,
  targetMidi: number,
  attenuationDb: number,
  a4Freq: number,
  protectMidi: number[]
): Float32Array {
  const n = audio.length;
  const fftSize = nextPow2(n);
  const real = new Float64Array(fftSize);
  const imag = new Float64Array(fftSize);
  real.set(audio);

  radix2FFT(real, imag);

  const g = Math.pow(10, -attenuationDb / 20);
  const f0 = midiToFreq(targetMidi, a4Freq);
  const protectF0s = protectMidi.map((midi) => midiToFreq(midi, a4Freq));

  const binHz = sampleRate / fftSize;
  const half = fftSize / 2;

  for (let bin = 0; bin <= half; bin++) {
    const freqHz = bin * binHz;
    const targetIntensity = harmonicBandIntensity(freqHz, f0);
    // 減衰のみを適用した場合のゲイン (保護なし)
    const attenuatedGain = 1 - targetIntensity * (1 - g);

    let protectIntensity = 0;
    for (const pf0 of protectF0s) {
      const intensity = harmonicBandIntensity(freqHz, pf0);
      if (intensity > protectIntensity) protectIntensity = intensity;
    }
    const finalGain =
      attenuatedGain + (1 - attenuatedGain) * protectIntensity;

    real[bin] *= finalGain;
    imag[bin] *= finalGain;
    if (bin !== 0 && bin !== half) {
      const mirror = fftSize - bin;
      real[mirror] *= finalGain;
      imag[mirror] *= finalGain;
    }
  }

  // 逆 FFT: conj(FFT(conj(X))) / N を使う (専用の逆変換を持たないため)
  for (let i = 0; i < fftSize; i++) imag[i] = -imag[i];
  radix2FFT(real, imag);

  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = real[i] / fftSize;
  }
  return out;
}
