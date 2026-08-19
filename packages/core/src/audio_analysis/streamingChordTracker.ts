/**
 * StreamingChordTracker - PCM ストリームからの逐次和音推定
 *
 * AudioWorklet 等から push される PCM チャンクをリングバッファに蓄積し、
 * frameSeconds ぶん揃うごとに NoteDetector で解析、直近 windowSeconds の
 * ノートイベントから構成音リストを推定する。バッチ方式 (数秒録音→一括解析)
 * と違い、フレームごとに 1 回だけ解析するため再計算がなく、
 * 音の変化からおよそ「2フレーム蓄積 + ヒステリシス 1 サイクル」(≈0.75秒) で
 * 結果が確定する。
 *
 * ちらつき防止の 2 層:
 * 1. 集約閾値 minTotalDurationSeconds = 0.4 (2 フレーム以上の継続を要求)
 * 2. ヒステリシス: 直近 stableCycles 回の推定が一致して初めて確定
 *
 * Float32Array 操作と NoteDetector 呼び出しのみでブラウザ API に依存しない
 * (プラットフォーム依存のキャプチャは呼び出し側が担う)。
 */

import type { NoteDetector } from "../adapters/noteDetection";
import type { DetectedNoteEvent } from "../adapters/noteDetection";
import type { Pitch } from "../types";
import {
  noteEventsToPitchList,
  type ChordToneEstimationOptions,
} from "./chordToneEstimation";
import { Float32RingBuffer } from "./float32RingBuffer";

/**
 * ストリーミング用の集約パラメータ。
 * バッチ用デフォルト (minTotalDurationSeconds: 0.15) は 3 秒録音が前提。
 * 1 秒窓ではフレーム 1 枚 (0.25 秒) で通ってしまいちらつくため、
 * 2 フレーム以上 (0.25 < 0.4 <= 0.5) の継続を最低条件にする。
 *
 * subOctaveSuppressionScoreRatio: StreamingChordTracker は NoteDetector 非依存だが、
 * 実際に注入されるのは PitchPleaseNoteDetector のみ。
 * pitchPleaseNoteDetection.ts の PITCH_PLEASE_SUB_OCTAVE_SUPPRESSION_RATIO と
 * 同値を batch・streaming 両経路に適用する (値の由来はそちらのコメント参照)
 */
export const STREAMING_CHORD_ESTIMATION_DEFAULTS: ChordToneEstimationOptions = {
  minTotalDurationSeconds: 0.4,
  subOctaveSuppressionScoreRatio: 0.4,
};

export interface StreamingChordTrackerOptions {
  detector: NoteDetector;
  /** 入力 PCM のサンプルレート (Hz)。detector の想定レートと一致させること */
  sampleRate: number;
  /** 解析フレーム長 (秒)。detector 側の frameSeconds と一致させる */
  frameSeconds?: number;
  /** 推定に使うスライディングウィンドウ長 (秒) */
  windowSeconds?: number;
  /** 同一の推定がこの回数連続したら確定する */
  stableCycles?: number;
  /** リングバッファ容量 (秒) */
  bufferSeconds?: number;
  /** 集約パラメータの上書き (デフォルト: STREAMING_CHORD_ESTIMATION_DEFAULTS) */
  estimationOptions?: ChordToneEstimationOptions;
}

export interface StreamingChordUpdate {
  /** 最後に解析したフレームが無音 (検出なし) だったか */
  silent: boolean;
  /** 確定した新しい構成音リスト。変化がなければ null */
  changed: Pitch[] | null;
}

/** 構成音リストの同一判定に使うキー (音名+オクターブ+ルート) */
function pitchListKey(pitchList: Pitch[]): string {
  return pitchList
    .map((p) => `${p.pitchName}${p.octaveNum}${p.isRoot ? "*" : ""}`)
    .join(",");
}

export class StreamingChordTracker {
  private readonly detector: NoteDetector;
  private readonly sampleRate: number;
  private readonly frameSeconds: number;
  private readonly windowSeconds: number;
  private readonly stableCycles: number;
  private readonly estimationOptions: ChordToneEstimationOptions;

  private readonly ring: Float32RingBuffer;
  private readonly frameBuffer: Float32Array;
  /** リングバッファから消費した累計サンプル数 */
  private consumed = 0;
  /** ウィンドウ内のノートイベント (startTimeSeconds はストリーム絶対時刻) */
  private events: DetectedNoteEvent[] = [];
  private recentKeys: string[] = [];
  private stableKey = "";
  private lastFrameSilent = true;
  private processing = false;

  constructor(options: StreamingChordTrackerOptions) {
    this.detector = options.detector;
    this.sampleRate = options.sampleRate;
    this.frameSeconds = options.frameSeconds ?? 0.25;
    this.windowSeconds = options.windowSeconds ?? 1.0;
    this.stableCycles = options.stableCycles ?? 2;
    this.estimationOptions = {
      ...STREAMING_CHORD_ESTIMATION_DEFAULTS,
      ...options.estimationOptions,
    };

    const frameLength = Math.floor(this.frameSeconds * this.sampleRate);
    this.frameBuffer = new Float32Array(frameLength);
    const bufferSeconds = options.bufferSeconds ?? 2;
    this.ring = new Float32RingBuffer(
      Math.max(frameLength * 2, Math.floor(bufferSeconds * this.sampleRate))
    );
  }

  /** PCM チャンクを蓄積する (どのサイズでもよい) */
  push(chunk: Float32Array): void {
    this.ring.write(chunk);
  }

  /**
   * 蓄積済みのフレームをすべて解析し、確定した変化を返す。
   * 実行中に再入した場合は何もしない (チャンク到着ごとに呼んでよい)
   */
  async poll(): Promise<StreamingChordUpdate> {
    if (this.processing) {
      return { silent: this.lastFrameSilent, changed: null };
    }
    this.processing = true;
    try {
      let changed: Pitch[] | null = null;

      // 解析が追いつかず上書きされた場合は最新位置まで読み飛ばす
      if (this.ring.hasOverrun(this.consumed)) {
        this.consumed = this.ring.oldestReadable();
      }

      while (this.ring.readInto(this.frameBuffer, this.consumed)) {
        const frameStartSeconds = this.consumed / this.sampleRate;
        this.consumed += this.frameBuffer.length;

        const frameEvents = await this.detector.detectNotes(this.frameBuffer);
        // provisional (採択閾値未満の候補標本) のみ、または空のフレームは
        // 無音扱いにする。確定検出が 1 つもないという点では従来 (length===0)
        // と同じ意味であり、medianSalience の標本収集はこの判定に影響しない
        this.lastFrameSilent = frameEvents.every((e) =>
          Boolean(e.provisional)
        );
        for (const event of frameEvents) {
          this.events.push({
            ...event,
            startTimeSeconds: frameStartSeconds + event.startTimeSeconds,
          });
        }

        // ウィンドウ外の古いイベントを剪定
        const windowStart =
          this.consumed / this.sampleRate - this.windowSeconds;
        this.events = this.events.filter(
          (e) => e.startTimeSeconds >= windowStart
        );

        const update = this.evaluateCycle();
        if (update) {
          changed = update;
        }
      }

      return { silent: this.lastFrameSilent, changed };
    } finally {
      this.processing = false;
    }
  }

  /**
   * 1 フレームぶんの推定とヒステリシス判定。
   * 直近 stableCycles 回の推定キーが一致し、かつ現在の確定値と異なる
   * 非空リストのときだけ新しい確定値を返す
   */
  private evaluateCycle(): Pitch[] | null {
    const pitchList = noteEventsToPitchList(this.events, this.estimationOptions);
    const key = pitchListKey(pitchList);

    this.recentKeys.push(key);
    if (this.recentKeys.length > this.stableCycles) {
      this.recentKeys.shift();
    }

    const isStable =
      this.recentKeys.length === this.stableCycles &&
      this.recentKeys.every((k) => k === key);

    if (isStable && pitchList.length > 0 && key !== this.stableKey) {
      this.stableKey = key;
      return pitchList;
    }
    return null;
  }
}
