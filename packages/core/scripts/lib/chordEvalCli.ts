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
  type ExpectedNote,
  type Summary,
  type Verdict,
} from "./chordEvalLib";
import { attenuateNoteInAudio } from "./spectralAttenuation";

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
  /** 指定時: レベル不均衡 augmentation (1 音ずつ減衰した変異体) で評価する dB 値 */
  attenuateDb?: number;
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
  let attenuateDb: number | undefined;
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
    } else if (a === "--attenuate") {
      attenuateDb = parseFloat(args[++i]);
    } else {
      inputs.push(a);
    }
  }
  return {
    inputs,
    sampleRate,
    a4Freq,
    algorithm,
    rootOptional,
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
  streamingVerdict: Verdict | null;
}

/** entries から group ごとの Summary を作る (pick が null を返す entry は除外) */
function summarizeByGroup(
  entries: EvalEntry[],
  pick: (e: EvalEntry) => Verdict | null
): Map<string, Summary> {
  const byGroup = new Map<string, { verdicts: Verdict[]; counts: number[] }>();
  for (const entry of entries) {
    const verdict = pick(entry);
    if (!verdict) continue;
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
  config: ChordEvalCliConfig
): Promise<void> {
  const {
    inputs,
    sampleRate,
    a4Freq,
    algorithm,
    rootOptional,
    verbose,
    attenuateDb,
  } = parseArgs(argv, config);
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

    const streamingResult = streaming
      ? await evaluateStreaming(audio, evalOptions)
      : null;
    const streamingVerdict = streamingResult
      ? judge(expected, streamingResult.pitchList, optionalMidi)
      : null;

    entries.push({
      group,
      expectedCount: expected.length - optionalMidi.size,
      batchVerdict,
      streamingVerdict,
    });

    console.log(
      `${mark(batchVerdict)}${streamingVerdict ? mark(streamingVerdict) : ""} ${label}`
    );
    if (
      verbose ||
      !batchVerdict.exact ||
      (streamingVerdict && !streamingVerdict.exact)
    ) {
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
  const streamingEntries = entries.filter((e) => e.streamingVerdict);
  if (streamingEntries.length > 0) {
    printSummary(
      "streaming",
      summarizeVerdicts(
        streamingEntries.map((e) => e.streamingVerdict!),
        streamingEntries.map((e) => e.expectedCount)
      ),
      summarizeByGroup(entries, (e) => e.streamingVerdict)
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
