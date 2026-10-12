"use client";

import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  TOAST_DURATION_MS,
  dismissToastAtom,
  toastAtom,
} from "@/lib/store";

/**
 * 「元に戻す」付きの通知を 1 件だけ表示する。
 * - 下部固定バー (--bottom-bar-h を AnalysisControl が更新) の真上に置く
 * - 設定ドロワー (z-50) とオーバーレイより前面。Radix のモーダルが body に付ける
 *   pointer-events: none を pointer-events-auto で打ち消し、ドロワー表示中も押せる
 * - ライブリージョンは常に DOM に置き、中身の入れ替えで読み上げさせる
 */
export function Toaster() {
  const toast = useAtomValue(toastAtom);
  const dismiss = useSetAtom(dismissToastAtom);
  const toastId = toast?.id;

  // 新しい通知 (id が変わる) ごとにタイマーを張り直す
  useEffect(() => {
    if (toastId === undefined) return;
    const timer = setTimeout(dismiss, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toastId, dismiss]);

  return (
    <div
      data-slot="toaster"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      // Radix のモーダル (設定ドロワー) は外側へのタップ/フォーカスで閉じるため、
      // トースト操作の pointerdown/focus は document まで伝えず、ドロワーを開いたまま「元に戻す」を押せるようにする
      onPointerDown={(e) => e.stopPropagation()}
      onFocus={(e) => e.stopPropagation()}
      className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-3 bottom-[calc(var(--bottom-bar-h,10rem)+0.5rem)] [html[data-drawer-open]_&]:bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+0.5rem)]"
    >
      {toast && (
        <div
          key={toast.id}
          className="pointer-events-auto flex w-full max-w-md items-center gap-1 rounded-lg bg-gray-800 py-1 pl-4 pr-1 text-sm text-white shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none"
        >
          <p className="grow py-2">{toast.message}</p>
          {toast.onAction && (
            <button
              type="button"
              onClick={() => {
                // 先に閉じる (onAction 内で出したエラー通知などを消さないため)
                dismiss();
                toast.onAction?.();
              }}
              className="min-h-11 min-w-11 shrink-0 rounded-md px-3 font-semibold text-sky-300 hover:bg-white/10 active:bg-white/20"
            >
              {toast.actionLabel ?? "元に戻す"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
