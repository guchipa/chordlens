/**
 * ablation-chord-detection
 *
 * 構成音検出 (HarmonicNoteDetector) の各機構が実データで効いていることを
 * 示すためのアブレーション評価。機構を 1 つずつ無効化した検出器を、
 * その機構が対処しているはずのストレス条件で回し、完全版と比較する。
 *
 * 機構とストレス条件の対応:
 *
 * | 機構 | 無効化フラグ | 想定するストレス |
 * |---|---|---|
 * | デチューン探索 | disableDetuneSearch | ピッチのずれ (格子から ±20/±40 セント) |
 * | ノイズ床正規化 | useFrameMaxNormalization | 奏者間の音量差 (1 音 -6/-12dB) |
 * | 倍音和サリエンス | disableHarmonicSalience | 弱い基音 (原音 + 減衰) |
 * | 貪欲減算 | disableHarmonicSubtraction | 基音より強い倍音 (原音 + 減衰) |
 *
 * ピッチのずれは音声を加工せず **解析格子の側をずらす** ことで模擬する
 * (a4Freq を ±c セント動かす = 全奏者が ∓c セントずれて吹いた状態と等価)。
 * 正解ラベル (MIDI ノート番号) は変わらないため採点はそのまま使える。
 *
 * 使い方:
 *   pnpm --filter @chordlens/core eval:ablation <dir-or-files...>
 *     [--root-optional] [--sample-rate <hz>] [--a4 <hz>]
 *     [--conditions <id,...>] [--variants <id,...>]
 */

import path from "node:path";

import {
  collectAudioFiles,
  decodeAudioToMonoFloat32,
  evaluateBatch,
  evaluateStreaming,
  judge,
  parseExpectedFromFilename,
  summarizeVerdicts,
  type EvalOptions,
  type ExpectedNote,
  type Summary,
  type Verdict,
} from "./lib/chordEvalLib";
import { attenuateNoteInAudio } from "./lib/spectralAttenuation";
import { requireNumberArg, requireIdListArg } from "./lib/cliArgs";
import type { HarmonicNoteDetectorOptions } from "../src/audio_analysis/noteDetection";

const DEFAULT_SAMPLE_RATE = 48000;
const DEFAULT_A4 = 442;

/** 検出器の変種 (完全版 + 機構を 1 つ落としたもの) */
interface Variant {
  id: string;
  label: string;
  detectorOptions: Partial<HarmonicNoteDetectorOptions>;
}

const VARIANTS: Variant[] = [
  { id: "full", label: "完全版 (既定)", detectorOptions: {} },
  {
    id: "no-detune",
    label: "− デチューン探索",
    detectorOptions: { ablation: { disableDetuneSearch: true } },
  },
  {
    id: "no-floor",
    label: "− ノイズ床正規化 (frameMax 正規化)",
    detectorOptions: { ablation: { useFrameMaxNormalization: true } },
  },
  {
    id: "no-salience",
    label: "− 倍音和サリエンス (基音ビンのみ)",
    detectorOptions: { ablation: { disableHarmonicSalience: true } },
  },
  {
    id: "no-subtract",
    label: "− 貪欲減算",
    detectorOptions: { ablation: { disableHarmonicSubtraction: true } },
  },
  {
    id: "legacy-framemax",
    label: "参考: 旧 frameMax 一式 (矩形窓・6f 減算・閾値 0.15)",
    detectorOptions: {
      normalizationMode: "frameMax",
      fundamentalThreshold: 0.15,
    },
  },
];

/**
 * ストレス条件。
 * attenuateDb: 採点対象の正解音を 1 音ずつ減衰させた変異体で評価する
 * gridShiftCents: 解析格子 (a4Freq) をずらす = 演奏側のピッチずれの模擬
 */
interface Condition {
  id: string;
  label: string;
  attenuateDb?: number;
  gridShiftCents?: number;
  /** この条件で回す変種 (省略時は全変種) */
  variants?: string[];
}

const DETUNE_VARIANTS = ["full", "no-detune"];

const CONDITIONS: Condition[] = [
  { id: "orig", label: "原音" },
  { id: "att6", label: "1 音 -6dB (レベル不均衡)", attenuateDb: 6 },
  { id: "att12", label: "1 音 -12dB (レベル不均衡)", attenuateDb: 12 },
  {
    id: "detune+20",
    label: "格子 +20 セント (演奏が 20 セント低い)",
    gridShiftCents: 20,
    variants: DETUNE_VARIANTS,
  },
  {
    id: "detune-20",
    label: "格子 -20 セント (演奏が 20 セント高い)",
    gridShiftCents: -20,
    variants: DETUNE_VARIANTS,
  },
  {
    id: "detune+40",
    label: "格子 +40 セント (演奏が 40 セント低い)",
    gridShiftCents: 40,
    variants: DETUNE_VARIANTS,
  },
  {
    id: "detune-40",
    label: "格子 -40 セント (演奏が 40 セント高い)",
    gridShiftCents: -40,
    variants: DETUNE_VARIANTS,
  },
];

interface ParsedArgs {
  inputs: string[];
  sampleRate: number;
  a4Freq: number;
  rootOptional: boolean;
  conditionIds?: string[];
  variantIds?: string[];
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const usage =
    "Usage: pnpm --filter @chordlens/core eval:ablation <dir-or-files...> " +
    "[--root-optional] [--sample-rate <hz>] [--a4 <hz>] " +
    "[--conditions <id,...>] [--variants <id,...>]";
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    console.log(usage);
    process.exit(args.length === 0 ? 1 : 0);
  }
  const parsed: ParsedArgs = {
    inputs: [],
    sampleRate: DEFAULT_SAMPLE_RATE,
    a4Freq: DEFAULT_A4,
    rootOptional: false,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--sample-rate" || a === "-r") {
      parsed.sampleRate = requireNumberArg(args[++i], a, { integer: true });
    } else if (a === "--a4") {
      parsed.a4Freq = requireNumberArg(args[++i], a);
    } else if (a === "--root-optional") {
      parsed.rootOptional = true;
    } else if (a === "--conditions") {
      parsed.conditionIds = requireIdListArg(
        args[++i],
        a,
        CONDITIONS.map((c) => c.id)
      );
    } else if (a === "--variants") {
      parsed.variantIds = requireIdListArg(
        args[++i],
        a,
        VARIANTS.map((v) => v.id)
      );
    } else {
      parsed.inputs.push(a);
    }
  }
  return parsed;
}

/** ファイル名 "<日付>_<会場>_..." から会場セグメントを取り出す */
function extractGroup(filePath: string): string {
  const parts = path.basename(filePath).split("_");
  if (parts.length > 1 && /^\d+$/.test(parts[0])) return parts[1];
  return parts[0];
}

interface Sample {
  audio: Float32Array;
  expected: ExpectedNote[];
  optionalMidi: Set<number>;
  group: string;
}

/** 1 条件ぶんの採点結果 */
interface VariantResult {
  batch: Summary;
  streaming: Summary;
  batchByGroup: Map<string, Summary>;
}

function summarize(
  verdicts: Verdict[],
  counts: number[]
): Summary {
  return summarizeVerdicts(verdicts, counts);
}

function fmt(s: Summary): string {
  return (
    `F1 ${s.f1.toFixed(3)} (P ${s.precision.toFixed(3)} / R ${s.recall.toFixed(3)})  ` +
    `exact ${s.exact}/${s.n}  missing ${s.missing}  extra ${s.extra}(oct ${s.octaveErrors})`
  );
}

async function main(): Promise<void> {
  const { inputs, sampleRate, a4Freq, rootOptional, conditionIds, variantIds } =
    parseArgs(process.argv);
  const files = collectAudioFiles(inputs);
  if (files.length === 0) throw new Error("No audio files found");

  const conditions = CONDITIONS.filter(
    (c) => !conditionIds || conditionIds.includes(c.id)
  );
  const allVariants = VARIANTS.filter(
    (v) => !variantIds || variantIds.includes(v.id)
  );

  console.log(
    `${files.length} files, sampleRate=${sampleRate}, A4=${a4Freq}` +
      (rootOptional ? ", 根音は任意として採点" : "")
  );
  console.log(
    `conditions: ${conditions.map((c) => c.id).join(", ")}\n` +
      `variants: ${allVariants.map((v) => v.id).join(", ")}\n`
  );

  // 音声デコードは 1 ファイル 1 回だけ (全条件・全変種で使い回す)
  const samples: Sample[] = files.map((file) => {
    const expected = parseExpectedFromFilename(file);
    return {
      audio: decodeAudioToMonoFloat32(file, sampleRate),
      expected,
      optionalMidi: rootOptional
        ? new Set(expected.filter((e) => e.isRoot).map((e) => e.midi))
        : new Set<number>(),
      group: extractGroup(file),
    };
  });

  const results = new Map<string, Map<string, VariantResult>>();

  for (const condition of conditions) {
    const variants = allVariants.filter(
      (v) => !condition.variants || condition.variants.includes(v.id)
    );
    if (variants.length === 0) continue;
    const shiftedA4 =
      condition.gridShiftCents !== undefined
        ? a4Freq * Math.pow(2, condition.gridShiftCents / 1200)
        : a4Freq;

    // 変種 ID → 採点結果の蓄積
    const acc = new Map<
      string,
      {
        batch: Verdict[];
        streaming: Verdict[];
        counts: number[];
        groups: string[];
      }
    >();
    for (const v of variants) {
      acc.set(v.id, { batch: [], streaming: [], counts: [], groups: [] });
    }

    let done = 0;
    for (const sample of samples) {
      // 条件ごとの入力音声 (減衰 augmentation は 1 ファイルにつき正解音数ぶん)
      const inputsForFile: Float32Array[] = [];
      if (condition.attenuateDb === undefined) {
        inputsForFile.push(sample.audio);
      } else {
        const targets = sample.expected.filter(
          (e) => !sample.optionalMidi.has(e.midi)
        );
        for (const target of targets) {
          inputsForFile.push(
            attenuateNoteInAudio(
              sample.audio,
              sampleRate,
              target.midi,
              condition.attenuateDb,
              a4Freq,
              sample.expected
                .filter((e) => e.midi !== target.midi)
                .map((e) => e.midi)
            )
          );
        }
      }

      for (const audio of inputsForFile) {
        for (const variant of variants) {
          const evalOptions: EvalOptions = {
            sampleRate,
            a4Freq: shiftedA4,
            detectorOptions: variant.detectorOptions,
          };
          const batch = await evaluateBatch(audio, evalOptions);
          const streaming = await evaluateStreaming(audio, evalOptions);
          const bucket = acc.get(variant.id)!;
          bucket.batch.push(judge(sample.expected, batch, sample.optionalMidi));
          bucket.streaming.push(
            judge(sample.expected, streaming.pitchList, sample.optionalMidi)
          );
          bucket.counts.push(sample.expected.length - sample.optionalMidi.size);
          bucket.groups.push(sample.group);
        }
      }
      done++;
      process.stderr.write(
        `\r[${condition.id}] ${done}/${samples.length} files   `
      );
    }
    process.stderr.write("\n");

    const byVariant = new Map<string, VariantResult>();
    for (const variant of variants) {
      const b = acc.get(variant.id)!;
      const batchByGroup = new Map<string, Summary>();
      for (const group of new Set(b.groups)) {
        const idx = b.groups
          .map((g, i) => (g === group ? i : -1))
          .filter((i) => i >= 0);
        batchByGroup.set(
          group,
          summarize(
            idx.map((i) => b.batch[i]),
            idx.map((i) => b.counts[i])
          )
        );
      }
      byVariant.set(variant.id, {
        batch: summarize(b.batch, b.counts),
        streaming: summarize(b.streaming, b.counts),
        batchByGroup,
      });
    }
    results.set(condition.id, byVariant);

    console.log(`## ${condition.label} [${condition.id}]`);
    for (const variant of variants) {
      const r = byVariant.get(variant.id)!;
      console.log(`- ${variant.label}`);
      console.log(`    batch    : ${fmt(r.batch)}`);
      console.log(`    streaming: ${fmt(r.streaming)}`);
      const groups = [...r.batchByGroup.keys()].sort();
      console.log(
        `    会場別(batch): ${groups
          .map((g) => `${g} F1=${r.batchByGroup.get(g)!.f1.toFixed(3)}`)
          .join("  ")}`
      );
    }
    console.log("");
  }

  // 完全版との差分 (ΔF1) を 1 枚の表にまとめる
  console.log("## まとめ (ΔF1 = 変種 − 完全版, batch / streaming)\n");
  const header = ["変種", ...conditions.map((c) => c.id)];
  console.log(`| ${header.join(" | ")} |`);
  console.log(`|${header.map(() => "---").join("|")}|`);
  for (const variant of allVariants) {
    const cells = conditions.map((c) => {
      const byVariant = results.get(c.id);
      const r = byVariant?.get(variant.id);
      const full = byVariant?.get("full");
      if (!r) return "-";
      if (variant.id === "full") {
        return `${r.batch.f1.toFixed(3)} / ${r.streaming.f1.toFixed(3)}`;
      }
      if (!full) return `${r.batch.f1.toFixed(3)} / ${r.streaming.f1.toFixed(3)}`;
      const db = r.batch.f1 - full.batch.f1;
      const ds = r.streaming.f1 - full.streaming.f1;
      const sign = (x: number) => (x >= 0 ? "+" : "") + x.toFixed(3);
      return `${sign(db)} / ${sign(ds)}`;
    });
    console.log(`| ${variant.label} | ${cells.join(" | ")} |`);
  }
}

main().catch((err: unknown) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
