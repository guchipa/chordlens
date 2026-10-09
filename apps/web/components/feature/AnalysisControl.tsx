"use client";

import { Button } from "@/components/ui/button";

interface AnalysisControlProps {
  isProcessing: boolean;
  startProcessing: () => void;
  stopProcessing: () => void;
  isPitchListEmpty: boolean;
}

/**
 * 画面下部に固定される解析の開始/停止バー。
 * 親指が届く位置に置き、状態表示行は常に同じ高さでレイアウトシフトを起こさない。
 */
export const AnalysisControl: React.FC<AnalysisControlProps> = ({ isProcessing, startProcessing, stopProcessing, isPitchListEmpty }) => {
  const disabled = isPitchListEmpty && !isProcessing;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-3 pt-2">
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
