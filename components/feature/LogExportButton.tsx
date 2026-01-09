/**
 * LogExportButton - ログエクスポートボタンコンポーネント
 *
 * ログ記録の開始/停止、エクスポート、クリアを行うUIを提供
 */

import { Button } from "@/components/ui/button";
import { Download, Circle, Square, Trash2 } from "lucide-react";
import type { LogSession } from "@/lib/types";
import { exportLogSession } from "@/lib/utils/exportLog";

interface LogExportButtonProps {
  /** ログ記録中かどうか */
  isRecording: boolean;
  /** 記録されたエントリ数 */
  entryCount: number;
  /** 現在のセッション情報 */
  session: LogSession | null;
  /** ログ記録を開始 */
  onStartRecording: () => void;
  /** ログ記録を停止 */
  onStopRecording: () => void;
  /** ログをクリア */
  onClearLog: () => void;
}

export function LogExportButton({
  isRecording,
  entryCount,
  session,
  onStartRecording,
  onStopRecording,
  onClearLog,
}: LogExportButtonProps) {
  const handleExport = () => {
    if (!session) return;
    exportLogSession(session);
  };

  return (
    <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        📊 ログ記録コントロール
      </h3>

      {/* ステータス表示 */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md">
        <div className="flex items-center gap-2 mb-2">
          {isRecording ? (
            <>
              <Circle className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
              <span className="text-sm font-medium text-red-600">記録中</span>
            </>
          ) : (
            <>
              <Square className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">停止中</span>
            </>
          )}
        </div>
        <p className="text-sm text-gray-600">
          記録エントリ数: <span className="font-bold">{entryCount}</span>
        </p>
      </div>

      {/* コントロールボタン */}
      <div className="flex flex-wrap gap-2">
        {!isRecording ? (
          <Button
            onClick={onStartRecording}
            variant="default"
            size="sm"
            className="bg-red-600 hover:bg-red-700"
          >
            <Circle className="w-4 h-4 mr-2" />
            記録開始
          </Button>
        ) : (
          <Button
            onClick={onStopRecording}
            variant="default"
            size="sm"
            className="bg-gray-600 hover:bg-gray-700"
          >
            <Square className="w-4 h-4 mr-2" />
            記録停止
          </Button>
        )}

        <Button
          onClick={handleExport}
          variant="outline"
          size="sm"
          disabled={!session || entryCount === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          CSVエクスポート
        </Button>

        <Button
          onClick={onClearLog}
          variant="outline"
          size="sm"
          disabled={entryCount === 0}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          ログクリア
        </Button>
      </div>

      {/* 使い方のヒント */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-xs text-blue-800">
          💡 <strong>使い方:</strong>
          解析を開始してから「記録開始」を押すと、1フレームごとに解析結果が記録されます。
          記録停止後、「CSVエクスポート」でデータをダウンロードできます。
        </p>
      </div>
    </div>
  );
}
