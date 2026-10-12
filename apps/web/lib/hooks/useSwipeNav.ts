import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { resolveSwipeIntent } from "@chordlens/core/gestures/swipeIntent";

/** 向きを判定するまでの移動量 (px) */
const AXIS_LOCK_PX = 8;
/** 画面左端から始まる操作は無視する (iOS Safari / Android の OS の戻るジェスチャとの誤判定を避ける) */
const EDGE_IGNORE_PX = 24;

/** スワイプ開始を無視する要素 (操作系は通常のタップ・スクロールを優先) */
const IGNORE_SELECTOR = 'input, textarea, select, [role="slider"], [data-swipe-ignore]';

interface UseSwipeNavOptions {
  onNext: () => void;
  onPrev: () => void;
  enabled?: boolean;
  /**
   * 横方向と判定された操作中の水平移動量 (px、右が正)。指に追従させる
   * 呼び出し側 (カルーセル) 用。操作の終了・破棄時は null で呼ぶ
   */
  onDrag?: (dx: number | null) => void;
}

interface Gesture {
  id: number;
  startX: number;
  startY: number;
  startT: number;
  /** 縦スクロールと判定されたら破棄 */
  dead: boolean;
  /** 横方向と判定済み */
  horizontal: boolean;
}

/**
 * 横スワイプで「次/前」へ移動するジェスチャ (フィードバック形式の切替用)。
 * - 距離 60px 以上、または素早いフリングで確定 (判定は core の `resolveSwipeIntent`)
 * - 縦方向が優勢ならジェスチャを破棄し、縦スクロールは妨げない (touch-action: pan-y)
 * - 画面左端 (OS の戻るジェスチャ領域) から始まる操作は無視する
 * 切替は確定時にのみ行う (切替の演出は呼び出し側)。onDrag を渡すと操作中の
 * 移動量を受け取れるので、要素を指に追従させられる。
 */
export function useSwipeNav({ onNext, onPrev, enabled = true, onDrag }: UseSwipeNavOptions) {
  const gestureRef = useRef<Gesture | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (!enabled || e.pointerType === "mouse" || !e.isPrimary) return;
    if (e.clientX <= EDGE_IGNORE_PX) return;
    if (e.target instanceof Element && e.target.closest(IGNORE_SELECTOR)) return;
    gestureRef.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startT: e.timeStamp,
      dead: false,
      horizontal: false,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const g = gestureRef.current;
    if (!g || g.id !== e.pointerId || g.dead) return;
    if (g.horizontal) {
      onDrag?.(e.clientX - g.startX);
      return;
    }
    const dx = Math.abs(e.clientX - g.startX);
    const dy = Math.abs(e.clientY - g.startY);
    if (dx < AXIS_LOCK_PX && dy < AXIS_LOCK_PX) return;
    if (dy > dx) {
      g.dead = true;
      return;
    }
    g.horizontal = true;
    onDrag?.(e.clientX - g.startX);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLElement>) => {
    const g = gestureRef.current;
    if (!g || g.id !== e.pointerId) return;
    gestureRef.current = null;
    if (g.horizontal) onDrag?.(null);
    if (g.dead) return;
    const intent = resolveSwipeIntent({
      dx: e.clientX - g.startX,
      dy: e.clientY - g.startY,
      dtMs: e.timeStamp - g.startT,
    });
    if (intent === "next") onNext();
    else if (intent === "prev") onPrev();
  };

  const onPointerCancel = () => {
    if (gestureRef.current?.horizontal) onDrag?.(null);
    gestureRef.current = null;
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    // 縦スクロール・ピンチはブラウザに任せ、横方向のみ JS で扱う
    style: { touchAction: "pan-y" as const },
  };
}
