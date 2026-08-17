/**
 * chordEvalLib - 構成音推定の実データ評価の共通ロジック
 *
 * evaluate-chord-detection.ts (CLI) とパラメータ探索スクリプトの両方から
 * 使うため、副作用 (main 実行) を持たないモジュールとして分離している。
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import ffmpegPath from "ffmpeg-static";

import {
  PitchPleaseNoteDetector,
  PITCH_PLEASE_ESTIMATION_OPTIONS,
  type PitchPleaseNoteDetectorOptions,
} from "../../src/audio_analysis/pitchPleaseNoteDetection";
import type { NoteDetector } from "../../src/adapters/noteDetection";
import {
  noteEventsToPitchList,
  type ChordToneEstimationOptions,
} from "../../src/audio_analysis/chordToneEstimation";
import {
  StreamingChordTracker,
  type StreamingChordTrackerOptions,
} from "../../src/audio_analysis/streamingChordTracker";
import { PITCH_NAME_LIST } from "../../src/constants";
import type { Pitch } from "../../src/types";

export const AUDIO_EXTENSIONS = new Set([
  ".wav",
  ".m4a",
  ".mp4",
  ".webm",
  ".ogg",
  ".mp3",
  ".flac",
]);

export interface ExpectedNote {
  name: string;
  midi: number;
  isRoot: boolean;
}

/** ディレクトリなら音声ファイルを列挙、ファイルならそのまま返す */
export function collectAudioFiles(inputs: string[]): string[] {
  const files: string[] = [];
  for (const input of inputs) {
    const stat = fs.statSync(input);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(input).sort()) {
        if (AUDIO_EXTENSIONS.has(path.extname(entry).toLowerCase())) {
          files.push(path.join(input, entry));
        }
      }
    } else {
      files.push(input);
    }
  }
  return files;
}

/** ファイル名末尾の "C4-Eb4-G4" ブロックを正解ラベルとして解釈する (先頭がルート) */
export function parseExpectedFromFilename(filePath: string): ExpectedNote[] {
  const base = path.basename(filePath, path.extname(filePath));
  const segment = base.split("_").at(-1) ?? "";
  return segment.split("-").map((token, i) => {
    const match = token.match(/^([A-G](?:#|b)?)(\d)$/);
    if (!match) {
      throw new Error(`Invalid pitch token "${token}" in "${base}"`);
    }
    const [, pitchName, octaveStr] = match;
    const pitchIndex = PITCH_NAME_LIST.indexOf(pitchName);
    if (pitchIndex === -1) {
      throw new Error(`Unsupported pitch name "${pitchName}"`);
    }
    const octaveNum = parseInt(octaveStr, 10);
    return {
      name: token,
      midi: (octaveNum + 1) * 12 + pitchIndex,
      isRoot: i === 0,
    };
  });
}

/** ffmpeg で任意の音声ファイルをモノラル 32bit float PCM にデコードする */
export function decodeAudioToMonoFloat32(
  audioPath: string,
  sampleRate: number
): Float32Array {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static binary is not available");
  }
  const result = spawnSync(
    ffmpegPath,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      audioPath,
      "-f",
      "f32le",
      "-ac",
      "1",
      "-ar",
      String(sampleRate),
      "-",
    ],
    { maxBuffer: 1024 * 1024 * 1024 }
  );
  if (result.status !== 0) {
    throw new Error(`ffmpeg decode failed: ${result.stderr?.toString() ?? ""}`);
  }
  const stdout = result.stdout as Buffer;
  const samples = new Float32Array(stdout.length / 4);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = stdout.readFloatLE(i * 4);
  }
  return samples;
}

export function pitchToMidi(p: Pitch): number {
  return (p.octaveNum + 1) * 12 + PITCH_NAME_LIST.indexOf(p.pitchName);
}

export function midiToName(m: number): string {
  return `${PITCH_NAME_LIST[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
}

export function formatPitchList(pitchList: Pitch[]): string {
  if (pitchList.length === 0) return "(none)";
  return pitchList
    .map((p) => `${p.pitchName}${p.octaveNum}${p.isRoot ? "*" : ""}`)
    .join(" ");
}

export interface Verdict {
  exact: boolean;
  missing: number[];
  extra: number[];
  /** extra のうち、正解音とピッチクラスが同じでオクターブ違いのもの */
  octaveErrors: number[];
  /** 検出リストのルートが最低音になっているか (検出なしは null) */
  rootIsLowest: boolean | null;
}

/**
 * 検出結果を正解と突き合わせる。
 * optionalMidi の音は「鳴っているかもしれない音」として扱い、
 * 検出しても extra にせず、検出できなくても missing にしない
 * (アンサンブル実験の録音は根音奏者の有無がファイルにより異なるため)。
 * ルートは「検出リスト内で最低音がルートに割り当てられているか」のみ検証する
 */
export function judge(
  expected: ExpectedNote[],
  detected: Pitch[],
  optionalMidi: Set<number> = new Set()
): Verdict {
  const expectedMidi = new Set(
    expected.filter((e) => !optionalMidi.has(e.midi)).map((e) => e.midi)
  );
  const detectedMidi = detected.map(pitchToMidi);
  const detectedSet = new Set(detectedMidi);
  const missing = [...expectedMidi].filter((m) => !detectedSet.has(m));
  const extra = [...detectedSet].filter(
    (m) => !expectedMidi.has(m) && !optionalMidi.has(m)
  );
  const expectedClasses = new Set(expected.map((e) => e.midi % 12));
  const octaveErrors = extra.filter((m) => expectedClasses.has(m % 12));
  const rootIndex = detected.findIndex((p) => p.isRoot);
  const rootIsLowest =
    detected.length === 0
      ? null
      : rootIndex !== -1 &&
        detectedMidi[rootIndex] === Math.min(...detectedMidi);
  return {
    exact: missing.length === 0 && extra.length === 0,
    missing,
    extra,
    octaveErrors,
    rootIsLowest,
  };
}

/**
 * 評価対象の NoteDetector を生成する関数。
 * アルゴリズムを差し替えるために注入する。core からは参照できない
 * ブラウザ依存の実装 (basic-pitch) は apps/web 側の CLI から注入される
 */
export type EvalDetectorFactory = (context: {
  sampleRate: number;
  a4Freq: number;
}) => NoteDetector;

export interface EvalOptions {
  /** 音声のデコード / 解析に使うサンプルレート (Hz) */
  sampleRate: number;
  a4Freq: number;
  /** NoteDetector の生成関数。省略時は PitchPleaseNoteDetector */
  createDetector?: EvalDetectorFactory;
  /** createDetector 未指定時に PitchPleaseNoteDetector へ渡す上書き */
  detectorOptions?: Partial<PitchPleaseNoteDetectorOptions>;
  estimationOptions?: ChordToneEstimationOptions;
  trackerOptions?: Partial<StreamingChordTrackerOptions>;
}

/**
 * EvalOptions から NoteDetector を生成する。
 * 実際に音声をデコードすべきサンプルレートは、生成した detector の
 * requiredSampleRate から取得すること (basic-pitch は 22050 固定)
 */
export function createEvalDetector(opts: EvalOptions): NoteDetector {
  if (opts.createDetector) {
    return opts.createDetector({
      sampleRate: opts.sampleRate,
      a4Freq: opts.a4Freq,
    });
  }
  return new PitchPleaseNoteDetector({
    a4Freq: opts.a4Freq,
    sampleRate: opts.sampleRate,
    ...opts.detectorOptions,
  });
}

/**
 * evaluateBatch に渡す estimationOptions を解決する。
 * createDetector 未指定 (= PitchPleaseNoteDetector の既定生成、pitchplease 既定)
 * のときは PITCH_PLEASE_ESTIMATION_OPTIONS を下敷きにする
 * (ユーザー指定の estimationOptions が優先)。basic-pitch など明示的に
 * createDetector を注入する場合は従来どおり opts.estimationOptions のみを使う。
 *
 * batch・streaming とも既定は legacy 集約 (durationAmplitude、二値採択の
 * 数え上げ)。段階3以前は batch のみ medianSalience (連続サリエンスの時間
 * 中央値) を既定にしていたが、noiseFloor 正規化でフレーム単位の採択自体が
 * 安定した結果、legacy 集約の方が全評価条件で上回った
 * (docs/CHORD_DETECTION.md 参照)。medianSalience はオプション機能として
 * estimationOptions で明示すれば利用できる
 */
function resolveBatchEstimationOptions(
  opts: EvalOptions
): ChordToneEstimationOptions | undefined {
  if (opts.createDetector) {
    return opts.estimationOptions;
  }
  return { ...PITCH_PLEASE_ESTIMATION_OPTIONS, ...opts.estimationOptions };
}

/** バッチ経路: ファイル全体を一括解析 */
export async function evaluateBatch(
  audio: Float32Array,
  opts: EvalOptions
): Promise<Pitch[]> {
  const detector = createEvalDetector(opts);
  const events = await detector.detectNotes(audio);
  return noteEventsToPitchList(events, resolveBatchEstimationOptions(opts));
}

/**
 * ストリーミング経路: アプリでは確定した和音が次の確定まで表示され続けるため、
 * 「最も長く表示されていた和音」を採用する。
 * estimationOptions は opts.estimationOptions のみを使う
 * (PITCH_PLEASE_ESTIMATION_OPTIONS を自動的には下敷きにしない。pitchplease の
 * streaming 既定値は StreamingChordTracker の STREAMING_CHORD_ESTIMATION_DEFAULTS
 * に委ねる。理由は resolveBatchEstimationOptions 参照)
 */
export async function evaluateStreaming(
  audio: Float32Array,
  opts: EvalOptions
): Promise<{ pitchList: Pitch[]; confirmations: number }> {
  const detector = createEvalDetector(opts);
  const tracker = new StreamingChordTracker({
    detector,
    sampleRate: opts.sampleRate,
    estimationOptions: opts.estimationOptions,
    ...opts.trackerOptions,
  });
  const chunkSize = 2048;
  const displayed: { pitchList: Pitch[]; sinceSample: number }[] = [];
  let confirmations = 0;
  for (let sent = 0; sent < audio.length; sent += chunkSize) {
    tracker.push(audio.subarray(sent, Math.min(sent + chunkSize, audio.length)));
    const { changed } = await tracker.poll();
    if (changed) {
      displayed.push({ pitchList: changed, sinceSample: sent });
      confirmations++;
    }
  }
  if (displayed.length === 0) {
    return { pitchList: [], confirmations };
  }
  let dominant = displayed[0];
  let dominantDuration = 0;
  for (let i = 0; i < displayed.length; i++) {
    const end =
      i + 1 < displayed.length ? displayed[i + 1].sinceSample : audio.length;
    const duration = end - displayed[i].sinceSample;
    if (duration > dominantDuration) {
      dominantDuration = duration;
      dominant = displayed[i];
    }
  }
  return { pitchList: dominant.pitchList, confirmations };
}

export interface Summary {
  n: number;
  exact: number;
  missing: number;
  extra: number;
  octaveErrors: number;
  rootIsLowest: number;
  rootJudged: number;
  /** ノート単位の precision / recall / F1 */
  precision: number;
  recall: number;
  f1: number;
}

export function summarizeVerdicts(
  verdicts: Verdict[],
  expectedCounts: number[]
): Summary {
  const n = verdicts.length;
  const exact = verdicts.filter((v) => v.exact).length;
  const missing = verdicts.reduce((s, v) => s + v.missing.length, 0);
  const extra = verdicts.reduce((s, v) => s + v.extra.length, 0);
  const octaveErrors = verdicts.reduce((s, v) => s + v.octaveErrors.length, 0);
  const rootJudgedList = verdicts.filter((v) => v.rootIsLowest !== null);
  const rootIsLowest = rootJudgedList.filter((v) => v.rootIsLowest).length;
  const totalExpected = expectedCounts.reduce((s, c) => s + c, 0);
  const truePositives = totalExpected - missing;
  const totalDetected = truePositives + extra;
  const precision = totalDetected > 0 ? truePositives / totalDetected : 0;
  const recall = totalExpected > 0 ? truePositives / totalExpected : 0;
  const f1 =
    precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : 0;
  return {
    n,
    exact,
    missing,
    extra,
    octaveErrors,
    rootIsLowest,
    rootJudged: rootJudgedList.length,
    precision,
    recall,
    f1,
  };
}
