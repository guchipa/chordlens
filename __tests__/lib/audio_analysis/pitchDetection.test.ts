import {
  frequencyToNote,
  detectPitch,
  aggregatePitchResults,
} from "@/lib/audio_analysis/pitchDetection";
import type { PitchCandidate } from "@/lib/audio_analysis/pitchDetection";

/**
 * テスト用ヘルパー: 指定周波数の正弦波を生成
 */
function generateSineWave(
  frequency: number,
  sampleRate: number,
  length: number,
  amplitude: number = 0.5
): Float32Array {
  const buffer = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    buffer[i] = amplitude * Math.sin(2 * Math.PI * frequency * i / sampleRate);
  }
  return buffer;
}

describe("frequencyToNote", () => {
  it("440HzをA4に変換する", () => {
    const result = frequencyToNote(440, 440);
    expect(result.pitchName).toBe("A");
    expect(result.octaveNum).toBe(4);
  });

  it("261.63Hz付近をC4に変換する", () => {
    const c4Freq = 440 * Math.pow(2, -9 / 12); // ≈261.63Hz
    const result = frequencyToNote(c4Freq, 440);
    expect(result.pitchName).toBe("C");
    expect(result.octaveNum).toBe(4);
  });

  it("880HzをA5に変換する", () => {
    const result = frequencyToNote(880, 440);
    expect(result.pitchName).toBe("A");
    expect(result.octaveNum).toBe(5);
  });

  it("220HzをA3に変換する", () => {
    const result = frequencyToNote(220, 440);
    expect(result.pitchName).toBe("A");
    expect(result.octaveNum).toBe(3);
  });

  it("A4=442Hz基準でも正しく変換する", () => {
    const result = frequencyToNote(442, 442);
    expect(result.pitchName).toBe("A");
    expect(result.octaveNum).toBe(4);
  });

  it("各音名を正しく変換する", () => {
    const noteFreqs: [number, string][] = [
      [261.63, "C"],
      [293.66, "D"],
      [329.63, "E"],
      [349.23, "F"],
      [392.00, "G"],
      [440.00, "A"],
      [493.88, "B"],
    ];

    for (const [freq, expectedName] of noteFreqs) {
      const result = frequencyToNote(freq, 440);
      expect(result.pitchName).toBe(expectedName);
      expect(result.octaveNum).toBe(4);
    }
  });

  it("シャープ/フラットを含む音名を変換する", () => {
    // C#4 ≈ 277.18Hz
    const cSharpFreq = 440 * Math.pow(2, -8 / 12);
    const result = frequencyToNote(cSharpFreq, 440);
    expect(result.pitchName).toBe("C#");
    expect(result.octaveNum).toBe(4);
  });
});

describe("detectPitch", () => {
  const SAMPLE_RATE = 44100;
  const BUFFER_SIZE = 4096;

  it("440Hzの正弦波からAを検出する", () => {
    const buffer = generateSineWave(440, SAMPLE_RATE, BUFFER_SIZE);
    const candidates = detectPitch(buffer, SAMPLE_RATE, 440);

    expect(candidates.length).toBeGreaterThan(0);
    // 自己相関法は純粋な正弦波で倍音/基音のオクターブが揺れうるが、
    // 音名はAとして検出されること
    expect(candidates[0].pitchName).toBe("A");
    expect(candidates[0].confidence).toBeGreaterThan(0.5);
  });

  it("無音のバッファでは空配列を返す", () => {
    const buffer = new Float32Array(BUFFER_SIZE).fill(0);
    const candidates = detectPitch(buffer, SAMPLE_RATE);

    expect(candidates).toEqual([]);
  });

  it("非常に小さい振幅では検出しない", () => {
    const buffer = generateSineWave(440, SAMPLE_RATE, BUFFER_SIZE, 0.001);
    const candidates = detectPitch(buffer, SAMPLE_RATE);

    expect(candidates).toEqual([]);
  });

  it("候補は最大3件まで返す", () => {
    const buffer = generateSineWave(440, SAMPLE_RATE, BUFFER_SIZE);
    const candidates = detectPitch(buffer, SAMPLE_RATE, 440);

    expect(candidates.length).toBeLessThanOrEqual(3);
  });

  it("候補は信頼度の降順でソートされている", () => {
    const buffer = generateSineWave(440, SAMPLE_RATE, BUFFER_SIZE);
    const candidates = detectPitch(buffer, SAMPLE_RATE, 440);

    for (let i = 1; i < candidates.length; i++) {
      expect(candidates[i - 1].confidence).toBeGreaterThanOrEqual(
        candidates[i].confidence
      );
    }
  });

  it("各候補のオクターブ番号は1〜6の範囲", () => {
    const buffer = generateSineWave(440, SAMPLE_RATE, BUFFER_SIZE);
    const candidates = detectPitch(buffer, SAMPLE_RATE, 440);

    for (const c of candidates) {
      expect(c.octaveNum).toBeGreaterThanOrEqual(1);
      expect(c.octaveNum).toBeLessThanOrEqual(6);
    }
  });

  it("異なる周波数でも正しく検出する（C4 ≈ 262Hz）", () => {
    const c4Freq = 440 * Math.pow(2, -9 / 12);
    const buffer = generateSineWave(c4Freq, SAMPLE_RATE, BUFFER_SIZE);
    const candidates = detectPitch(buffer, SAMPLE_RATE, 440);

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].pitchName).toBe("C");
  });
});

describe("aggregatePitchResults", () => {
  it("単一フレームの結果をそのまま返す", () => {
    const frameResults: PitchCandidate[][] = [
      [
        { pitchName: "A", octaveNum: 4, frequency: 440, confidence: 0.9 },
      ],
    ];

    const result = aggregatePitchResults(frameResults);

    expect(result).toHaveLength(1);
    expect(result[0].pitchName).toBe("A");
    expect(result[0].octaveNum).toBe(4);
  });

  it("複数フレームで同じ音が多いほど高スコアになる", () => {
    const frameResults: PitchCandidate[][] = [
      [
        { pitchName: "A", octaveNum: 4, frequency: 440, confidence: 0.8 },
        { pitchName: "A", octaveNum: 5, frequency: 880, confidence: 0.2 },
      ],
      [
        { pitchName: "A", octaveNum: 4, frequency: 440, confidence: 0.9 },
        { pitchName: "A", octaveNum: 5, frequency: 880, confidence: 0.1 },
      ],
      [
        { pitchName: "A", octaveNum: 4, frequency: 440, confidence: 0.85 },
      ],
    ];

    const result = aggregatePitchResults(frameResults);

    expect(result[0].pitchName).toBe("A");
    expect(result[0].octaveNum).toBe(4);
  });

  it("空のフレーム結果では空配列を返す", () => {
    const result = aggregatePitchResults([]);
    expect(result).toEqual([]);
  });

  it("全フレームが空の場合も空配列を返す", () => {
    const result = aggregatePitchResults([[], [], []]);
    expect(result).toEqual([]);
  });

  it("最大3件の結果を返す", () => {
    const frameResults: PitchCandidate[][] = [
      [
        { pitchName: "A", octaveNum: 4, frequency: 440, confidence: 0.9 },
        { pitchName: "B", octaveNum: 4, frequency: 494, confidence: 0.5 },
        { pitchName: "C", octaveNum: 4, frequency: 262, confidence: 0.3 },
        { pitchName: "D", octaveNum: 4, frequency: 294, confidence: 0.1 },
      ],
    ];

    const result = aggregatePitchResults(frameResults);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("信頼度が合計100%に正規化される", () => {
    const frameResults: PitchCandidate[][] = [
      [
        { pitchName: "A", octaveNum: 4, frequency: 440, confidence: 0.9 },
        { pitchName: "B", octaveNum: 4, frequency: 494, confidence: 0.5 },
      ],
    ];

    const result = aggregatePitchResults(frameResults);
    const totalConfidence = result.reduce((sum, c) => sum + c.confidence, 0);

    expect(totalConfidence).toBeCloseTo(1.0, 5);
  });
});
