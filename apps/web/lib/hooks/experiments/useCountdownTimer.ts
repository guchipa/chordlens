/**
 * カウントダウン用フック。requestAnimationFrame ベースで残り ms を更新する。
 */
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseCountdownTimerOptions {
  durationMs: number;
  /** 0 になった瞬間に呼ばれる。 */
  onComplete?: () => void;
  /** 自動開始する場合 true。 */
  autoStart?: boolean;
}

export interface UseCountdownTimerReturn {
  remainingMs: number;
  isRunning: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useCountdownTimer(
  options: UseCountdownTimerOptions
): UseCountdownTimerReturn {
  const { durationMs, onComplete, autoStart } = options;

  const [remainingMs, setRemainingMs] = useState(durationMs);
  const [isRunning, setIsRunning] = useState(Boolean(autoStart));

  const startTsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  const durationRef = useRef(durationMs);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    durationRef.current = durationMs;
    setRemainingMs((prev) => (isRunning ? prev : durationMs));
  }, [durationMs, isRunning]);

  const cancelRaf = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const start = useCallback(() => {
    cancelRaf();
    startTsRef.current = performance.now();
    setIsRunning(true);
    setRemainingMs(durationRef.current);
  }, []);

  const stop = useCallback(() => {
    cancelRaf();
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    cancelRaf();
    startTsRef.current = null;
    setIsRunning(false);
    setRemainingMs(durationRef.current);
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const tick = () => {
      const startTs = startTsRef.current;
      if (startTs === null) return;
      const elapsed = performance.now() - startTs;
      const remain = Math.max(0, durationRef.current - elapsed);
      setRemainingMs(remain);
      if (remain <= 0) {
        cancelRaf();
        setIsRunning(false);
        onCompleteRef.current?.();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return cancelRaf;
  }, [isRunning]);

  useEffect(() => {
    if (autoStart) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { remainingMs, isRunning, start, stop, reset };
}
