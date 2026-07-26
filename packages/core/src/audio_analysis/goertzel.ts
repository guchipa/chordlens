/**
 * Goertzel アルゴリズム - 単一周波数の DFT パワーを効率的に求める
 *
 * pitchplease の calculateAmplitudes (サンプルごとに Math.cos/Math.sin を
 * 評価する素朴な内積) と数学的に同じ値を、三角関数 1 回 + サンプルごとの
 * 積和 1 回で計算する。48kHz × 候補 72 音のリアルタイム解析で
 * メインスレッドを塞がないための置き換え (実測で約 10 倍高速)。
 */

/**
 * samples に含まれる freqHz 成分の DFT パワー |X(f)|^2 を返す。
 * pitchplease の computeMagnitudes (re^2 + im^2) と同スケール
 */
export function goertzelPower(
  samples: Float32Array,
  freqHz: number,
  sampleRate: number
): number {
  const coeff = 2 * Math.cos((2 * Math.PI * freqHz) / sampleRate);
  let s1 = 0;
  let s2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const s0 = samples[i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return s1 * s1 + s2 * s2 - coeff * s1 * s2;
}
