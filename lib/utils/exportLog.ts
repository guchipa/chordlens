/**
 * exportLog - ログセッションをCSV形式でエクスポート
 *
 * ISO 8601形式のタイムスタンプと経過時間を含むCSVファイルを生成し、
 * ダウンロードを開始する
 */

import type { LogSession } from "@/lib/types";

/**
 * CSV用に文字列をエスケープ
 * カンマや改行、ダブルクォートが含まれる場合に適切にエスケープ
 */
function escapeCsvValue(value: string | number | boolean | null): string {
  if (value === null || value === undefined) {
    return "";
  }

  // 数値とbooleanはそのまま出力（Excelで数値として認識させる）
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  const str = String(value);

  // カンマ、改行、ダブルクォートを含む場合はダブルクォートで囲む
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * ログセッションをCSV形式に変換
 */
export function convertLogToCSV(session: LogSession): string {
  // CSVヘッダー
  const headers = [
    "timestamp",
    "elapsedMs",
    "sessionId",
    "pitchName",
    "pitchIsRoot",
    "deviation",
    "centDeviation",
    "a4Freq",
    "evalRangeCents",
    "evalThreshold",
    "fftSize",
    "smoothingTimeConstant",
  ];

  // ヘッダー行を作成
  const csvRows: string[] = [headers.join(",")];

  // 各エントリをCSV行に変換
  for (const entry of session.entries) {
    // 構成音ごとに1行ずつ作成
    for (let i = 0; i < entry.pitchList.length; i++) {
      const pitch = entry.pitchList[i];
      const deviation = entry.analysisResult[i];
      const centDeviation = entry.centDeviations[i];

      const row = [
        escapeCsvValue(entry.timestamp),
        escapeCsvValue(entry.elapsedMs),
        escapeCsvValue(entry.sessionId),
        escapeCsvValue(`${pitch.pitchName}${pitch.octaveNum}`),
        escapeCsvValue(pitch.isRoot ?? false),
        escapeCsvValue(deviation),
        // centDeviationが数値であることを保証
        centDeviation !== null && centDeviation !== undefined
          ? escapeCsvValue(Number(centDeviation))
          : "",
        escapeCsvValue(entry.settings.a4Freq),
        escapeCsvValue(entry.settings.evalRangeCents),
        escapeCsvValue(entry.settings.evalThreshold),
        escapeCsvValue(entry.settings.fftSize),
        escapeCsvValue(entry.settings.smoothingTimeConstant),
      ];

      csvRows.push(row.join(","));
    }
  }

  return csvRows.join("\n");
}

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
