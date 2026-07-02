/**
 * exportLog - ログセッションの CSV エクスポート (Web バインディング)
 *
 * CSV 変換ロジックは @chordlens/core/logging/logCsv にあり、
 * ここでは Blob + <a download> によるブラウザのダウンロード処理のみを担う。
 */

import { convertLogToCSV } from "@chordlens/core/logging/logCsv";
import type { LogSession } from "@chordlens/core/types";

// 互換性のため再エクスポート
export { convertLogToCSV };

/**
 * CSVファイルをダウンロード
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // UTF-8 BOMを追加（Excel対応）
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  // ダウンロード用の一時URLを作成
  const url = URL.createObjectURL(blob);

  // ダウンロードをトリガー
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();

  // クリーンアップ
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * ログセッションをCSVファイルとしてエクスポート
 */
export function exportLogSession(session: LogSession): void {
  // CSVに変換
  const csvContent = convertLogToCSV(session);

  // ファイル名を生成
  // 形式: chordlens_log_{sessionId}_{timestamp}.csv
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const shortSessionId = session.sessionId.split("-")[0]; // UUIDの最初の部分のみ使用
  const filename = `chordlens_log_${shortSessionId}_${timestamp}.csv`;

  // ダウンロード実行
  downloadCSV(csvContent, filename);
}
