import { useCallback, useEffect, useRef, useState } from "react";
import type { AppLifecycle } from "@chordlens/core/adapters/appLifecycle";
import { webAppLifecycle } from "@/lib/appLifecycle";

interface UseAutoStopOnHiddenOptions {
  isProcessing: boolean;
  stopProcessing: () => void;
  /** 省略時は Web (visibilitychange / pagehide)。Capacitor 等では App プラグイン実装を注入する */
  lifecycle?: AppLifecycle;
}

/**
 * 解析中にアプリが背面へ回ったら解析 (= マイク) を自動停止する。
 * 前面へ戻っても自動では再開しない (getUserMedia / AudioContext の再開はユーザー操作を
 * 要することがあるため)。代わりに autoStopped を true にして案内を出させ、
 * 次に解析が開始された時点で解除する。メインアプリ専用 (実験フローでは使わない)。
 */
export function useAutoStopOnHidden({
  isProcessing,
  stopProcessing,
  lifecycle = webAppLifecycle,
}: UseAutoStopOnHiddenOptions) {
  const [autoStopped, setAutoStopped] = useState(false);
  const isProcessingRef = useRef(isProcessing);
  const stopRef = useRef(stopProcessing);
  // 停止要求済み (state 反映前に pagehide と visibilitychange が続けて来ても 1 回だけ止める)
  const stopRequestedRef = useRef(false);

  // 最新値を ref に保持 (購読の張り直しを避ける)
  useEffect(() => {
    isProcessingRef.current = isProcessing;
    stopRef.current = stopProcessing;
  });

  // 解析が開始されたら停止要求と案内を解除する (stopProcessing の参照変化では動かさない)
  useEffect(() => {
    if (isProcessing) {
      stopRequestedRef.current = false;
      setAutoStopped(false);
    }
  }, [isProcessing]);

  useEffect(
    () =>
      lifecycle.onBackground(() => {
        if (!isProcessingRef.current || stopRequestedRef.current) return;
        stopRequestedRef.current = true;
        stopRef.current();
        setAutoStopped(true);
      }),
    [lifecycle],
  );

  const clearAutoStopped = useCallback(() => setAutoStopped(false), []);

  return { autoStopped, clearAutoStopped };
}
