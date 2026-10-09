import {
  useCallback,
  useEffect,
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

/** 左端スワイプ開きの検知領域 (px) */
const EDGE_ZONE_PX = 22;

/** スワイプ開始を無視する要素 (スライダー・入力系は横操作を優先する) */
const IGNORE_SELECTOR =
  'input, textarea, select, [role="slider"], [data-slot="slider"], [data-swipe-ignore]';

interface Gesture {
  id: number;
  startX: number;
  startY: number;
  /** 軸ロック時点の x。ここからの差分でドロワーを動かす */
  originX: number;
  /** close: ドロワー上の左スワイプ / open: 画面左端からの右スワイプ */
  kind: "close" | "open";
  dragging: boolean;
  width: number;
  samples: { t: number; x: number }[];
}

interface UseSwipeDrawerOptions {
  isOpen: boolean;
  onClose: () => void;
  /** 画面左端スワイプで開く場合に指定 (省略時は開く操作を扱わない) */
  onOpen?: () => void;
  /** 左端スワイプ開きを有効にするか (非対応環境では false) */
  edgeOpenEnabled?: boolean;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/**
 * 左側ドロワーのスワイプジェスチャ。
 * - ドロワー上の左スワイプで閉じる / 画面左端からの右スワイプで開く
 * - 指に追従して translateX を更新し、オーバーレイを比例してフェードする
 * - 一定距離またはフリング速度で確定し、足りなければ元に戻す
 * - 縦スクロール・スライダー・入力欄の操作は妨げない
 *
 * `holdAnimation` が true の間は Radix の CSS アニメーションを無効化する
 * (インライン transform と競合して位置が飛ぶのを防ぐ)。
 */
export function useSwipeDrawer({
  isOpen,
  onClose,
  onOpen,
  edgeOpenEnabled = false,
}: UseSwipeDrawerOptions) {
  const elRef = useRef<HTMLElement | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  /** 左端スワイプ中の現在のドロワー右端位置 (px)。マウント直後の初期反映に使う */
  const edgeXRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  const onOpenRef = useRef(onOpen);
  const isOpenRef = useRef(isOpen);
  useEffect(() => {
    onCloseRef.current = onClose;
    onOpenRef.current = onOpen;
    isOpenRef.current = isOpen;
  });

  const [hold, setHold] = useState(false);
  /** ジェスチャで閉じた直後。Radix の閉じるアニメーション (位置が 0 から再生される) を抑止する */
  const [closedBySwipe, setClosedBySwipe] = useState(false);
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (prevOpen !== isOpen) {
    setPrevOpen(isOpen);
    if (isOpen) setClosedBySwipe(false);
    else setHold(false);
  }

  /** ジェスチャ確定による閉じ (オフスクリーン位置のまま即アンマウントさせる) */
  const closeBySwipe = () => {
    setClosedBySwipe(true);
    onCloseRef.current();
  };

  const getOverlay = (el: HTMLElement | null) => {
    const prev = el?.previousElementSibling;
    return prev instanceof HTMLElement &&
      prev.dataset.slot === "sheet-overlay"
      ? prev
      : null;
  };

  const apply = (offset: number, width: number, transition: string) => {
    const el = elRef.current;
    if (!el) return;
    el.style.transition =
      transition === "none" ? "none" : `transform ${transition}`;
    el.style.transform = `translateX(${offset}px)`;
    const overlay = getOverlay(el);
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
    const overlay = getOverlay(el);
    if (overlay) {
      overlay.style.transition = "";
      overlay.style.opacity = "";
    }
  };

  const ref = useCallback((node: HTMLElement | null) => {
    elRef.current = node;
    // 左端スワイプで開いた直後: 指の位置に合わせて初期位置を反映する
    if (node && edgeXRef.current !== null) {
      const width = node.getBoundingClientRect().width;
      apply(-width + Math.min(edgeXRef.current, width), width, "none");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** offset (px) へアニメーションして移動し、完了後に then を呼ぶ */
  const settle = (offset: number, width: number, then: () => void) => {
    const el = elRef.current;
    if (prefersReducedMotion() || !el) {
      then();
      return;
    }
    apply(offset, width, `${SETTLE_MS}ms ${SETTLE_EASING}`);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.removeEventListener("transitionend", onEnd);
      then();
    };
    const onEnd = (e: TransitionEvent) => {
      if (e.target === el && e.propertyName === "transform") finish();
    };
    el.addEventListener("transitionend", onEnd);
    window.setTimeout(finish, SETTLE_MS + 80);
  };

  const trackSample = (g: Gesture, t: number, x: number) => {
    g.samples.push({ t, x });
    while (g.samples.length > 2 && g.samples[0].t < t - VELOCITY_WINDOW_MS) {
      g.samples.shift();
    }
  };

  const velocityOf = (g: Gesture) => {
    const first = g.samples[0];
    const last = g.samples[g.samples.length - 1];
    const dt = last.t - first.t;
    return dt > 0 ? (last.x - first.x) / dt : 0;
  };

  /** 軸ロック判定。ドラッグ開始なら true、通常操作に任せるなら gesture を破棄 */
  const tryLock = (g: Gesture, x: number, y: number): boolean | null => {
    const dx = x - g.startX;
    const dy = y - g.startY;
    if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return null;
    const horizontal = Math.abs(dx) > Math.abs(dy);
    const rightDir = g.kind === "open" ? dx > 0 : dx < 0;
    if (horizontal && rightDir) return true;
    gestureRef.current = null;
    return false;
  };

  // ---- 閉じる: ドロワー上の左スワイプ (React イベント) ----

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse" || !e.isPrimary) return;
    if (e.target instanceof Element && e.target.closest(IGNORE_SELECTOR)) return;
    gestureRef.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: e.clientX,
      kind: "close",
      dragging: false,
      width: e.currentTarget.getBoundingClientRect().width,
      samples: [{ t: e.timeStamp, x: e.clientX }],
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const g = gestureRef.current;
    if (!g || g.kind !== "close" || g.id !== e.pointerId) return;
    if (!g.dragging) {
      const locked = tryLock(g, e.clientX, e.clientY);
      if (!locked) return;
      g.dragging = true;
      g.originX = e.clientX;
      flushSync(() => setHold(true));
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    trackSample(g, e.timeStamp, e.clientX);
    apply(Math.min(0, e.clientX - g.originX), g.width, "none");
  };

  const endClose = (e: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
    const g = gestureRef.current;
    if (!g || g.kind !== "close" || g.id !== e.pointerId) return;
    gestureRef.current = null;
    if (!g.dragging) return;
    const offset = Math.min(0, e.clientX - g.originX);
    const close =
      !cancelled &&
      (-offset > g.width * CLOSE_DISTANCE_RATIO ||
        velocityOf(g) < -FLING_VELOCITY);
    settle(close ? -g.width : 0, g.width, () => {
      if (close) closeBySwipe();
      else clearStyles();
    });
  };

  // ---- 開く: 画面左端からの右スワイプ (window イベント) ----

  // ジェスチャ中に isOpen が変わる (ドラッグで開く) ため、リスナーは isOpen に依存させず
  // 開始時に isOpenRef で判定する
  useEffect(() => {
    if (!edgeOpenEnabled) return;
    // 横スワイプをブラウザ側のパン/オーバースクロールに奪われ pointercancel になるのを防ぐ
    // (縦スクロールはそのまま可能。ピンチズームは無効になる)
    const root = document.documentElement;
    const prevTouchAction = root.style.touchAction;
    root.style.touchAction = "pan-y";

    const down = (e: PointerEvent) => {
      // マウスは対象外 (タッチ/ペンのみ)
      if (e.pointerType === "mouse" || !e.isPrimary) return;
      if (isOpenRef.current || e.clientX > EDGE_ZONE_PX) return;
      gestureRef.current = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: e.clientX,
        kind: "open",
        dragging: false,
        width: 0,
        samples: [{ t: e.timeStamp, x: e.clientX }],
      };
    };

    const move = (e: PointerEvent) => {
      const g = gestureRef.current;
      if (!g || g.kind !== "open" || g.id !== e.pointerId) return;
      if (!g.dragging) {
        const locked = tryLock(g, e.clientX, e.clientY);
        if (!locked) return;
        g.dragging = true;
        edgeXRef.current = e.clientX;
        // ドロワーを即マウントし (ref コールバックで初期位置を反映)、Radix の開くアニメーションは止める
        flushSync(() => {
          setHold(true);
          onOpenRef.current?.();
        });
        g.width = elRef.current?.getBoundingClientRect().width ?? 0;
        document.documentElement.setPointerCapture?.(e.pointerId);
      }
      edgeXRef.current = e.clientX;
      trackSample(g, e.timeStamp, e.clientX);
      apply(-g.width + Math.min(Math.max(0, e.clientX), g.width), g.width, "none");
    };

    const up = (e: PointerEvent, cancelled: boolean) => {
      const g = gestureRef.current;
      if (!g || g.kind !== "open" || g.id !== e.pointerId) return;
      gestureRef.current = null;
      if (!g.dragging) return;
      const shown = Math.min(Math.max(0, e.clientX), g.width);
      const open =
        !cancelled &&
        (shown > g.width * CLOSE_DISTANCE_RATIO ||
          velocityOf(g) > FLING_VELOCITY);
      settle(open ? 0 : -g.width, g.width, () => {
        edgeXRef.current = null;
        if (open) clearStyles();
        else closeBySwipe();
      });
    };
    const upHandler = (e: PointerEvent) => up(e, false);
    const cancelHandler = (e: PointerEvent) => up(e, true);

    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", upHandler);
    window.addEventListener("pointercancel", cancelHandler);
    return () => {
      root.style.touchAction = prevTouchAction;
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", upHandler);
      window.removeEventListener("pointercancel", cancelHandler);
    };
    // apply / settle などは ref のみ参照するため依存に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edgeOpenEnabled]);

  return {
    /** SheetContent の ref に渡す */
    ref,
    /** true の間は Radix のアニメーション (animate-in/out) を無効化する */
    holdAnimation: isOpen ? hold : closedBySwipe,
    /** SheetContent に展開する */
    contentProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (e: ReactPointerEvent<HTMLElement>) => endClose(e, false),
      onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => endClose(e, true),
      // 縦スクロールはブラウザに任せ、横方向のみ JS で扱う
      style: { touchAction: "pan-y" as const },
    },
  };
}
