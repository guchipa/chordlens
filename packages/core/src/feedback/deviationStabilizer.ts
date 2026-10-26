/**
 * 表示用の偏差の安定化 (EMA + ホールドの 2 段)。
 *
 * 1. 音ごと: 検出が一瞬途切れても holdMs だけ前回値を保持する (emaHold)
 * 2. 全体: すべての音が未検出になっても remainMs だけ最後の表示を保持する
 *    (演奏の切れ目で表示が消えて見失わないようにする。メーターと同じ挙動)
 *
 * 和音 (構成音リスト) が変わったら reset() で状態を捨てる。旧和音の値を
 * 新和音の同名音に引き継ぐと、基準が変わったのに古い偏差が残って見える。
 *
 * 保持の期限切れは次の update() でしか判定されない。解析停止などで update() が
 * 来なくなると保持中の値が残り続けるため、呼び出し側は holdUntilMs の時刻に
 * update() をもう一度呼ぶ (メーターの setTimeout と同じ役割)。
 */

import { updateEmaHoldList, type EmaHoldState } from "../utils/emaHold";

export interface DeviationStabilizerOptions {
  /** EMA 係数 (0〜1)。1 で平滑化なし */
  alpha: number;
  /** EMA の時定数 (ms)。正の値なら alpha より優先する (emaHold 参照) */
  timeConstantMs?: number;
  /** 音ごとの保持時間 (ms) */
  holdMs: number;
  /** 全音が未検出になったときに最後の表示を保持する時間 (ms) */
  remainMs: number;
}

export class DeviationStabilizer {
  private readonly perKey = new Map<string, EmaHoldState>();
  private lastValues: Array<number | null> = [];
  private lastKeys: string[] = [];
  private lastDetectedMs = -Infinity;
  private holdUntil: number | null = null;

  constructor(private options: DeviationStabilizerOptions) {}

  setOptions(options: DeviationStabilizerOptions): void {
    this.options = options;
  }

  reset(): void {
    this.perKey.clear();
    this.lastValues = [];
    this.lastKeys = [];
    this.lastDetectedMs = -Infinity;
    this.holdUntil = null;
  }

  /** 直前の update() が全体の保持中の値を返した場合、その保持が切れる時刻 (ms)。それ以外は null */
  get holdUntilMs(): number | null {
    return this.holdUntil;
  }

  update(keys: string[], raw: ReadonlyArray<number | null>, nowMs: number): Array<number | null> {
    const { values } = updateEmaHoldList(this.perKey, keys, [...raw], nowMs, {
      alpha: this.options.alpha,
      timeConstantMs: this.options.timeConstantMs,
      holdMs: this.options.holdMs,
    });

    this.holdUntil = null;
    if (values.some((v) => v !== null)) {
      this.lastDetectedMs = nowMs;
      this.lastValues = values;
      this.lastKeys = keys;
      return values;
    }

    // 全音未検出: 同じ構成音のまま remainMs 以内なら最後の表示を返す
    const sameKeys =
      keys.length === this.lastKeys.length && keys.every((k, i) => k === this.lastKeys[i]);
    if (sameKeys && nowMs - this.lastDetectedMs <= this.options.remainMs) {
      this.holdUntil = this.lastDetectedMs + this.options.remainMs;
      return this.lastValues;
    }
    return values;
  }
}
