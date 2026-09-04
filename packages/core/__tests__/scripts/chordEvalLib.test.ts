/**
 * chordEvalLib の NoteDetector 注入まわりのテスト。
 * 既定以外の検出器を差し込んで同じ採点ロジックで比較評価するための seam
 * (アブレーション実験で使う) が壊れていないことを確認する
 */

import { describe, expect, it } from "vitest";

import {
  createEvalDetector,
  evaluateBatch,
  evaluateStreaming,
  parseExpectedFromFilename,
  resolveEvalSampleRate,
  type EvalOptions,
} from "../../scripts/lib/chordEvalLib";
import { HarmonicNoteDetector } from "../../src/audio_analysis/noteDetection";
import type {
  DetectedNoteEvent,
  NoteDetector,
} from "../../src/adapters/noteDetection";

/** 呼び出しを記録するだけのダミー検出器 */
class StubNoteDetector implements NoteDetector {
  readonly requiredSampleRate: number;
  calls = 0;
  /** detectNotes に渡されたフレームの長さ (サンプル数) */
  readonly frameLengths: number[] = [];

  constructor(
    requiredSampleRate: number,
    private readonly events: DetectedNoteEvent[] = []
  ) {
    this.requiredSampleRate = requiredSampleRate;
  }

  detectNotes(monoAudio: Float32Array): Promise<DetectedNoteEvent[]> {
    this.calls++;
    this.frameLengths.push(monoAudio.length);
    return Promise.resolve(this.events);
  }
}

describe("parseExpectedFromFilename", () => {
  it("先頭の音を根音として MIDI 番号に変換する", () => {
    expect(parseExpectedFromFilename("20250101_hall_C4-Eb4-G4.wav")).toEqual([
      { name: "C4", midi: 60, isRoot: true },
      { name: "Eb4", midi: 63, isRoot: false },
      { name: "G4", midi: 67, isRoot: false },
    ]);
  });

  it("PITCH_NAME_LIST にない異名同音表記も受け付ける", () => {
    // Ab4 = G#4, D#4 = Eb4。表記揺れ 1 ファイルで評価ラン全体を落とさない
    expect(
      parseExpectedFromFilename("20250101_hall_Ab3-D#4-Gb4.wav").map(
        (e) => e.midi
      )
    ).toEqual([56, 63, 66]);
  });

  it("オクターブ番号が変わる B#/Cb は明示的に弾く", () => {
    expect(() => parseExpectedFromFilename("x_B#3-D4.wav")).toThrow(
      /B#\/Cb/
    );
  });

  it("音名として解釈できないトークンは弾く", () => {
    expect(() => parseExpectedFromFilename("x_H4-D4.wav")).toThrow(
      /Invalid pitch token/
    );
  });
});

describe("createEvalDetector", () => {
  it("createDetector 未指定なら HarmonicNoteDetector を生成する", () => {
    const detector = createEvalDetector({ sampleRate: 44100, a4Freq: 442 });
    expect(detector).toBeInstanceOf(HarmonicNoteDetector);
    expect(detector.requiredSampleRate).toBe(44100);
  });

  it("detectorOptions は既定の検出器に反映される", async () => {
    const detector = createEvalDetector({
      sampleRate: 22050,
      a4Freq: 442,
      detectorOptions: { maxNotesPerFrame: 1 },
    });
    // 単音 (A4) を与えて 1 フレームあたり 1 音しか返さないことを確認する
    const audio = new Float32Array(22050);
    for (let i = 0; i < audio.length; i++) {
      audio[i] =
        0.5 * Math.sin((2 * Math.PI * 442 * i) / 22050) +
        0.3 * Math.sin((2 * Math.PI * 884 * i) / 22050);
    }
    const events = await detector.detectNotes(audio);
    // provisional (採択閾値未満の候補標本) は maxNotesPerFrame の対象外なので除く
    const confirmed = events.filter((e) => !e.provisional);
    const byFrame = new Map<number, number>();
    for (const e of confirmed) {
      byFrame.set(e.startTimeSeconds, (byFrame.get(e.startTimeSeconds) ?? 0) + 1);
    }
    expect(confirmed.length).toBeGreaterThan(0);
    expect(Math.max(...byFrame.values())).toBe(1);
  });

  it("createDetector を渡すとそれが使われ、sampleRate と a4Freq が渡る", () => {
    const received: { sampleRate: number; a4Freq: number }[] = [];
    const stub = new StubNoteDetector(22050);
    const detector = createEvalDetector({
      sampleRate: 48000,
      a4Freq: 440,
      createDetector: (context) => {
        received.push(context);
        return stub;
      },
    });
    expect(detector).toBe(stub);
    expect(received).toEqual([{ sampleRate: 48000, a4Freq: 440 }]);
    // 注入した検出器の要求レートが優先される
    expect(detector.requiredSampleRate).toBe(22050);
  });
});

describe("resolveEvalSampleRate", () => {
  it("既定の検出器では opts.sampleRate をそのまま返す", () => {
    expect(resolveEvalSampleRate({ sampleRate: 44100, a4Freq: 442 })).toBe(
      44100
    );
  });

  it("固定レートを要求する検出器を注入するとそちらが優先される", () => {
    expect(
      resolveEvalSampleRate({
        sampleRate: 48000,
        a4Freq: 442,
        createDetector: () => new StubNoteDetector(22050),
      })
    ).toBe(22050);
  });
});

describe("evaluateStreaming", () => {
  it("注入した検出器の要求レートでフレームを切り出す", async () => {
    // 音声は resolveEvalSampleRate (= 22050) でデコードされている前提。
    // opts.sampleRate (48000) でトラッカーを組むとフレーム長と時刻がずれる
    const stub = new StubNoteDetector(22050);
    await evaluateStreaming(new Float32Array(22050), {
      sampleRate: 48000,
      a4Freq: 442,
      createDetector: () => stub,
    });

    const expectedFrameLength = Math.floor(0.25 * 22050);
    expect(stub.frameLengths.length).toBeGreaterThan(0);
    expect(stub.frameLengths.every((n) => n === expectedFrameLength)).toBe(true);
  });
});

describe("evaluateBatch", () => {
  it("注入した検出器のイベントを構成音リストに変換する", async () => {
    const events: DetectedNoteEvent[] = [60, 64, 67].flatMap((midiNote) =>
      Array.from({ length: 4 }, (_, i) => ({
        midiNote,
        startTimeSeconds: i * 0.25,
        durationSeconds: 0.25,
        amplitude: 1,
      }))
    );
    const stub = new StubNoteDetector(22050, events);
    const opts: EvalOptions = {
      sampleRate: 22050,
      a4Freq: 442,
      createDetector: () => stub,
    };

    const pitchList = await evaluateBatch(new Float32Array(2205), opts);

    expect(stub.calls).toBe(1);
    expect(
      pitchList.map((p) => `${p.pitchName}${p.octaveNum}${p.isRoot ? "*" : ""}`)
    ).toEqual(["C4*", "E4", "G4"]);
  });
});
