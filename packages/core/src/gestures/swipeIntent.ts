/**
 * スワイプ操作の判定 (プラットフォーム非依存の純関数)。
 * 横スワイプで「次/前」の項目へ移動する UI 向け。
 */

export interface SwipeDelta {
  /** 開始位置からの水平移動量 (px、右が正) */
  dx: number;
  /** 開始位置からの垂直移動量 (px、下が正) */
  dy: number;
  /** 開始から終了までの時間 (ms) */
  dtMs: number;
}

export interface SwipeIntentOptions {
  /** 確定に必要な水平移動量 (px) */
  distance?: number;
  /** フリングとして確定する速度 (px/ms) */
  velocity?: number;
  /** フリング判定の最小移動量 (px) */
  minFlingDistance?: number;
}

export const DEFAULT_SWIPE_DISTANCE = 60;
export const DEFAULT_SWIPE_VELOCITY = 0.4;
export const DEFAULT_MIN_FLING_DISTANCE = 24;

/**
 * 指を左へ動かした (dx < 0) ら "next"、右へ動かしたら "prev"。
 * 縦方向の移動のほうが大きい場合や、距離・速度が足りない場合は null (スワイプではない)。
 */
export function resolveSwipeIntent(
  { dx, dy, dtMs }: SwipeDelta,
  {
    distance = DEFAULT_SWIPE_DISTANCE,
    velocity = DEFAULT_SWIPE_VELOCITY,
    minFlingDistance = DEFAULT_MIN_FLING_DISTANCE,
  }: SwipeIntentOptions = {},
): "next" | "prev" | null {
  const absX = Math.abs(dx);
  if (absX <= Math.abs(dy)) return null;
  const fling = absX >= minFlingDistance && dtMs > 0 && absX / dtMs >= velocity;
  if (absX < distance && !fling) return null;
  return dx < 0 ? "next" : "prev";
}

/** items 内で現在位置から step 分動かした項目 (端で循環せず、端なら null) */
export function stepItem<T>(items: readonly T[], current: T, step: 1 | -1): T | null {
  const i = items.indexOf(current);
  if (i < 0) return null;
  return items[i + step] ?? null;
}

/**
 * items 内で現在位置から step 分動かした項目 (端で循環する)。
 * current が items に無い、または項目が 1 つ以下なら null (移動先がない)
 */
export function stepItemLoop<T>(items: readonly T[], current: T, step: 1 | -1): T | null {
  const i = items.indexOf(current);
  if (i < 0 || items.length < 2) return null;
  return items[(i + step + items.length) % items.length];
}
