/**
 * chordEvalLib の NoteDetector 注入まわりのテスト。
 * 評価 CLI は apps/web からブラウザ依存の検出器 (basic-pitch) を注入して
 * 同じ採点ロジックを共有するため、この seam が壊れると比較評価ができなくなる
 */

import { describe, expect, it } from "vitest";

import {
  createEvalDetector,
  evaluateBatch,
  type EvalOptions,
} from "../../scripts/lib/chordEvalLib";
import { PitchPleaseNoteDetector } from "../../src/audio_analysis/pitchPleaseNoteDetection";
import type {
  DetectedNoteEvent,
  NoteDetector,
} from "../../src/adapters/noteDetection";

/** 呼び出しを記録するだけのダミー検出器 */
class StubNoteDetector implements NoteDetector {
  readonly requiredSampleRate: number;
  calls = 0;

  constructor(
    requiredSampleRate: number,
    private readonly events: DetectedNoteEvent[] = []
  ) {
    this.requiredSampleRate = requiredSampleRate;
  }

  detectNotes(): Promise<DetectedNoteEvent[]> {
    this.calls++;
    return Promise.resolve(this.events);
  }
}

describe("createEvalDetector", () => {
  it("createDetector 未指定なら PitchPleaseNoteDetector を生成する", () => {
    const detector = createEvalDetector({ sampleRate: 44100, a4Freq: 442 });
    expect(detector).toBeInstanceOf(PitchPleaseNoteDetector);
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
    // 注入した検出器の要求レートが優先される (basic-pitch は 22050 固定)
    expect(detector.requiredSampleRate).toBe(22050);
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
