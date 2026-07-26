import { goertzelPower } from "../../src/audio_analysis/goertzel";

/** 素朴な単一周波数 DFT (pitchplease の calculateAmplitudes と同じ定義) */
function naiveDftPower(
  samples: Float32Array,
  freqHz: number,
  sampleRate: number
): number {
  const scale = (2 * Math.PI * freqHz) / sampleRate;
  let re = 0;
  let im = 0;
  for (let t = 0; t < samples.length; t++) {
    re += samples[t] * Math.cos(scale * t);
    im += samples[t] * Math.sin(scale * t);
  }
  return re * re + im * im;
}

describe("goertzelPower", () => {
  it("素朴な単一周波数 DFT と同じ値を返す", () => {
    const sampleRate = 22050;
    const samples = new Float32Array(5512);
    for (let i = 0; i < samples.length; i++) {
      samples[i] =
        0.5 * Math.sin((2 * Math.PI * 442 * i) / sampleRate) +
        0.3 * Math.sin((2 * Math.PI * 262 * i) / sampleRate);
    }

    for (const freq of [131, 262, 442, 884]) {
      const goertzel = goertzelPower(samples, freq, sampleRate);
      const naive = naiveDftPower(samples, freq, sampleRate);
      // 浮動小数点の丸め順の違いのみ許容 (相対誤差)
      expect(goertzel).toBeCloseTo(naive, Math.max(0, 5 - Math.log10(naive)));
      expect(Math.abs(goertzel - naive) / Math.max(naive, 1)).toBeLessThan(
        1e-4
      );
    }
  });

  it("含まれる周波数で大きく、含まれない周波数で小さい値になる", () => {
    const sampleRate = 22050;
    const samples = new Float32Array(5512);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = 0.5 * Math.sin((2 * Math.PI * 442 * i) / sampleRate);
    }

    const present = goertzelPower(samples, 442, sampleRate);
    const absent = goertzelPower(samples, 262, sampleRate);
    expect(present).toBeGreaterThan(absent * 100);
  });

  it("無音では 0 を返す", () => {
    expect(goertzelPower(new Float32Array(1024), 442, 22050)).toBe(0);
  });
});
