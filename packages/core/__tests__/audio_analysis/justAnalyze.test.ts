import { evaluateSpectrum } from "../../src/audio_analysis/justAnalyze";
import type { Pitch } from "../../src/types";

/**
 * テスト用ヘルパー: 等間隔の周波数ビン配列を生成
 * AnalyserNode の周波数ビンを模擬する
 */
function makeFreqBins(sampleRate: number, fftSize: number): number[] {
  const binCount = fftSize / 2;
  const step = sampleRate / fftSize;
  return Array.from({ length: binCount }, (_, i) => i * step);
}

/**
 * テスト用ヘルパー: 指定周波数にガウシアンピークを持つスペクトルを生成（dB単位）
 */
function makeSpectrum(
  freq: number[],
  peakFreq: number,
  peakDb: number = 0,
  floorDb: number = -120
): Float32Array {
  const spec = new Float32Array(freq.length);
  for (let i = 0; i < freq.length; i++) {
    const distance = Math.abs(freq[i] - peakFreq);
    const step = freq.length > 1 ? freq[1] - freq[0] : 1;
    // ガウシアン形状のピーク
    const attenuation = -((distance / step) ** 2) * 3;
    spec[i] = Math.max(floorDb, peakDb + attenuation);
  }
  return spec;
}

describe("evaluateSpectrum", () => {
  const A4_FREQ = 440;
  const EVAL_RANGE_CENTS = 50;
  const EVAL_THRESHOLD = -100;
  const SAMPLE_RATE = 44100;
  const FFT_SIZE = 4096;

  const freq = makeFreqBins(SAMPLE_RATE, FFT_SIZE);
  // 周波数分解能 ≈ 10.77Hz

  const cMajorPitchList: Pitch[] = [
    { pitchName: "C", octaveNum: 4, isRoot: true, enabled: true },
    { pitchName: "E", octaveNum: 4, isRoot: false, enabled: true },
    { pitchName: "G", octaveNum: 4, isRoot: false, enabled: true },
  ];

  describe("基本動作", () => {
    it("純正律のピッチに一致するスペクトルではdeviation≈0を返す", () => {
      // C4の純正律周波数 = 440 * 2^(-9/12) ≈ 261.63Hz
      const c4Freq = A4_FREQ * Math.pow(2, -9 / 12);
      const spec = makeSpectrum(freq, c4Freq, 0);

      const pitchList: Pitch[] = [
        { pitchName: "C", octaveNum: 4, isRoot: true, enabled: true },
      ];

      const result = evaluateSpectrum(
        spec,
        freq,
        pitchList,
        EVAL_RANGE_CENTS,
        A4_FREQ,
        EVAL_THRESHOLD
      );

      expect(result).toHaveLength(1);
      expect(result[0].deviation).not.toBeNull();
      // 周波数分解能の制約で完全な0にはならないが、近い値
      expect(Math.abs(result[0].deviation!)).toBeLessThan(0.3);
      expect(result[0].centDeviation).not.toBeNull();
    });

    it("複数音（Cメジャーコード）を同時に評価できる", () => {
      const c4Freq = A4_FREQ * Math.pow(2, -9 / 12);
      const e4JustFreq = c4Freq * 5 / 4; // 純正律の長3度
      const g4JustFreq = c4Freq * 3 / 2; // 純正律の完全5度

      // 3つのピークを持つスペクトルを合成
      const spec = new Float32Array(freq.length).fill(-120);
      for (const peakF of [c4Freq, e4JustFreq, g4JustFreq]) {
        const single = makeSpectrum(freq, peakF, 0);
        for (let i = 0; i < spec.length; i++) {
          // dBの加算（線形変換して加算し直す）
          spec[i] = Math.max(spec[i], single[i]);
        }
      }

      const result = evaluateSpectrum(
        spec,
        freq,
        cMajorPitchList,
        EVAL_RANGE_CENTS,
        A4_FREQ,
        EVAL_THRESHOLD
      );

      expect(result).toHaveLength(3);
      result.forEach((r) => {
        expect(r.deviation).not.toBeNull();
        expect(r.centDeviation).not.toBeNull();
      });
    });

    it("各結果のdeviation値は-1.0〜1.0の範囲に収まる", () => {
      const c4Freq = A4_FREQ * Math.pow(2, -9 / 12);
      // 意図的にずらしたピークを作る
      const shiftedFreq = c4Freq * Math.pow(2, 40 / 1200); // +40セント
      const spec = makeSpectrum(freq, shiftedFreq, 0);

      const pitchList: Pitch[] = [
        { pitchName: "C", octaveNum: 4, isRoot: true, enabled: true },
      ];

      const result = evaluateSpectrum(
        spec,
        freq,
        pitchList,
        EVAL_RANGE_CENTS,
        A4_FREQ,
        EVAL_THRESHOLD
      );

      expect(result).toHaveLength(1);
      expect(result[0].deviation).not.toBeNull();
      expect(result[0].deviation!).toBeGreaterThanOrEqual(-1);
      expect(result[0].deviation!).toBeLessThanOrEqual(1);
    });
  });

  describe("セント偏差の方向", () => {
    it("ピッチが高い方にずれている場合、centDeviationは正", () => {
      const c4Freq = A4_FREQ * Math.pow(2, -9 / 12);
      const sharpFreq = c4Freq * Math.pow(2, 30 / 1200); // +30セント
      const spec = makeSpectrum(freq, sharpFreq, 0);

      const pitchList: Pitch[] = [
        { pitchName: "C", octaveNum: 4, isRoot: true, enabled: true },
      ];

      const result = evaluateSpectrum(
        spec,
        freq,
        pitchList,
        EVAL_RANGE_CENTS,
        A4_FREQ,
        EVAL_THRESHOLD
      );

      expect(result[0].centDeviation).not.toBeNull();
      expect(result[0].centDeviation!).toBeGreaterThan(0);
      expect(result[0].deviation!).toBeGreaterThan(0);
    });

    it("ピッチが低い方にずれている場合、centDeviationは負", () => {
      const c4Freq = A4_FREQ * Math.pow(2, -9 / 12);
      const flatFreq = c4Freq * Math.pow(2, -30 / 1200); // -30セント
      const spec = makeSpectrum(freq, flatFreq, 0);

      const pitchList: Pitch[] = [
        { pitchName: "C", octaveNum: 4, isRoot: true, enabled: true },
      ];

      const result = evaluateSpectrum(
        spec,
        freq,
        pitchList,
        EVAL_RANGE_CENTS,
        A4_FREQ,
        EVAL_THRESHOLD
      );

      expect(result[0].centDeviation).not.toBeNull();
      expect(result[0].centDeviation!).toBeLessThan(0);
      expect(result[0].deviation!).toBeLessThan(0);
    });
  });

  describe("閾値処理", () => {
    it("スペクトルが閾値以下の場合はnullを返す", () => {
      // 非常に弱いスペクトル
      const spec = new Float32Array(freq.length).fill(-150);

      const pitchList: Pitch[] = [
        { pitchName: "C", octaveNum: 4, isRoot: true, enabled: true },
      ];

      const result = evaluateSpectrum(
        spec,
        freq,
        pitchList,
        EVAL_RANGE_CENTS,
        A4_FREQ,
        EVAL_THRESHOLD
      );

      expect(result).toHaveLength(1);
      expect(result[0].deviation).toBeNull();
      expect(result[0].centDeviation).toBeNull();
    });

    it("閾値をちょうど超えるスペクトルは検出される", () => {
      const c4Freq = A4_FREQ * Math.pow(2, -9 / 12);
      const spec = makeSpectrum(freq, c4Freq, EVAL_THRESHOLD + 5, -150);

      const pitchList: Pitch[] = [
        { pitchName: "C", octaveNum: 4, isRoot: true, enabled: true },
      ];

      const result = evaluateSpectrum(
        spec,
        freq,
        pitchList,
        EVAL_RANGE_CENTS,
        A4_FREQ,
        EVAL_THRESHOLD
      );

      expect(result[0].deviation).not.toBeNull();
    });
  });

  describe("エッジケース", () => {
    it("根音が設定されていない場合は空配列を返す", () => {
      const spec = new Float32Array(freq.length).fill(0);

      const pitchList: Pitch[] = [
        { pitchName: "C", octaveNum: 4, isRoot: false, enabled: true },
      ];

      const result = evaluateSpectrum(
        spec,
        freq,
        pitchList,
        EVAL_RANGE_CENTS,
        A4_FREQ,
        EVAL_THRESHOLD
      );

      expect(result).toEqual([]);
    });

    it("enabled=falseの音はdeviation=nullを返す", () => {
      const c4Freq = A4_FREQ * Math.pow(2, -9 / 12);
      const spec = makeSpectrum(freq, c4Freq, 0);

      const pitchList: Pitch[] = [
        { pitchName: "C", octaveNum: 4, isRoot: true, enabled: true },
        { pitchName: "E", octaveNum: 4, isRoot: false, enabled: false },
      ];

      const result = evaluateSpectrum(
        spec,
        freq,
        pitchList,
        EVAL_RANGE_CENTS,
        A4_FREQ,
        EVAL_THRESHOLD
      );

      expect(result).toHaveLength(2);
      expect(result[0].deviation).not.toBeNull();
      expect(result[1].deviation).toBeNull();
      expect(result[1].centDeviation).toBeNull();
    });

    it("空のピッチリストでは空配列を返す", () => {
      const spec = new Float32Array(freq.length).fill(0);

      const result = evaluateSpectrum(
        spec,
        freq,
        [],
        EVAL_RANGE_CENTS,
        A4_FREQ,
        EVAL_THRESHOLD
      );

      expect(result).toEqual([]);
    });

    it("evalRangeCentsが0の場合でもクラッシュしない", () => {
      const c4Freq = A4_FREQ * Math.pow(2, -9 / 12);
      const spec = makeSpectrum(freq, c4Freq, 0);

      const pitchList: Pitch[] = [
        { pitchName: "C", octaveNum: 4, isRoot: true, enabled: true },
      ];

      expect(() => {
        evaluateSpectrum(
          spec,
          freq,
          pitchList,
          0, // evalRangeCents = 0
          A4_FREQ,
          EVAL_THRESHOLD
        );
      }).not.toThrow();
    });
  });

  describe("デバッグ情報", () => {
    it("includeDebug=trueの場合、debugフィールドが含まれる", () => {
      const c4Freq = A4_FREQ * Math.pow(2, -9 / 12);
      const spec = makeSpectrum(freq, c4Freq, 0);

      const pitchList: Pitch[] = [
        { pitchName: "C", octaveNum: 4, isRoot: true, enabled: true },
      ];

      const result = evaluateSpectrum(
        spec,
        freq,
        pitchList,
        EVAL_RANGE_CENTS,
        A4_FREQ,
        EVAL_THRESHOLD,
        { includeDebug: true }
      );

      expect(result[0].debug).toBeDefined();
      expect(result[0].debug!.estFreqHz).toBeGreaterThan(0);
      expect(result[0].debug!.range).toBeDefined();
      expect(result[0].debug!.peak).toBeDefined();
    });

    it("includeDebug=falseの場合、debugフィールドはない", () => {
      const c4Freq = A4_FREQ * Math.pow(2, -9 / 12);
      const spec = makeSpectrum(freq, c4Freq, 0);

      const pitchList: Pitch[] = [
        { pitchName: "C", octaveNum: 4, isRoot: true, enabled: true },
      ];

      const result = evaluateSpectrum(
        spec,
        freq,
        pitchList,
        EVAL_RANGE_CENTS,
        A4_FREQ,
        EVAL_THRESHOLD,
        { includeDebug: false }
      );

      expect(result[0].debug).toBeUndefined();
    });
  });

  describe("異なるA4基準周波数", () => {
    it("A4=442Hzでも正しく動作する", () => {
      const customA4 = 442;
      const a4Spec = makeSpectrum(freq, customA4, 0);

      const pitchList: Pitch[] = [
        { pitchName: "A", octaveNum: 4, isRoot: true, enabled: true },
      ];

      const result = evaluateSpectrum(
        a4Spec,
        freq,
        pitchList,
        EVAL_RANGE_CENTS,
        customA4,
        EVAL_THRESHOLD
      );

      expect(result).toHaveLength(1);
      expect(result[0].deviation).not.toBeNull();
      expect(Math.abs(result[0].centDeviation!)).toBeLessThan(15);
    });
  });
});
