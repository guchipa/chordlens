import { StreamingChordTracker } from "../../src/audio_analysis/streamingChordTracker";
import { HarmonicNoteDetector } from "../../src/audio_analysis/noteDetection";
import type {
  DetectedNoteEvent,
  NoteDetector,
} from "../../src/adapters/noteDetection";
import type { Pitch } from "../../src/types";

const SAMPLE_RATE = 22050;
const FRAME_SECONDS = 0.25;
const FRAME_LENGTH = Math.floor(FRAME_SECONDS * SAMPLE_RATE);

/**
 * フレームごとの検出結果をスクリプトで返すフェイク detector。
 * script[i] = i 番目のフレームで検出される MIDI ノート番号のリスト
 */
class ScriptedDetector implements NoteDetector {
  readonly requiredSampleRate = SAMPLE_RATE;
  private frameIndex = 0;

  constructor(private script: number[][]) {}

  detectNotes(_monoAudio: Float32Array): Promise<DetectedNoteEvent[]> {
    const midiNotes =
      this.script[Math.min(this.frameIndex, this.script.length - 1)];
    this.frameIndex++;
    return Promise.resolve(
      midiNotes.map((midiNote) => ({
        midiNote,
        startTimeSeconds: 0,
        durationSeconds: FRAME_SECONDS,
        amplitude: 0.8,
      }))
    );
  }
}

function createTracker(script: number[][]): StreamingChordTracker {
  return new StreamingChordTracker({
    detector: new ScriptedDetector(script),
    sampleRate: SAMPLE_RATE,
    frameSeconds: FRAME_SECONDS,
    windowSeconds: 1.0,
    stableCycles: 2,
  });
}

/** frameCount フレームぶんの無音 PCM を push し、フレームごとに poll する */
async function runFrames(
  tracker: StreamingChordTracker,
  frameCount: number
): Promise<(Pitch[] | null)[]> {
  const changes: (Pitch[] | null)[] = [];
  for (let i = 0; i < frameCount; i++) {
    tracker.push(new Float32Array(FRAME_LENGTH));
    const { changed } = await tracker.poll();
    changes.push(changed);
  }
  return changes;
}

function keys(pitchList: Pitch[]): string[] {
  return pitchList.map((p) => `${p.pitchName}${p.octaveNum}`);
}

describe("StreamingChordTracker", () => {
  it("持続する和音は 3 フレーム (0.75秒) で確定する", async () => {
    const cMajor = [60, 64, 67];
    const tracker = createTracker([cMajor, cMajor, cMajor, cMajor]);

    const changes = await runFrames(tracker, 4);

    // フレーム1: 発音 0.25s < 0.4 で未検出、フレーム2: 初回推定、
    // フレーム3: 2 回一致 → 確定
    expect(changes[0]).toBeNull();
    expect(changes[1]).toBeNull();
    expect(changes[2]).not.toBeNull();
    expect(keys(changes[2]!)).toEqual(["C4", "E4", "G4"]);
    // 以降は変化なし
    expect(changes[3]).toBeNull();
  });

  it("1 フレームだけ現れた音 (ちらつき) は出力されない", async () => {
    const cMajor = [60, 64, 67];
    const withGlitch = [60, 64, 67, 75]; // Eb5 が 1 フレームだけ混入
    const tracker = createTracker([
      cMajor,
      cMajor,
      cMajor,
      withGlitch,
      cMajor,
      cMajor,
    ]);

    const changes = await runFrames(tracker, 6);

    const confirmed = changes.filter((c) => c !== null);
    expect(confirmed).toHaveLength(1);
    expect(keys(confirmed[0]!)).toEqual(["C4", "E4", "G4"]);
  });

  it("和音の変更はウィンドウ+ヒステリシスぶん遅れて確定する", async () => {
    const cMajor = [60, 64, 67];
    const fMajor = [65, 69, 72];
    const tracker = createTracker([
      ...Array(4).fill(cMajor),
      ...Array(8).fill(fMajor),
    ]);

    const changes = await runFrames(tracker, 12);

    const confirmed = changes
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c !== null);
    expect(confirmed).toHaveLength(2);
    expect(keys(confirmed[0].c!)).toEqual(["C4", "E4", "G4"]);
    expect(keys(confirmed[1].c!)).toEqual(["F4", "A4", "C5"]);
    // 切替 (フレーム5以降) から 1 秒 (4フレーム) 前後で確定する
    expect(confirmed[1].i - 4).toBeLessThanOrEqual(5);
  });

  it("新旧の音が混在する過渡状態は確定しない", async () => {
    const cMajor = [60, 64, 67];
    const fMajor = [65, 69, 72];
    const tracker = createTracker([
      ...Array(4).fill(cMajor),
      ...Array(8).fill(fMajor),
    ]);

    const changes = await runFrames(tracker, 12);

    // C と F の構成音が混ざったリスト (6音) が確定値として出ないこと
    for (const change of changes) {
      if (change) {
        expect(change.length).toBeLessThanOrEqual(3);
      }
    }
  });

  it("無音では silent: true を返し、確定済みリストは変化しない", async () => {
    const cMajor = [60, 64, 67];
    const silence: number[] = [];
    const tracker = createTracker([
      ...Array(4).fill(cMajor),
      ...Array(6).fill(silence),
    ]);

    for (let i = 0; i < 4; i++) {
      tracker.push(new Float32Array(FRAME_LENGTH));
      await tracker.poll();
    }
    // 無音区間
    let lastSilent = false;
    let changedDuringSilence = false;
    for (let i = 0; i < 6; i++) {
      tracker.push(new Float32Array(FRAME_LENGTH));
      const { silent, changed } = await tracker.poll();
      lastSilent = silent;
      if (changed) changedDuringSilence = true;
    }

    expect(lastSilent).toBe(true);
    expect(changedDuringSilence).toBe(false);
  });

  it("provisional のみのフレームは無音 (silent: true) 扱いになる", async () => {
    /** provisional イベントだけを返すフェイク detector */
    class ProvisionalOnlyDetector implements NoteDetector {
      readonly requiredSampleRate = SAMPLE_RATE;
      detectNotes(): Promise<DetectedNoteEvent[]> {
        return Promise.resolve([
          {
            midiNote: 60,
            startTimeSeconds: 0,
            durationSeconds: FRAME_SECONDS,
            amplitude: 0.2,
            provisional: true,
          },
        ]);
      }
    }
    const tracker = new StreamingChordTracker({
      detector: new ProvisionalOnlyDetector(),
      sampleRate: SAMPLE_RATE,
      frameSeconds: FRAME_SECONDS,
    });

    tracker.push(new Float32Array(FRAME_LENGTH));
    const { silent, changed } = await tracker.poll();

    expect(silent).toBe(true);
    expect(changed).toBeNull();
  });

  it("フレーム長未満のチャンクを跨いで蓄積できる", async () => {
    const cMajor = [60, 64, 67];
    const tracker = createTracker([cMajor, cMajor, cMajor]);

    const chunkSize = 1024;
    const totalSamples = FRAME_LENGTH * 3 + chunkSize;
    const confirmed: Pitch[][] = [];
    for (let sent = 0; sent < totalSamples; sent += chunkSize) {
      tracker.push(new Float32Array(chunkSize));
      const { changed } = await tracker.poll();
      if (changed) confirmed.push(changed);
    }

    expect(confirmed).toHaveLength(1);
    expect(keys(confirmed[0])).toEqual(["C4", "E4", "G4"]);
  });

  it("poll せずに容量を超えて push してもオーバーランから回復する", async () => {
    const cMajor = [60, 64, 67];
    const tracker = createTracker(Array(16).fill(cMajor));

    // バッファ容量 (2秒 = 8フレーム) を超えて一括 push
    tracker.push(new Float32Array(FRAME_LENGTH * 12));
    const first = await tracker.poll();
    // 読める範囲 (最新 ~8 フレーム) だけ処理され、確定に至る
    expect(first.changed).not.toBeNull();

    // 以降も正常に動き続ける
    const changes = await runFrames(tracker, 2);
    expect(changes.every((c) => c === null)).toBe(true);
  });

  it("実際の HarmonicNoteDetector と組み合わせて C メジャーを確定する", async () => {
    const a4Freq = 442;
    // このテストの主眼は StreamingChordTracker の追従・確定ロジックであり、
    // 正規化方式そのものではない。noiseFloor 既定値では背景雑音を含まない
    // 合成音の矩形窓スペクトル漏れが孤立ビンとして床から浮きやすいため
    // (noteDetection.test.ts と同じ既知の限界)、frameMax を明示する
    const detector = new HarmonicNoteDetector({
      a4Freq,
      sampleRate: SAMPLE_RATE,
      normalizationMode: "frameMax",
    });
    const tracker = new StreamingChordTracker({
      detector,
      sampleRate: SAMPLE_RATE,
      frameSeconds: FRAME_SECONDS,
    });

    const midiToFreq = (m: number) => a4Freq * Math.pow(2, (m - 69) / 12);
    const chordFreqs = [60, 64, 67].map(midiToFreq);
    const totalSamples = SAMPLE_RATE; // 1 秒
    const audio = new Float32Array(totalSamples);
    for (let i = 0; i < totalSamples; i++) {
      for (const freq of chordFreqs) {
        audio[i] += 0.3 * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE);
      }
    }

    const confirmed: Pitch[][] = [];
    const chunkSize = 2048;
    for (let sent = 0; sent < totalSamples; sent += chunkSize) {
      tracker.push(audio.subarray(sent, Math.min(sent + chunkSize, totalSamples)));
      const { changed } = await tracker.poll();
      if (changed) confirmed.push(changed);
    }

    expect(confirmed).toHaveLength(1);
    expect(keys(confirmed[0])).toEqual(["C4", "E4", "G4"]);
    expect(confirmed[0].find((p) => p.isRoot)?.pitchName).toBe("C");
  });
});
