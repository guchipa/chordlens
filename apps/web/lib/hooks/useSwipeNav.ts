import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { resolveSwipeIntent } from "@chordlens/core/gestures/swipeIntent";

/** 向きを判定するまでの移動量 (px) */
const AXIS_LOCK_PX = 8;
/** SettingsDrawer の左端スワイプゾーン幅 (22px) より少し広く取り、ここから始まる操作は無視する */
const EDGE_IGNORE_PX = 24;

/** スワイプ開始を無視する要素 (操作系は通常のタップ・スクロールを優先) */
const IGNORE_SELECTOR = 'input, textarea, select, [role="slider"], [data-swipe-ignore]';

interface UseSwipeNavOptions {
  onNext: () => void;
  onPrev: () => void;
  enabled?: boolean;
}

interface Gesture {
  id: number;
  startX: number;
  startY: number;
  startT: number;
  /** 縦スクロールと判定されたら破棄 */
  dead: boolean;
}

/**
 * 横スワイプで「次/前」へ移動するジェスチャ (フィードバック形式の切替用)。
 * - 距離 60px 以上、または素早いフリングで確定 (判定は core の `resolveSwipeIntent`)
 * - 縦方向が優勢ならジェスチャを破棄し、縦スクロールは妨げない (touch-action: pan-y)
 * - 画面左端 (設定ドロワーのスワイプゾーン) から始まる操作は無視する
 * 要素の追従はせず、確定時にのみ切り替える (切替の演出は呼び出し側)。
 */
export function useSwipeNav({ onNext, onPrev, enabled = true }: UseSwipeNavOptions) {
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
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const g = gestureRef.current;
    if (!g || g.id !== e.pointerId || g.dead) return;
    const dx = Math.abs(e.clientX - g.startX);
    const dy = Math.abs(e.clientY - g.startY);
    if (dx < AXIS_LOCK_PX && dy < AXIS_LOCK_PX) return;
    if (dy > dx) g.dead = true;
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLElement>) => {
    const g = gestureRef.current;
    if (!g || g.id !== e.pointerId) return;
    gestureRef.current = null;
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
