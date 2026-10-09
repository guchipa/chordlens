import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { flushSync } from "react-dom";

/** 向きを判定するまでの移動量 (px) */
const AXIS_LOCK_PX = 8;
/** ドロワー幅に対する、離した時点で閉じる移動量の割合 */
const CLOSE_DISTANCE_RATIO = 0.35;
/** 離した時点で閉じるフリング速度 (px/ms)。左向きが負 */
const FLING_VELOCITY = 0.35;
/** 速度計算に使う直近サンプルの時間窓 (ms) */
const VELOCITY_WINDOW_MS = 100;
const SETTLE_MS = 220;
const SETTLE_EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";

/** スワイプ開始を無視する要素 (スライダー・入力系は横操作を優先する) */
const IGNORE_SELECTOR =
  'input, textarea, select, [role="slider"], [data-slot="slider"], [data-swipe-ignore]';

interface Gesture {
  id: number;
  startX: number;
  startY: number;
  /** 軸ロック時点の x。ここからの差分でドロワーを動かす */
  originX: number;
  dragging: boolean;
  width: number;
  samples: { t: number; x: number }[];
}

interface UseSwipeDrawerOptions {
  isOpen: boolean;
  onClose: () => void;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/**
 * 左側ドロワーを左スワイプで閉じるジェスチャ。
 * - 指に追従して translateX を更新し、オーバーレイを比例してフェードする
 * - 一定距離またはフリング速度で閉じ、足りなければ元に戻す
 * - 縦スクロール・スライダー・入力欄の操作は妨げない
 *
 * `holdAnimation` が true の間は Radix の CSS アニメーションを無効化する
 * (インライン transform と競合して位置が飛ぶのを防ぐ)。
 */
export function useSwipeDrawer({ isOpen, onClose }: UseSwipeDrawerOptions) {
  const elRef = useRef<HTMLElement | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [hold, setHold] = useState(false);
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (prevOpen !== isOpen) {
    setPrevOpen(isOpen);
    if (!isOpen) setHold(false);
  }

  const ref = useCallback((node: HTMLElement | null) => {
    elRef.current = node;
  }, []);

  const getOverlay = () => {
    const prev = elRef.current?.previousElementSibling;
    return prev instanceof HTMLElement &&
      prev.dataset.slot === "sheet-overlay"
      ? prev
      : null;
  };

  const apply = (offset: number, width: number, transition: string) => {
    const el = elRef.current;
    if (!el) return;
    el.style.transition = transition === "none" ? "none" : `transform ${transition}`;
    el.style.transform = `translateX(${offset}px)`;
    const overlay = getOverlay();
    if (overlay) {
      overlay.style.transition =
        transition === "none" ? "none" : `opacity ${transition}`;
      overlay.style.opacity = String(
        Math.max(0, 1 - Math.abs(offset) / Math.max(width, 1)),
      );
    }
  };

  const clearStyles = () => {
    const el = elRef.current;
    if (el) {
      el.style.transition = "";
      el.style.transform = "";
    }
    const overlay = getOverlay();
    if (overlay) {
      overlay.style.transition = "";
      overlay.style.opacity = "";
    }
  };

  const settle = (close: boolean, width: number) => {
    const el = elRef.current;
    if (prefersReducedMotion() || !el) {
      if (close) onCloseRef.current();
      else clearStyles();
      return;
    }
    apply(close ? -width : 0, width, `${SETTLE_MS}ms ${SETTLE_EASING}`);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.removeEventListener("transitionend", onEnd);
      if (close) onCloseRef.current();
      else clearStyles();
    };
    const onEnd = (e: TransitionEvent) => {
      if (e.target === el && e.propertyName === "transform") finish();
    };
    el.addEventListener("transitionend", onEnd);
    window.setTimeout(finish, SETTLE_MS + 80);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse" || !e.isPrimary) return;
    if (e.target instanceof Element && e.target.closest(IGNORE_SELECTOR)) return;
    gestureRef.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: e.clientX,
      dragging: false,
      width: e.currentTarget.getBoundingClientRect().width,
      samples: [{ t: e.timeStamp, x: e.clientX }],
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const g = gestureRef.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (!g.dragging) {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      if (Math.abs(dx) > Math.abs(dy) && dx < 0) {
        g.dragging = true;
        g.originX = e.clientX;
        flushSync(() => setHold(true));
        e.currentTarget.setPointerCapture(e.pointerId);
      } else {
        // 縦(または右向き)は通常操作に任せる
        gestureRef.current = null;
        return;
      }
    }
    g.samples.push({ t: e.timeStamp, x: e.clientX });
    const cutoff = e.timeStamp - VELOCITY_WINDOW_MS;
    while (g.samples.length > 2 && g.samples[0].t < cutoff) g.samples.shift();
    apply(Math.min(0, e.clientX - g.originX), g.width, "none");
  };

  const end = (e: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
    const g = gestureRef.current;
    if (!g || g.id !== e.pointerId) return;
    gestureRef.current = null;
    if (!g.dragging) return;
    const offset = Math.min(0, e.clientX - g.originX);
    const first = g.samples[0];
    const last = g.samples[g.samples.length - 1];
    const dt = last.t - first.t;
    const velocity = dt > 0 ? (last.x - first.x) / dt : 0;
    const close =
      !cancelled &&
      (-offset > g.width * CLOSE_DISTANCE_RATIO || velocity < -FLING_VELOCITY);
    settle(close, g.width);
  };

  return {
    /** SheetContent の ref に渡す */
    ref,
    /** true の間は Radix のアニメーション (animate-in/out) を無効化する */
    holdAnimation: hold && isOpen,
    /** SheetContent に展開する */
    contentProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (e: ReactPointerEvent<HTMLElement>) => end(e, false),
      onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => end(e, true),
      // 縦スクロールはブラウザに任せ、横方向のみ JS で扱う
      style: { touchAction: "pan-y" as const },
    },
  };
}
