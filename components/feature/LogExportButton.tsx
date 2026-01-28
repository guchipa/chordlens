/**
 * LogExportButton - ログエクスポートボタンコンポーネント
 *
 * ログ記録の開始/停止、エクスポート、クリアを行うUIを提供
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Circle, Square, Trash2, Lightbulb } from "lucide-react";
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
    <Card className="w-full max-w-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          📊 ログ記録コントロール
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ステータス表示 */}
        <div className="p-3 bg-muted rounded-md">
          <div className="flex items-center gap-2 mb-2">
            {isRecording ? (
              <>
                <Circle className="w-4 h-4 text-destructive fill-destructive animate-pulse" />
                <span className="text-sm font-medium text-destructive">記録中</span>
              </>
            ) : (
              <>
                <Square className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">停止中</span>
              </>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            記録エントリ数: <span className="font-bold text-foreground">{entryCount}</span>
          </p>
        </div>

        {/* コントロールボタン */}
        <div className="flex flex-wrap gap-2">
          {!isRecording ? (
            <Button
              onClick={onStartRecording}
              variant="destructive"
              size="sm"
            >
              <Circle className="w-4 h-4 mr-2" />
              記録開始
            </Button>
          ) : (
            <Button
              onClick={onStopRecording}
              variant="secondary"
              size="sm"
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
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>使い方:</strong>
            解析を開始してから「記録開始」を押すと、1フレームごとに解析結果が記録されます。
            記録停止後、「CSVエクスポート」でデータをダウンロードできます。
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
