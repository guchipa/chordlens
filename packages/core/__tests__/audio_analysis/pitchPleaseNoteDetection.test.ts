import {
  PitchPleaseNoteDetector,
  harmonicSalience,
} from "../../src/audio_analysis/pitchPleaseNoteDetection";
import { noteEventsToPitchList } from "../../src/audio_analysis/chordToneEstimation";

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
      // provisional (採択閾値未満の弱い候補標本) は確定検出ではないため除く
      const confirmed = events.filter((e) => !e.provisional);

      expect(confirmed.length).toBeGreaterThan(0);
      expect(confirmed.every((e) => e.midiNote === 69)).toBe(true);
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

    it("強い第2倍音 (基音の70%) でも 3f の証拠があればオクターブ上を抑制する", async () => {
      const detector = new PitchPleaseNoteDetector({ a4Freq: A4_FREQ });
      const c3 = midiToFreq(48);
      // 実楽器を模した倍音構成: 第2倍音が旧閾値 (0.6) を超える強さ
      const audio = synthesize(
        [
          { freq: c3, amp: 1.0 }, // C3 基音
          { freq: c3 * 2, amp: 0.7 }, // 第2倍音 (C4) — 強い
          { freq: c3 * 3, amp: 0.3 }, // 第3倍音 (G4) — 基音が実音である証拠
        ],
        1.0
      );

      const events = await detector.detectNotes(audio);

      const detectedMidi = new Set(events.map((e) => e.midiNote));
      expect(detectedMidi.has(48)).toBe(true);
      expect(detectedMidi.has(60)).toBe(false); // 強くても倍音として抑制
      expect(detectedMidi.has(67)).toBe(false);
    });

    it("オクターブ重ねは低い方の音に解決する (誤検出抑制を優先)", async () => {
      // 2f 位置のエネルギーは「実音の重ね」か「第2倍音」かをスペクトルから
      // 区別できない。実録音の評価 (eval:chords) で倍音の誤検出が支配的
      // だったため、倍音側に解釈して低い方の音のみを報告する仕様とする
      const detector = new PitchPleaseNoteDetector({ a4Freq: A4_FREQ });
      const c3 = midiToFreq(48);
      const audio = synthesize(
        [
          { freq: c3, amp: 0.5 }, // C3
          { freq: c3 * 2, amp: 0.35 }, // C4 (実音の重ねだとしても C3 に解決)
        ],
        1.0
      );

      const events = await detector.detectNotes(audio);
      // provisional (確定検出ではない) を除いた確定検出のみを見る
      const detectedMidi = new Set(
        events.filter((e) => !e.provisional).map((e) => e.midiNote)
      );
      expect(detectedMidi.has(48)).toBe(true);
      expect(detectedMidi.has(60)).toBe(false);
    });

    it("明るい楽器の和音 (第2倍音が基音の85-90%) から倍音を最終出力に残さない", async () => {
      // 実測で C6/F6 (第2倍音) や G6 (第3倍音) が誤検出されたケースの再現。
      // フレーム段のリッチネス証拠 (F5 の 3f は候補範囲外の拡張グリッド) で
      // 大半を抑制し、位相の揺らぎですり抜けた単発フレームは集約段の
      // 倍音スコアフィルタが刈る (2 段の防御をエンドツーエンドで検証)
      const detector = new PitchPleaseNoteDetector({ a4Freq: A4_FREQ });
      const bright = (midi: number, gain: number) =>
        [1.0, 0.9, 0.55, 0.25].map((amp, k) => ({
          freq: midiToFreq(midi) * (k + 1),
          amp: amp * gain,
        }));
      const audio = synthesize(
        [
          ...bright(72, 0.25), // C5
          ...bright(77, 0.25), // F5 (3f = midi 96 は候補範囲外)
          ...bright(69, 0.18), // A4 (やや弱い)
        ],
        2.0
      );

      const events = await detector.detectNotes(audio);
      const pitchList = noteEventsToPitchList(events);

      expect(
        pitchList.map((p) => `${p.pitchName}${p.octaveNum}`)
      ).toEqual(["A4", "C5", "F5"]);
    });

    it("電源ハム (60Hz とその倍波) を低音の実音として検出しない", async () => {
      // 実測で B1/D2 の低域ジャンクが出たケースの再現。
      // ハムは半音格子上に 2f サポートを持たないため低音ゲートで除去される
      const detector = new PitchPleaseNoteDetector({ a4Freq: A4_FREQ });
      const audio = synthesize(
        [
          { freq: 60, amp: 0.15 }, // 電源ハム
          { freq: 120, amp: 0.08 },
          { freq: 180, amp: 0.05 },
          { freq: midiToFreq(60), amp: 0.4 }, // C4 (演奏音)
        ],
        1.0
      );

      const events = await detector.detectNotes(audio);

      expect(events.length).toBeGreaterThan(0);
      // C3 (midi 48) 未満の低域ジャンクが出ない
      expect(events.every((e) => e.midiNote >= 48)).toBe(true);
      expect(events.some((e) => e.midiNote === 60)).toBe(true);
    });

    it("低音の実音 (倍音サポートあり) は低音ゲートを通過する", async () => {
      const detector = new PitchPleaseNoteDetector({ a4Freq: A4_FREQ });
      const e2 = midiToFreq(40); // E2 ≈ 82.7Hz (コントラバス等)
      const audio = synthesize(
        [
          { freq: e2, amp: 0.4 },
          { freq: e2 * 2, amp: 0.3 }, // 実楽器の低音は必ず倍音を持つ
          { freq: e2 * 3, amp: 0.15 },
        ],
        1.0
      );

      const events = await detector.detectNotes(audio);

      expect(events.some((e) => e.midiNote === 40)).toBe(true);
    });

    it("sampleRate 48000 (AudioContext ネイティブレート) でも検出できる", async () => {
      const sampleRate = 48000;
      const detector = new PitchPleaseNoteDetector({
        a4Freq: A4_FREQ,
        sampleRate,
      });
      const length = sampleRate; // 1秒
      const audio = new Float32Array(length);
      for (let i = 0; i < length; i++) {
        audio[i] = 0.5 * Math.sin((2 * Math.PI * 442 * i) / sampleRate);
      }

      const events = await detector.detectNotes(audio);
      const confirmed = events.filter((e) => !e.provisional);

      expect(confirmed.length).toBeGreaterThan(0);
      expect(confirmed.every((e) => e.midiNote === 69)).toBe(true);
    });

    it("イベントの時刻・長さがフレームに対応する", async () => {
      const detector = new PitchPleaseNoteDetector({
        a4Freq: A4_FREQ,
        frameSeconds: 0.25,
      });
      const audio = synthesize([{ freq: 442, amp: 0.5 }], 1.0);

      const events = await detector.detectNotes(audio);
      // provisional は確定検出とは別枠の標本のためタイミング検証の対象外
      const confirmed = events.filter((e) => !e.provisional);

      // 1 秒 / 0.25 秒 = 4 フレームぶん検出される
      expect(confirmed).toHaveLength(4);
      confirmed.forEach((event, i) => {
        // フレーム長はサンプル数に丸められるため近似比較
        expect(event.startTimeSeconds).toBeCloseTo(i * 0.25, 3);
        expect(event.durationSeconds).toBe(0.25);
      });
    });

    it("採択閾値未満の弱い音を provisional として報告する", async () => {
      const detector = new PitchPleaseNoteDetector({ a4Freq: A4_FREQ });
      const c4 = midiToFreq(60);
      const a5 = midiToFreq(81); // C4 の倍音系列 (72,79,84,88,91) と重ならない
      const audio = synthesize(
        [
          { freq: c4, amp: 0.5 }, // 強い音: 確定検出される
          { freq: a5, amp: 0.05 }, // 弱い音: 採択閾値未満で provisional になる
        ],
        1.0
      );

      const events = await detector.detectNotes(audio);

      const confirmed = events.filter((e) => e.midiNote === 60);
      const provisional = events.filter((e) => e.midiNote === 81);

      expect(confirmed.length).toBeGreaterThan(0);
      expect(confirmed.every((e) => !e.provisional)).toBe(true);
      expect(provisional.length).toBeGreaterThan(0);
      expect(provisional.every((e) => e.provisional === true)).toBe(true);
      expect(
        provisional.every((e) => e.amplitude > 0 && e.amplitude < 1)
      ).toBe(true);
    });
  });

  describe("harmonicSalience", () => {
    it("倍音系列が立っている音のサリエンスは基音ビン単体より大きい", () => {
      // midi 48 の倍音系列 (2f=60, 3f=67, 4f=72) が立っている状況
      const amps = new Map([
        [48, 0.3],
        [60, 0.8],
        [67, 0.5],
        [72, 0.4],
      ]);
      const lookup = (m: number) => amps.get(m) ?? 0;

      const salience = harmonicSalience(48, lookup);

      expect(salience).toBeGreaterThan(0.3); // 基音ビン単体より大
      // 系列を持たない倍音位置 (midi 60 の系列は 72 のみ) より強い
      expect(salience).toBeGreaterThan(harmonicSalience(60, lookup));
    });

    it("範囲外の倍音は 0 として扱う", () => {
      const lookup = (m: number) => (m === 90 ? 1.0 : 0);
      expect(harmonicSalience(90, lookup)).toBe(1.0);
    });
  });

  describe("実楽器を模した倍音構成", () => {
    it("基音が弱く倍音が強い音 (金管の低音) も基音として検出する", async () => {
      const detector = new PitchPleaseNoteDetector({ a4Freq: A4_FREQ });
      const d4 = midiToFreq(62);
      // 実測したトランペットの特徴: 基音 < 倍音
      const audio = synthesize(
        [
          { freq: d4, amp: 0.15 },
          { freq: d4 * 2, amp: 0.35 },
          { freq: d4 * 3, amp: 0.3 },
          { freq: d4 * 4, amp: 0.35 },
          { freq: d4 * 6, amp: 0.4 },
        ],
        1.0
      );

      const events = await detector.detectNotes(audio);
      const pitchList = noteEventsToPitchList(events);

      // D4 のみ (D5=2f, A5=3f, D6=4f, A6=6f は倍音として検出しない)
      expect(pitchList.map((p) => `${p.pitchName}${p.octaveNum}`)).toEqual([
        "D4",
      ]);
    });

    it("偶数倍音が弱い音 (クラリネット型) の第3倍音を検出しない", async () => {
      const detector = new PitchPleaseNoteDetector({ a4Freq: A4_FREQ });
      const f4 = midiToFreq(65);
      // 円筒管楽器: 奇数倍音のみ
      const audio = synthesize(
        [
          { freq: f4, amp: 0.5 },
          { freq: f4 * 3, amp: 0.35 }, // C6
          { freq: f4 * 5, amp: 0.2 }, // A6
        ],
        1.0
      );

      const events = await detector.detectNotes(audio);
      const pitchList = noteEventsToPitchList(events);

      expect(pitchList.map((p) => `${p.pitchName}${p.octaveNum}`)).toEqual([
        "F4",
      ]);
    });

    it("平均律格子から 30 セントずれた音も検出する (デチューン耐性)", async () => {
      const detector = new PitchPleaseNoteDetector({ a4Freq: A4_FREQ });
      const f4Sharp30 = midiToFreq(65) * Math.pow(2, 30 / 1200);
      const audio = synthesize(
        [
          { freq: f4Sharp30, amp: 0.5 },
          { freq: f4Sharp30 * 2, amp: 0.3 },
          { freq: f4Sharp30 * 3, amp: 0.2 },
        ],
        1.0
      );

      const events = await detector.detectNotes(audio);
      const pitchList = noteEventsToPitchList(events);

      expect(pitchList.map((p) => `${p.pitchName}${p.octaveNum}`)).toEqual([
        "F4",
      ]);
    });
  });
});
