import { attenuateNoteInAudio } from "../../scripts/lib/spectralAttenuation";
import { goertzelPower } from "../../src/audio_analysis/goertzel";

const SAMPLE_RATE = 22050;
const A4_FREQ = 442;
const DURATION_SECONDS = 2;

/** MIDI ノート番号 → 周波数 (A4=442Hz 基準)。centsOffset でデチューンできる */
function midiToFreq(midi: number, centsOffset = 0): number {
  return A4_FREQ * Math.pow(2, (midi - 69) / 12 + centsOffset / 1200);
}

// Eb3 (root) / C4 / G4 の 3 音複合音。G4 のみ +30 セントデチューン
const EB3_MIDI = 51;
const C4_MIDI = 60;
const G4_MIDI = 67;
const G4_DETUNE_CENTS = 30;

function synthesizeChord(): Float32Array {
  const length = Math.floor(DURATION_SECONDS * SAMPLE_RATE);
  const buffer = new Float32Array(length);
  const notes = [
    { midi: EB3_MIDI, centsOffset: 0 },
    { midi: C4_MIDI, centsOffset: 0 },
    { midi: G4_MIDI, centsOffset: G4_DETUNE_CENTS },
  ];
  for (const { midi, centsOffset } of notes) {
    const f0 = midiToFreq(midi, centsOffset);
    for (let k = 1; k <= 5; k++) {
      const amp = 1 / k;
      const freq = f0 * k;
      for (let i = 0; i < length; i++) {
        buffer[i] += amp * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE);
      }
    }
  }
  return buffer;
}

/** power の比を dB (パワー基準 = 10*log10) に変換する */
function powerRatioDb(before: number, after: number): number {
  return 10 * Math.log10(after / before);
}

describe("attenuateNoteInAudio", () => {
  const audio = synthesizeChord();
  const attenuationDb = 12;

  describe("Eb3 (root) を対象に減衰する (C4/G4 を保護)", () => {
    const variant = attenuateNoteInAudio(
      audio,
      SAMPLE_RATE,
      EB3_MIDI,
      attenuationDb,
      A4_FREQ,
      [C4_MIDI, G4_MIDI]
    );

    it("(a) 対象音の基音パワーが指定 dB ±2dB で減衰する", () => {
      const f1 = midiToFreq(EB3_MIDI);
      const before = goertzelPower(audio, f1, SAMPLE_RATE);
      const after = goertzelPower(variant, f1, SAMPLE_RATE);
      const db = powerRatioDb(before, after);
      expect(db).toBeGreaterThan(-attenuationDb - 2);
      expect(db).toBeLessThan(-attenuationDb + 2);
    });

    it("(b) 非対象音 (C4, G4) の基音パワー変化は 0.5dB 未満", () => {
      for (const { midi, centsOffset } of [
        { midi: C4_MIDI, centsOffset: 0 },
        { midi: G4_MIDI, centsOffset: G4_DETUNE_CENTS },
      ]) {
        const freq = midiToFreq(midi, centsOffset);
        const before = goertzelPower(audio, freq, SAMPLE_RATE);
        const after = goertzelPower(variant, freq, SAMPLE_RATE);
        const db = Math.abs(powerRatioDb(before, after));
        expect(db).toBeLessThan(0.5);
      }
    });

    it("(c) 保護帯域と重なる倍音 (Eb3 の第5倍音 ≈ C4 の第3倍音) のパワー変化は 1dB 未満", () => {
      // Eb3 k=5 (≈781.5Hz) は C4 k=3 (≈788.4Hz) と ±45c 圏内で重なるよう
      // 意図的に設計している (共有部分音として保護される)
      const eb3F0 = midiToFreq(EB3_MIDI);
      const c4F0 = midiToFreq(C4_MIDI);
      const overlapCents = Math.abs(
        1200 * Math.log2((eb3F0 * 5) / (c4F0 * 3))
      );
      expect(overlapCents).toBeLessThan(45); // 前提の確認

      const freq = eb3F0 * 5;
      const before = goertzelPower(audio, freq, SAMPLE_RATE);
      const after = goertzelPower(variant, freq, SAMPLE_RATE);
      const db = Math.abs(powerRatioDb(before, after));
      expect(db).toBeLessThan(1);
    });

    it("(d) 対象音の第2倍音も減衰している", () => {
      const freq = midiToFreq(EB3_MIDI) * 2;
      const before = goertzelPower(audio, freq, SAMPLE_RATE);
      const after = goertzelPower(variant, freq, SAMPLE_RATE);
      const db = powerRatioDb(before, after);
      expect(db).toBeLessThan(-attenuationDb + 2);
      expect(db).toBeGreaterThan(-attenuationDb - 2);
    });
  });

  it("(a') デチューンされた音 (G4, +30c) が対象でも指定 dB ±2dB で減衰する", () => {
    const variant = attenuateNoteInAudio(
      audio,
      SAMPLE_RATE,
      G4_MIDI,
      attenuationDb,
      A4_FREQ,
      [EB3_MIDI, C4_MIDI]
    );
    const trueFreq = midiToFreq(G4_MIDI, G4_DETUNE_CENTS);
    const before = goertzelPower(audio, trueFreq, SAMPLE_RATE);
    const after = goertzelPower(variant, trueFreq, SAMPLE_RATE);
    const db = powerRatioDb(before, after);
    expect(db).toBeGreaterThan(-attenuationDb - 2);
    expect(db).toBeLessThan(-attenuationDb + 2);
  });
});
