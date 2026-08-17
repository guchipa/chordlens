/**
 * chordEvalCli - 構成音推定の評価 CLI の共通実装
 *
 * core の CLI (pitchplease 専用) と apps/web の CLI (basic-pitch を含む) の
 * 両方から使う。core は apps/web に依存できないため、ブラウザ依存の
 * NoteDetector 実装は resolveDetector 経由で呼び出し側から注入する。
 */

import path from "node:path";

import {
  collectAudioFiles,
  createEvalDetector,
  decodeAudioToMonoFloat32,
  evaluateBatch,
  evaluateStreaming,
  formatPitchList,
  judge,
  midiToName,
  parseExpectedFromFilename,
  summarizeVerdicts,
  type EvalDetectorFactory,
  type EvalOptions,
  type Summary,
  type Verdict,
} from "./chordEvalLib";

const DEFAULT_SAMPLE_RATE = 48000;
const DEFAULT_A4 = 442;

export interface ChordEvalCliConfig {
  /** Usage 行 (--help / 引数なしで表示する) */
  usage: string;
  /** --algorithm の既定値 */
  defaultAlgorithm: string;
  /** 指定アルゴリズムの NoteDetector 生成関数を返す。未知の名前なら throw する */
  resolveDetector: (algorithm: string) => EvalDetectorFactory;
  /**
   * ストリーミング経路 (StreamingChordTracker) を評価できるアルゴリズムか。
   * false の場合は batch のみ評価する
   */
  supportsStreaming: (algorithm: string) => boolean;
}

interface ParsedArgs {
  inputs: string[];
  sampleRate: number;
  a4Freq: number;
  algorithm: string;
  rootOptional: boolean;
  verbose: boolean;
}

function parseArgs(
  argv: string[],
  config: ChordEvalCliConfig
): ParsedArgs {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    console.log(config.usage);
    process.exit(args.length === 0 ? 1 : 0);
  }
  let sampleRate = DEFAULT_SAMPLE_RATE;
  let a4Freq = DEFAULT_A4;
  let algorithm = config.defaultAlgorithm;
  let rootOptional = false;
  let verbose = false;
  const inputs: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--sample-rate" || a === "-r") {
      sampleRate = parseInt(args[++i], 10);
    } else if (a === "--a4") {
      a4Freq = parseFloat(args[++i]);
    } else if (a === "--algorithm" || a === "-a") {
      algorithm = args[++i];
    } else if (a === "--root-optional") {
      rootOptional = true;
    } else if (a === "--verbose" || a === "-v") {
      verbose = true;
    } else {
      inputs.push(a);
    }
  }
  return { inputs, sampleRate, a4Freq, algorithm, rootOptional, verbose };
}

function printSummary(label: string, summary: Summary): void {
  console.log(
    `[${label}] exact: ${summary.exact}/${summary.n} (${(
      (100 * summary.exact) /
      summary.n
    ).toFixed(0)}%)  ` +
      `F1: ${summary.f1.toFixed(3)} (P: ${summary.precision.toFixed(3)} / R: ${summary.recall.toFixed(3)})  ` +
      `missing: ${summary.missing}  extra: ${summary.extra} (うちオクターブ違い: ${summary.octaveErrors})  ` +
      `root=最低音: ${summary.rootIsLowest}/${summary.rootJudged}`
  );
}

export async function runChordEval(
  argv: string[],
  config: ChordEvalCliConfig
): Promise<void> {
  const { inputs, sampleRate, a4Freq, algorithm, rootOptional, verbose } =
    parseArgs(argv, config);
  const files = collectAudioFiles(inputs);
  if (files.length === 0) {
    throw new Error("No audio files found");
  }

  const createDetector = config.resolveDetector(algorithm);
  const streaming = config.supportsStreaming(algorithm);

  // 実際のデコードレートは detector の要求に従う
  // (pitchplease は --sample-rate をそのまま使うが、basic-pitch は 22050 固定)
  const probe = createEvalDetector({ sampleRate, a4Freq, createDetector });
  const evalOptions: EvalOptions = {
    sampleRate: probe.requiredSampleRate,
    a4Freq,
    createDetector,
  };

  console.log(
    `${files.length} files, algorithm=${algorithm}, sampleRate=${evalOptions.sampleRate}, A4=${a4Freq}` +
      (rootOptional ? ", 根音は任意として採点 (--root-optional)" : "") +
      (streaming ? "" : ", streaming 非対応のため batch のみ評価") +
      "\n"
  );

  const batchVerdicts: Verdict[] = [];
  const streamingVerdicts: Verdict[] = [];
  const expectedCounts: number[] = [];

  for (const file of files) {
    const expected = parseExpectedFromFilename(file);
    const optionalMidi = rootOptional
      ? new Set(expected.filter((e) => e.isRoot).map((e) => e.midi))
      : new Set<number>();
    expectedCounts.push(expected.length - optionalMidi.size);
    const audio = decodeAudioToMonoFloat32(file, evalOptions.sampleRate);

    const batch = await evaluateBatch(audio, evalOptions);
    const batchVerdict = judge(expected, batch, optionalMidi);
    batchVerdicts.push(batchVerdict);

    const streamingResult = streaming
      ? await evaluateStreaming(audio, evalOptions)
      : null;
    const streamingVerdict = streamingResult
      ? judge(expected, streamingResult.pitchList, optionalMidi)
      : null;
    if (streamingVerdict) {
      streamingVerdicts.push(streamingVerdict);
    }

    const name = path.basename(file);
    const mark = (v: Verdict) => (v.exact ? "OK " : "NG ");
    console.log(
      `${mark(batchVerdict)}${streamingVerdict ? mark(streamingVerdict) : ""} ${name}`
    );
    if (verbose || !batchVerdict.exact || (streamingVerdict && !streamingVerdict.exact)) {
      console.log(
        `      expected : ${expected
          .map((e) => (optionalMidi.has(e.midi) ? `(${e.name})` : e.name))
          .join(" ")}`
      );
      console.log(
        `      batch    : ${formatPitchList(batch)}` +
          (batchVerdict.exact
            ? ""
            : `  [missing: ${batchVerdict.missing.map(midiToName).join(" ") || "-"} / extra: ${batchVerdict.extra.map(midiToName).join(" ") || "-"}]`)
      );
      if (streamingResult && streamingVerdict) {
        console.log(
          `      streaming: ${formatPitchList(streamingResult.pitchList)} (${streamingResult.confirmations} confirmations)` +
            (streamingVerdict.exact
              ? ""
              : `  [missing: ${streamingVerdict.missing.map(midiToName).join(" ") || "-"} / extra: ${streamingVerdict.extra.map(midiToName).join(" ") || "-"}]`)
        );
      }
    }
  }

  console.log("");
  printSummary("batch    ", summarizeVerdicts(batchVerdicts, expectedCounts));
  if (streamingVerdicts.length > 0) {
    printSummary(
      "streaming",
      summarizeVerdicts(streamingVerdicts, expectedCounts)
    );
  }
}

/** CLI エントリポイントの共通エラーハンドリング */
export function runChordEvalMain(
  argv: string[],
  config: ChordEvalCliConfig
): void {
  runChordEval(argv, config).catch((err: unknown) => {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
