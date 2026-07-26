/**
 * evaluate-chord-detection
 *
 * 録音データのディレクトリを走査し、構成音推定 (PitchPleaseNoteDetector) の
 * 精度をファイル名の正解ラベルと突き合わせて評価する。
 *
 * 正解ラベルはファイル名末尾のアンダースコア区切りブロック:
 *   例) "..._Cm_C4-Eb4-G4.webm" → 正解 [C4 (root), Eb4, G4]
 *
 * --root-optional: 根音を「任意の音」として採点する (検出しても extra に
 * せず、欠けても missing にしない)。アンサンブル実験の録音は根音奏者の
 * 有無がファイルによって異なるため、そのデータでは必須
 *
 * 2 つの経路を評価する:
 *  - batch:     ファイル全体を detectNotes → noteEventsToPitchList (バッチ既定値)
 *  - streaming: StreamingChordTracker (アプリの追従経路と同じ)。
 *               最も長く表示されていた確定リストを採用する
 *
 * 使い方:
 *   pnpm --filter @chordlens/core eval:chords <dir-or-files...>
 *     [--root-optional] [--sample-rate <hz>] [--a4 <hz>] [--verbose]
 */

import path from "node:path";

import {
  collectAudioFiles,
  decodeAudioToMonoFloat32,
  evaluateBatch,
  evaluateStreaming,
  formatPitchList,
  judge,
  midiToName,
  parseExpectedFromFilename,
  summarizeVerdicts,
  type EvalOptions,
  type Summary,
  type Verdict,
} from "./lib/chordEvalLib";

const DEFAULT_SAMPLE_RATE = 48000;
const DEFAULT_A4 = 442;

interface ParsedArgs {
  inputs: string[];
  sampleRate: number;
  a4Freq: number;
  rootOptional: boolean;
  verbose: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    console.log(
      "Usage: pnpm --filter @chordlens/core eval:chords <dir-or-files...> " +
        "[--root-optional] [--sample-rate <hz>] [--a4 <hz>] [--verbose]"
    );
    process.exit(args.length === 0 ? 1 : 0);
  }
  let sampleRate = DEFAULT_SAMPLE_RATE;
  let a4Freq = DEFAULT_A4;
  let rootOptional = false;
  let verbose = false;
  const inputs: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--sample-rate" || a === "-r") {
      sampleRate = parseInt(args[++i], 10);
    } else if (a === "--a4") {
      a4Freq = parseFloat(args[++i]);
    } else if (a === "--root-optional") {
      rootOptional = true;
    } else if (a === "--verbose" || a === "-v") {
      verbose = true;
    } else {
      inputs.push(a);
    }
  }
  return { inputs, sampleRate, a4Freq, rootOptional, verbose };
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

async function main(): Promise<void> {
  const { inputs, sampleRate, a4Freq, rootOptional, verbose } = parseArgs(
    process.argv
  );
  const files = collectAudioFiles(inputs);
  if (files.length === 0) {
    throw new Error("No audio files found");
  }
  console.log(
    `${files.length} files, sampleRate=${sampleRate}, A4=${a4Freq}` +
      (rootOptional ? ", 根音は任意として採点 (--root-optional)" : "") +
      "\n"
  );

  const evalOptions: EvalOptions = { sampleRate, a4Freq };
  const batchVerdicts: Verdict[] = [];
  const streamingVerdicts: Verdict[] = [];
  const expectedCounts: number[] = [];

  for (const file of files) {
    const expected = parseExpectedFromFilename(file);
    const optionalMidi = rootOptional
      ? new Set(expected.filter((e) => e.isRoot).map((e) => e.midi))
      : new Set<number>();
    expectedCounts.push(expected.length - optionalMidi.size);
    const audio = decodeAudioToMonoFloat32(file, sampleRate);

    const batch = await evaluateBatch(audio, evalOptions);
    const streaming = await evaluateStreaming(audio, evalOptions);
    const batchVerdict = judge(expected, batch, optionalMidi);
    const streamingVerdict = judge(expected, streaming.pitchList, optionalMidi);
    batchVerdicts.push(batchVerdict);
    streamingVerdicts.push(streamingVerdict);

    const name = path.basename(file);
    const mark = (v: Verdict) => (v.exact ? "OK " : "NG ");
    console.log(`${mark(batchVerdict)}${mark(streamingVerdict)} ${name}`);
    if (verbose || !batchVerdict.exact || !streamingVerdict.exact) {
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
      console.log(
        `      streaming: ${formatPitchList(streaming.pitchList)} (${streaming.confirmations} confirmations)` +
          (streamingVerdict.exact
            ? ""
            : `  [missing: ${streamingVerdict.missing.map(midiToName).join(" ") || "-"} / extra: ${streamingVerdict.extra.map(midiToName).join(" ") || "-"}]`)
      );
    }
  }

  console.log("");
  printSummary("batch    ", summarizeVerdicts(batchVerdicts, expectedCounts));
  printSummary(
    "streaming",
    summarizeVerdicts(streamingVerdicts, expectedCounts)
  );
}

main().catch((err: unknown) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
