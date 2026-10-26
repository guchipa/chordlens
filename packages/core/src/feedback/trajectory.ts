/**
 * ピッチ軌跡 (偏差の時系列) のバッファ。
 *
 * 直近 windowMs の偏差を構成音ごとに保持し、和音ごとの区間を求める。
 * 和音の確定には遅れがある (推定ウィンドウ + ヒステリシスで約 1 秒) ため、
 * 切替の判定中 (transitioning) のサンプルは旧和音を基準にした偏差になる。
 * 和音が切り替わった時点で、判定中の区間とその直前 retroTransitionMs を
 * さかのぼって「切替区間」とし、誤った偏差を和音の区間に含めない。
 */

import type { ChordRole } from "./chordRoles";

export interface TrajectoryVoiceSample {
  key: string;
  role: ChordRole | null;
  /** ±1 正規化の偏差。未検出は null */
  deviation: number | null;
}

export interface TrajectorySample {
  t: number;
  chordKey: string;
  chordLabel: string;
  /** 切替区間 (旧和音基準の偏差を含みうる) */
  transition: boolean;
  voices: TrajectoryVoiceSample[];
}

export interface TrajectorySegment {
  /** 切替区間なら null */
  chordKey: string | null;
  chordLabel: string | null;
  start: number;
  end: number;
}

export interface TrajectoryPushInput {
  chordKey: string;
  chordLabel: string;
  transitioning: boolean;
  voices: TrajectoryVoiceSample[];
}

export interface TrajectoryBufferOptions {
  /** 保持する時間幅 (ms) */
  windowMs: number;
  /** サンプルの最小間隔 (ms)。これより短い間隔の push は捨てる */
  minIntervalMs: number;
  /**
   * 和音の切替時に、判定開始よりさらにさかのぼって切替区間とする時間 (ms)。
   * 判定 (pending) が立つまでにも数フレームの遅れがあるため
   */
  retroTransitionMs: number;
}

export const TRAJECTORY_DEFAULTS: TrajectoryBufferOptions = {
  windowMs: 10_000,
  minIntervalMs: 50,
  retroTransitionMs: 500,
};

export class TrajectoryBuffer {
  private samples: TrajectorySample[] = [];
  /** 現在続いている判定中区間の開始時刻 */
  private transitionStart: number | null = null;

  constructor(private readonly options: TrajectoryBufferOptions = TRAJECTORY_DEFAULTS) {}

  get windowMs(): number {
    return this.options.windowMs;
  }

  clear(): void {
    this.samples = [];
    this.transitionStart = null;
  }

  push(t: number, input: TrajectoryPushInput): void {
    const last = this.samples[this.samples.length - 1];
    const chordChanged = last !== undefined && last.chordKey !== input.chordKey;
    if (last && !chordChanged && t - last.t < this.options.minIntervalMs) return;

    if (input.transitioning) {
      this.transitionStart ??= t;
    }

    if (chordChanged) {
      // 切替を確定したので、判定開始 (なければ今) からさかのぼって切替区間にする
      const from = (this.transitionStart ?? t) - this.options.retroTransitionMs;
      for (let i = this.samples.length - 1; i >= 0 && this.samples[i].t >= from; i--) {
        this.samples[i].transition = true;
      }
    }
    if (!input.transitioning) {
      this.transitionStart = null;
    }

    this.samples.push({
      t,
      chordKey: input.chordKey,
      chordLabel: input.chordLabel,
      transition: input.transitioning,
      voices: input.voices,
    });

    const oldest = t - this.options.windowMs;
    let drop = 0;
    while (drop < this.samples.length && this.samples[drop].t < oldest) drop++;
    if (drop > 0) this.samples.splice(0, drop);
  }

  getSamples(): readonly TrajectorySample[] {
    return this.samples;
  }

  /** 和音ごとの区間 (切替区間は chordKey=null)。サンプル間の境界は中点で切る */
  getSegments(): TrajectorySegment[] {
    const segments: TrajectorySegment[] = [];
    for (let i = 0; i < this.samples.length; i++) {
      const s = this.samples[i];
      const key = s.transition ? null : s.chordKey;
      const prev = segments[segments.length - 1];
      if (prev && prev.chordKey === key) {
        prev.end = s.t;
        continue;
      }
      const boundary = i === 0 ? s.t : (this.samples[i - 1].t + s.t) / 2;
      if (prev) prev.end = boundary;
      segments.push({
        chordKey: key,
        chordLabel: s.transition ? null : s.chordLabel,
        start: boundary,
        end: s.t,
      });
    }
    return segments;
  }
}
