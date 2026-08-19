/**
 * chordEvalCli - 構成音推定の評価 CLI の実装 (引数解析・評価ループ・レポート出力)
 *
 * 評価対象はアプリと同じ HarmonicNoteDetector (構成音検出の唯一の実装)。
 * 音声デコード・採点・集計などの共通ロジックは chordEvalLib.ts が持つ。
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
  type ExpectedNote,
  type Summary,
  type Verdict,
} from "./chordEvalLib";
import { attenuateNoteInAudio } from "./spectralAttenuation";

const DEFAULT_SAMPLE_RATE = 48000;
const DEFAULT_A4 = 442;

interface ParsedArgs {
  inputs: string[];
  sampleRate: number;
  a4Freq: number;
  rootOptional: boolean;
  verbose: boolean;
  /** 指定時: レベル不均衡 augmentation (1 音ずつ減衰した変異体) で評価する dB 値 */
  attenuateDb?: number;
  /** 指定時: streaming 経路の StreamingChordTracker windowSeconds を上書きする */
  windowSeconds?: number;
}

function parseArgs(argv: string[], usage: string): ParsedArgs {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    console.log(usage);
    process.exit(args.length === 0 ? 1 : 0);
  }
  let sampleRate = DEFAULT_SAMPLE_RATE;
  let a4Freq = DEFAULT_A4;
  let rootOptional = false;
  let verbose = false;
  let attenuateDb: number | undefined;
  let windowSeconds: number | undefined;
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
    } else if (a === "--attenuate") {
      attenuateDb = parseFloat(args[++i]);
    } else if (a === "--window-seconds") {
      windowSeconds = parseFloat(args[++i]);
    } else {
      inputs.push(a);
    }
  }
  return {
    inputs,
    sampleRate,
    a4Freq,
    rootOptional,
    windowSeconds,
    verbose,
    attenuateDb,
  };
}

/**
 * ファイル名から会場などのグループキーを取り出す。
 * 実データの命名規則は "<日付>_<会場>_..." (例: 20260512_TUS_Tb_B_...) のため、
 * 先頭セグメントが数字のみ (日付) の場合は次のセグメントを会場として使う。
 * 日付プレフィックスがない場合は先頭セグメントをそのまま使う
 */
function extractGroup(filePath: string): string {
  const base = path.basename(filePath);
  const parts = base.split("_");
  if (parts.length > 1 && /^\d+$/.test(parts[0])) {
    return parts[1];
  }
  return parts[0];
}

function printSummary(
  label: string,
  summary: Summary,
  groupSummaries: Map<string, Summary>
): void {
  console.log(
    `[${label}] exact: ${summary.exact}/${summary.n} (${(
      (100 * summary.exact) /
      summary.n
    ).toFixed(0)}%)  ` +
      `F1: ${summary.f1.toFixed(3)} (P: ${summary.precision.toFixed(3)} / R: ${summary.recall.toFixed(3)})  ` +
      `missing: ${summary.missing}  extra: ${summary.extra} (うちオクターブ違い: ${summary.octaveErrors})  ` +
      `root=最低音: ${summary.rootIsLowest}/${summary.rootJudged}`
  );
  const groups = [...groupSummaries.keys()].sort();
  if (groups.length > 0) {
    const parts = groups.map((g) => {
      const s = groupSummaries.get(g)!;
      return `${g} F1=${s.f1.toFixed(3)} (exact ${s.exact}/${s.n})`;
    });
    console.log(`      会場別: ${parts.join("  ")}`);
  }
}

interface EvalEntry {
  group: string;
  expectedCount: number;
  batchVerdict: Verdict;
  streamingVerdict: Verdict;
}

/** entries から group ごとの Summary を作る */
function summarizeByGroup(
  entries: EvalEntry[],
  pick: (e: EvalEntry) => Verdict
): Map<string, Summary> {
  const byGroup = new Map<string, { verdicts: Verdict[]; counts: number[] }>();
  for (const entry of entries) {
    const verdict = pick(entry);
    let bucket = byGroup.get(entry.group);
    if (!bucket) {
      bucket = { verdicts: [], counts: [] };
      byGroup.set(entry.group, bucket);
    }
    bucket.verdicts.push(verdict);
    bucket.counts.push(entry.expectedCount);
  }
  const result = new Map<string, Summary>();
  for (const [group, { verdicts, counts }] of byGroup) {
    result.set(group, summarizeVerdicts(verdicts, counts));
  }
  return result;
}

export async function runChordEval(
  argv: string[],
  usage: string
): Promise<void> {
  const {
    inputs,
    sampleRate,
    a4Freq,
    rootOptional,
    verbose,
    attenuateDb,
    windowSeconds,
  } = parseArgs(argv, usage);
  const files = collectAudioFiles(inputs);
  if (files.length === 0) {
    throw new Error("No audio files found");
  }

  // createDetector 未指定 = 既定の HarmonicNoteDetector。
  // 検出器に合わせた estimationOptions が自動的に下敷きになる
  // (chordEvalLib.ts の resolveEstimationOptions 参照)
  const evalOptions: EvalOptions = {
    sampleRate,
    a4Freq,
    ...(windowSeconds !== undefined && {
      trackerOptions: { windowSeconds },
    }),
  };

  console.log(
    `${files.length} files, sampleRate=${evalOptions.sampleRate}, A4=${a4Freq}` +
      (rootOptional ? ", 根音は任意として採点 (--root-optional)" : "") +
      (attenuateDb !== undefined
        ? `, レベル不均衡 augmentation: 1 音ずつ ${attenuateDb}dB 減衰`
        : "") +
      "\n"
  );

  const entries: EvalEntry[] = [];
  const mark = (v: Verdict) => (v.exact ? "OK " : "NG ");

  async function evaluateAndRecord(
    audio: Float32Array,
    expected: ExpectedNote[],
    optionalMidi: Set<number>,
    group: string,
    label: string
  ): Promise<void> {
    const batch = await evaluateBatch(audio, evalOptions);
    const batchVerdict = judge(expected, batch, optionalMidi);

    const streamingResult = await evaluateStreaming(audio, evalOptions);
    const streamingVerdict = judge(
      expected,
      streamingResult.pitchList,
      optionalMidi
    );

    entries.push({
      group,
      expectedCount: expected.length - optionalMidi.size,
      batchVerdict,
      streamingVerdict,
    });

    console.log(`${mark(batchVerdict)}${mark(streamingVerdict)} ${label}`);
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
        `      streaming: ${formatPitchList(streamingResult.pitchList)} (${streamingResult.confirmations} confirmations)` +
          (streamingVerdict.exact
            ? ""
            : `  [missing: ${streamingVerdict.missing.map(midiToName).join(" ") || "-"} / extra: ${streamingVerdict.extra.map(midiToName).join(" ") || "-"}]`)
      );
    }
  }

  for (const file of files) {
    const expected = parseExpectedFromFilename(file);
    const optionalMidi = rootOptional
      ? new Set(expected.filter((e) => e.isRoot).map((e) => e.midi))
      : new Set<number>();
    const group = extractGroup(file);
    const name = path.basename(file);
    const audio = decodeAudioToMonoFloat32(file, evalOptions.sampleRate);

    if (attenuateDb === undefined) {
      await evaluateAndRecord(audio, expected, optionalMidi, group, name);
      continue;
    }

    // レベル不均衡 augmentation: 採点対象の正解音を 1 音ずつ減衰させた
    // 変異体を作り、それぞれを評価する (正解ラベルは変えない)
    const targets = expected.filter((e) => !optionalMidi.has(e.midi));
    for (const target of targets) {
      const protectMidi = expected
        .filter((e) => e.midi !== target.midi)
        .map((e) => e.midi);
      const variant = attenuateNoteInAudio(
        audio,
        evalOptions.sampleRate,
        target.midi,
        attenuateDb,
        a4Freq,
        protectMidi
      );
      await evaluateAndRecord(
        variant,
        expected,
        optionalMidi,
        group,
        `${name} [-${attenuateDb}dB ${target.name}]`
      );
    }
  }

  console.log("");
  printSummary(
    "batch    ",
    summarizeVerdicts(
      entries.map((e) => e.batchVerdict),
      entries.map((e) => e.expectedCount)
    ),
    summarizeByGroup(entries, (e) => e.batchVerdict)
  );
  printSummary(
    "streaming",
    summarizeVerdicts(
      entries.map((e) => e.streamingVerdict),
      entries.map((e) => e.expectedCount)
    ),
    summarizeByGroup(entries, (e) => e.streamingVerdict)
  );
}

/** CLI エントリポイントの共通エラーハンドリング */
export function runChordEvalMain(argv: string[], usage: string): void {
  runChordEval(argv, usage).catch((err: unknown) => {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
