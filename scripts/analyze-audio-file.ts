/**
 * analyze-audio-file
 *
 * 音声ファイル (wav / m4a / mp4 など ffmpeg が扱える形式) を 60fps でフレーム解析し、
 * 既存の evaluateSpectrum() と同じロジックで構成音ごとの偏差を計算して CSV に書き出す。
 *
 * Web Audio API (AnalyserNode) の挙動を模倣するため、以下を実装している:
 *  - Blackman 窓 (W3C 仕様: w[n] = 0.42 - 0.5*cos(2πn/N) + 0.08*cos(4πn/N))
 *  - 実数 FFT -> 複素スペクトル -> 振幅 / fftSize
 *  - 前フレーム振幅とのスムージング: X̂[k] = τ * X̂_prev[k] + (1 - τ) * |X[k]|
 *  - dB 変換: 20 * log10(X̂[k])
 *
 * 構成音は入力ファイル名から抽出する。先頭の音がルート (isRoot) で固定。
 *   例) "song_C4-E4-G4.wav" → [C4(root), E4, G4]
 *   例) "C4-E4-G4.m4a"     → [C4(root), E4, G4]
 *
 * 使い方:
 *   npm run analyze:file -- <audio-file> [output.csv]
 */

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";

import FFT from "fft.js";
import ffmpegPath from "ffmpeg-static";

import { evaluateSpectrum } from "@/lib/audio_analysis/justAnalyze";
import {
  A4_FREQ,
  FFT_SIZE,
  SMOOTHING_TIME_CONSTANT,
  EVAL_RANGE_CENTS,
  EVAL_THRESHOLD,
  PITCH_NAME_LIST,
  OCTAVE_NUM_LIST,
} from "@/lib/constants";
import type { Pitch } from "@/lib/types";

const FPS = 60;
const DEFAULT_SAMPLE_RATE = 48000;

interface ParsedArgs {
  inputPath: string;
  outputPath: string;
  sampleRate: number;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    printUsage();
    process.exit(args.length === 0 ? 1 : 0);
  }

  let sampleRate = DEFAULT_SAMPLE_RATE;
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--sample-rate" || a === "-r") {
      const next = args[++i];
      if (!next) throw new Error("--sample-rate requires a value");
      sampleRate = parseInt(next, 10);
      if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
        throw new Error(`Invalid sample rate: ${next}`);
      }
    } else {
      positional.push(a);
    }
  }

  if (positional.length === 0) {
    throw new Error("Input audio file path is required");
  }

  const inputPath = positional[0];
  const outputPath =
    positional[1] ??
    inputPath.replace(/\.[^.]+$/, "") + ".csv";

  return { inputPath, outputPath, sampleRate };
}

function printUsage(): void {
  console.log(
    [
      "Usage: npm run analyze:file -- <audio-file> [output.csv] [--sample-rate <hz>]",
      "",
      "Arguments:",
      "  <audio-file>   Path to wav/m4a/mp4/etc. File name must contain the",
      "                 constituent pitches as the last underscore-delimited block,",
      "                 with pitches separated by '-'. First pitch is treated as root.",
      "                 Examples:",
      "                   song_C4-E4-G4.wav      -> [C4 (root), E4, G4]",
      "                   Cmaj7_C4-E4-G4-B4.m4a  -> [C4 (root), E4, G4, B4]",
      "                   F#4-A4-C#5.wav         -> [F#4 (root), A4, C#5]",
      "  [output.csv]   Optional output path (default: alongside input, .csv ext).",
      "",
      "Options:",
      `  --sample-rate  Sample rate used for decoding & analysis (default ${DEFAULT_SAMPLE_RATE}).`,
    ].join("\n"),
  );
}

/**
 * ファイル名末尾の構成音ブロックを解釈する。
 * 例: "anything_C4-E4-G4.wav" -> ["C4", "E4", "G4"]
 * 例: "C4-E4-G4.wav"          -> ["C4", "E4", "G4"]
 */
function parsePitchesFromFilename(filePath: string): Pitch[] {
  const base = path.basename(filePath, path.extname(filePath));
  const segments = base.split("_");
  const pitchSegment = segments[segments.length - 1];
  const tokens = pitchSegment.split("-").filter((t) => t.length > 0);

  if (tokens.length === 0) {
    throw new Error(`Could not extract pitches from filename "${base}"`);
  }

  const pitches: Pitch[] = tokens.map((token, i) => {
    const match = token.match(/^([A-G](?:#|b)?)(\d)$/);
    if (!match) {
      throw new Error(
        `Invalid pitch token "${token}" in filename. Expected like "C4", "F#3", "Bb5".`,
      );
    }
    const [, pitchName, octaveStr] = match;
    const octaveNum = parseInt(octaveStr, 10);
    if (!PITCH_NAME_LIST.includes(pitchName)) {
      throw new Error(
        `Unsupported pitch name "${pitchName}". Allowed: ${PITCH_NAME_LIST.join(", ")}`,
      );
    }
    if (!OCTAVE_NUM_LIST.includes(octaveNum)) {
      throw new Error(
        `Unsupported octave "${octaveNum}". Allowed: ${OCTAVE_NUM_LIST.join(", ")}`,
      );
    }
    return {
      pitchName: pitchName as Pitch["pitchName"],
      octaveNum,
      isRoot: i === 0,
      enabled: true,
    };
  });

  return pitches;
}

/**
 * ffmpeg で任意の音声ファイルをモノラル 32bit float little-endian PCM にデコードして返す。
 */
function decodeAudioToMonoFloat32(audioPath: string, sampleRate: number): Float32Array {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static binary path is not available on this platform");
  }
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`);
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
    { maxBuffer: 1024 * 1024 * 1024 },
  );

  if (result.status !== 0) {
    const err = result.stderr?.toString() ?? "(no stderr)";
    throw new Error(`ffmpeg decode failed (status=${result.status}): ${err}`);
  }

  const stdout = result.stdout as Buffer;
  if (stdout.length === 0) {
    throw new Error("ffmpeg produced empty PCM output");
  }
  if (stdout.length % 4 !== 0) {
    throw new Error(
      `PCM stream length (${stdout.length}) is not a multiple of 4 bytes (f32)`,
    );
  }

  const samples = new Float32Array(stdout.length / 4);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = stdout.readFloatLE(i * 4);
  }
  return samples;
}

/**
 * Web Audio API 仕様の Blackman 窓
 *   w[n] = 0.42 - 0.5 * cos(2π * n / N) + 0.08 * cos(4π * n / N), 0 ≤ n < N
 */
function buildBlackmanWindow(size: number): Float32Array {
  const w = new Float32Array(size);
  const twoPiOverN = (2 * Math.PI) / size;
  const fourPiOverN = (4 * Math.PI) / size;
  for (let n = 0; n < size; n++) {
    w[n] =
      0.42 - 0.5 * Math.cos(twoPiOverN * n) + 0.08 * Math.cos(fourPiOverN * n);
  }
  return w;
}

/**
 * AnalyserNode.getFloatFrequencyData() を模倣するクラス。
 * 呼び出すたびに「現在時刻から過去 fftSize サンプル分」を受け取り、
 *   - Blackman 窓
 *   - 実数 FFT
 *   - 振幅 / fftSize
 *   - 前フレームとのスムージング (smoothingTimeConstant)
 *   - dB 変換
 * を行い、長さ fftSize/2 の dB スペクトルを返す。
 */
class AnalyserEmulator {
  private readonly fft: FFT;
  private readonly fftSize: number;
  private readonly smoothing: number;
  private readonly window: Float32Array;
  private readonly smoothedMagnitude: Float64Array;
  private readonly windowed: Float64Array;
  private readonly complexOut: Float64Array;

  constructor(fftSize: number, smoothing: number) {
    this.fftSize = fftSize;
    this.smoothing = smoothing;
    this.fft = new FFT(fftSize);
    this.window = buildBlackmanWindow(fftSize);
    this.smoothedMagnitude = new Float64Array(fftSize / 2);
    this.windowed = new Float64Array(fftSize);
    // fft.js complex array length = 2 * size
    this.complexOut = new Float64Array(fftSize * 2);
  }

  /**
   * fftSize サンプル分の時間領域信号を受け取り dB スペクトル (長さ fftSize/2) を返す。
   */
  analyze(samples: Float32Array): Float32Array {
    if (samples.length !== this.fftSize) {
      throw new Error(
        `analyze(): expected ${this.fftSize} samples, got ${samples.length}`,
      );
    }

    for (let i = 0; i < this.fftSize; i++) {
      this.windowed[i] = samples[i] * this.window[i];
    }

    this.fft.realTransform(
      this.complexOut as unknown as number[],
      this.windowed as unknown as number[],
    );
    this.fft.completeSpectrum(this.complexOut as unknown as number[]);

    const half = this.fftSize / 2;
    const out = new Float32Array(half);
    const invN = 1 / this.fftSize;
    const tau = this.smoothing;
    const oneMinusTau = 1 - tau;

    for (let k = 0; k < half; k++) {
      const re = this.complexOut[2 * k];
      const im = this.complexOut[2 * k + 1];
      const mag = Math.sqrt(re * re + im * im) * invN;

      const smoothed = tau * this.smoothedMagnitude[k] + oneMinusTau * mag;
      this.smoothedMagnitude[k] = smoothed;

      out[k] = smoothed > 0 ? 20 * Math.log10(smoothed) : -Infinity;
    }

    return out;
  }
}

function buildFrequencyBins(fftSize: number, sampleRate: number): number[] {
  const half = fftSize / 2;
  const step = sampleRate / fftSize;
  const bins = new Array<number>(half);
  for (let i = 0; i < half; i++) {
    bins[i] = i * step;
  }
  return bins;
}

function escapeCsvValue(
  value: string | number | boolean | null | undefined,
): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  if (typeof value === "boolean") return String(value);
  const s = String(value);
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const CSV_HEADERS = [
  "timestamp",
  "elapsedMs",
  "sessionId",
  "pitchName",
  "pitchIsRoot",
  "deviation",
  "centDeviation",
  "centDeviationRaw",
  "centDeviationDisplay",
  "isDetected",
  "isHeld",
  "a4Freq",
  "evalRangeCents",
  "evalThreshold",
  "fftSize",
  "smoothingTimeConstant",
];

async function main(): Promise<void> {
  const { inputPath, outputPath, sampleRate } = parseArgs(process.argv);

  const pitchList = parsePitchesFromFilename(inputPath);
  console.log(
    `Input : ${inputPath}\n` +
      `Output: ${outputPath}\n` +
      `Pitches: ${pitchList
        .map((p) => `${p.pitchName}${p.octaveNum}${p.isRoot ? " (root)" : ""}`)
        .join(", ")}\n` +
      `Sample rate: ${sampleRate} Hz, FFT size: ${FFT_SIZE}, FPS: ${FPS}`,
  );

  const audio = decodeAudioToMonoFloat32(inputPath, sampleRate);
  const totalDurationSec = audio.length / sampleRate;
  console.log(
    `Decoded ${audio.length} samples (${totalDurationSec.toFixed(3)} s)`,
  );

  const freqBins = buildFrequencyBins(FFT_SIZE, sampleRate);
  const analyser = new AnalyserEmulator(FFT_SIZE, SMOOTHING_TIME_CONSTANT);

  const sessionId = randomUUID();
  const sessionStartMs = Date.now();
  const frameWindow = new Float32Array(FFT_SIZE);

  const totalFrames = Math.max(0, Math.floor(totalDurationSec * FPS));
  const csvRows: string[] = [CSV_HEADERS.join(",")];

  for (let frame = 0; frame < totalFrames; frame++) {
    const elapsedMs = (frame * 1000) / FPS;
    const endSampleExclusive = Math.floor((elapsedMs * sampleRate) / 1000) + 1;
    const startSample = endSampleExclusive - FFT_SIZE;

    // AnalyserNode は「直近 fftSize サンプル」を使う。開始直後は無音で埋める。
    for (let i = 0; i < FFT_SIZE; i++) {
      const idx = startSample + i;
      frameWindow[i] = idx >= 0 && idx < audio.length ? audio[idx] : 0;
    }

    const spectrum = analyser.analyze(frameWindow);
    const results = evaluateSpectrum(
      spectrum,
      freqBins,
      pitchList,
      EVAL_RANGE_CENTS,
      A4_FREQ,
      EVAL_THRESHOLD,
    );

    const timestamp = new Date(sessionStartMs + elapsedMs).toISOString();

    for (let i = 0; i < pitchList.length; i++) {
      const pitch = pitchList[i];
      const r = results[i];
      const deviation = r?.deviation ?? null;
      const centDeviation = r?.centDeviation ?? null;
      const isDetected = deviation !== null;

      const row = [
        escapeCsvValue(timestamp),
        escapeCsvValue(elapsedMs),
        escapeCsvValue(sessionId),
        escapeCsvValue(`${pitch.pitchName}${pitch.octaveNum}`),
        escapeCsvValue(pitch.isRoot ?? false),
        escapeCsvValue(deviation),
        escapeCsvValue(centDeviation !== null ? Number(centDeviation) : null),
        escapeCsvValue(centDeviation !== null ? Number(centDeviation) : null),
        "",
        escapeCsvValue(isDetected),
        escapeCsvValue(false),
        escapeCsvValue(A4_FREQ),
        escapeCsvValue(EVAL_RANGE_CENTS),
        escapeCsvValue(EVAL_THRESHOLD),
        escapeCsvValue(FFT_SIZE),
        escapeCsvValue(SMOOTHING_TIME_CONSTANT),
      ];
      csvRows.push(row.join(","));
    }
  }

  const bom = "﻿";
  fs.writeFileSync(outputPath, bom + csvRows.join("\n") + "\n", "utf8");
  console.log(
    `Wrote ${outputPath} (${totalFrames} frames × ${pitchList.length} pitches = ${
      totalFrames * pitchList.length
    } rows)`,
  );
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${msg}`);
  process.exit(1);
});
