"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnalysisControlProps {
  isProcessing: boolean;
  startProcessing: () => void;
  stopProcessing: () => void;
  isPitchListEmpty: boolean;
  /** マイク取得失敗などのエラー (指定時は開始ボタンの上にバナー表示) */
  error?: string | null;
  onDismissError?: () => void;
  /** 状態表示行の上に置く追加コンテンツ (プリセット切替など) */
  topSlot?: React.ReactNode;
}

/**
 * 画面下部に固定される解析の開始/停止バー。
 * 親指が届く位置に置き、状態表示行は常に同じ高さでレイアウトシフトを起こさない。
 */
export const AnalysisControl: React.FC<AnalysisControlProps> = ({ isProcessing, startProcessing, stopProcessing, isPitchListEmpty, error = null, onDismissError, topSlot }) => {
  const disabled = isPitchListEmpty && !isProcessing;
  const barRef = useRef<HTMLDivElement>(null);

  // 実際の高さ (エラーバナーの有無で変わる) を CSS 変数で公開し、トーストをバーの真上に置けるようにする
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const root = document.documentElement;
    const update = () => root.style.setProperty("--bottom-bar-h", `${el.offsetHeight}px`);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--bottom-bar-h");
    };
  }, []);

  return (
    <div ref={barRef} className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-3 pt-2">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-1 rounded-md border border-red-200 bg-red-50 py-1 pl-3 text-sm text-red-800"
          >
            <p className="grow py-2">{error}</p>
            <button
              type="button"
              onClick={onDismissError}
              aria-label="エラーを閉じる"
              className="flex size-11 shrink-0 items-center justify-center rounded-md text-red-700 hover:bg-red-100"
            >
              <X className="size-5" />
            </button>
          </div>
        )}
        {topSlot}
        <p
          role="status"
          className="flex h-5 items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          {isProcessing ? (
            <>
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
              </span>
              <span className="font-medium text-gray-800">マイク入力を解析中</span>
            </>
          ) : disabled ? (
            "設定から評価する音を追加してください"
          ) : (
            "待機中"
          )}
        </p>
        <Button
          onClick={isProcessing ? stopProcessing : startProcessing}
          variant={isProcessing ? "destructive" : "default"}
          className="h-14 w-full text-lg font-semibold"
          disabled={disabled}
        >
          {isProcessing ? "解析停止" : "解析開始"}
        </Button>
      </div>
    </div>
  );
};
