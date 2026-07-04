import {
  PitchPleaseNoteDetector,
  suppressHarmonicCandidates,
} from "../../src/audio_analysis/pitchPleaseNoteDetection";

const SAMPLE_RATE = 22050;
const A4_FREQ = 442;

/** MIDI ノート番号 → 周波数 (A4=442Hz 基準) */
function midiToFreq(midiNote: number): number {
  return A4_FREQ * Math.pow(2, (midiNote - 69) / 12);
}

/** 複数の正弦波を合成した波形を生成する */
function synthesize(
  partials: { freq: number; amp: number }[],
  durationSeconds: number
): Float32Array {
  const length = Math.floor(durationSeconds * SAMPLE_RATE);
  const buffer = new Float32Array(length);
  for (const { freq, amp } of partials) {
    for (let i = 0; i < length; i++) {
      buffer[i] += amp * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE);
    }
  }
  return buffer;
}

describe("pitchPleaseNoteDetection", () => {
  describe("PitchPleaseNoteDetector", () => {
    it("Cメジャーコード(C4-E4-G4)の正弦波合成から3音を検出する", async () => {
      const detector = new PitchPleaseNoteDetector({ a4Freq: A4_FREQ });
      const audio = synthesize(
        [
          { freq: midiToFreq(60), amp: 0.3 }, // C4
          { freq: midiToFreq(64), amp: 0.3 }, // E4
          { freq: midiToFreq(67), amp: 0.3 }, // G4
        ],
        1.0
      );

      const events = await detector.detectNotes(audio);

      const detectedMidi = new Set(events.map((e) => e.midiNote));
      expect(detectedMidi.has(60)).toBe(true);
      expect(detectedMidi.has(64)).toBe(true);
      expect(detectedMidi.has(67)).toBe(true);
    });

    it("単音(A4)を検出する", async () => {
      const detector = new PitchPleaseNoteDetector({ a4Freq: A4_FREQ });
      const audio = synthesize([{ freq: 442, amp: 0.5 }], 1.0);

      const events = await detector.detectNotes(audio);

      expect(events.length).toBeGreaterThan(0);
      expect(events.every((e) => e.midiNote === 69)).toBe(true);
    });

    it("A4 基準周波数の設定 (440Hz) に追従する", async () => {
      const detector = new PitchPleaseNoteDetector({ a4Freq: 440 });
      const audio = synthesize([{ freq: 440, amp: 0.5 }], 1.0);

      const events = await detector.detectNotes(audio);

      expect(events.length).toBeGreaterThan(0);
      expect(events.every((e) => e.midiNote === 69)).toBe(true);
    });

    it("無音からは何も検出しない", async () => {
      const detector = new PitchPleaseNoteDetector({ a4Freq: A4_FREQ });
      const audio = new Float32Array(SAMPLE_RATE); // 1秒の無音

      const events = await detector.detectNotes(audio);

      expect(events).toEqual([]);
    });

    it("倍音を含む単音(C3 + 弱い倍音)からは基音のみ検出する", async () => {
      const detector = new PitchPleaseNoteDetector({ a4Freq: A4_FREQ });
      const c3 = midiToFreq(48);
      const audio = synthesize(
        [
          { freq: c3, amp: 0.5 }, // C3 基音
          { freq: c3 * 2, amp: 0.15 }, // 第2倍音 (C4)
          { freq: c3 * 3, amp: 0.1 }, // 第3倍音 (G4)
        ],
        1.0
      );

      const events = await detector.detectNotes(audio);

      const detectedMidi = new Set(events.map((e) => e.midiNote));
      expect(detectedMidi.has(48)).toBe(true);
      expect(detectedMidi.has(60)).toBe(false); // C4 は倍音として抑制
      expect(detectedMidi.has(67)).toBe(false); // G4 は倍音として抑制
    });

    it("イベントの時刻・長さがフレームに対応する", async () => {
      const detector = new PitchPleaseNoteDetector({
        a4Freq: A4_FREQ,
        frameSeconds: 0.25,
      });
      const audio = synthesize([{ freq: 442, amp: 0.5 }], 1.0);

      const events = await detector.detectNotes(audio);

      // 1 秒 / 0.25 秒 = 4 フレームぶん検出される
      expect(events).toHaveLength(4);
      events.forEach((event, i) => {
        // フレーム長はサンプル数に丸められるため近似比較
        expect(event.startTimeSeconds).toBeCloseTo(i * 0.25, 3);
        expect(event.durationSeconds).toBe(0.25);
      });
    });
  });

  describe("suppressHarmonicCandidates", () => {
    it("強い基音の整数倍にある弱い候補を除去する", () => {
      const result = suppressHarmonicCandidates([
        { midiNote: 48, frequencyHz: 131, amplitude: 1.0 },
        { midiNote: 60, frequencyHz: 262, amplitude: 0.3 }, // 2倍音
        { midiNote: 67, frequencyHz: 393, amplitude: 0.25 }, // 3倍音
      ]);

      expect(result.map((c) => c.midiNote)).toEqual([48]);
    });

    it("倍音位置でも十分強い候補 (実音のオクターブ重ね) は残す", () => {
      const result = suppressHarmonicCandidates([
        { midiNote: 48, frequencyHz: 131, amplitude: 1.0 },
        { midiNote: 60, frequencyHz: 262, amplitude: 0.9 }, // 強い → 実音とみなす
      ]);

      expect(result.map((c) => c.midiNote)).toEqual([48, 60]);
    });

    it("整数倍関係にない候補は除去しない", () => {
      const result = suppressHarmonicCandidates([
        { midiNote: 60, frequencyHz: 262, amplitude: 1.0 },
        { midiNote: 64, frequencyHz: 330, amplitude: 0.3 }, // 長3度 (約1.26倍)
      ]);

      expect(result.map((c) => c.midiNote)).toEqual([60, 64]);
    });
  });
});
