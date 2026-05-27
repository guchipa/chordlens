/**
 * LogSession を Blob として吐き出すラッパー。
 * 既存の convertLogToCSV をそのまま流用し、アップロード用 Blob を作る。
 */
import { convertLogToCSV } from "@/lib/utils/exportLog";
import type { LogSession } from "@/lib/types";

const BOM = "﻿";

export function logSessionToCsvBlob(session: LogSession): Blob {
  const csvContent = convertLogToCSV(session);
  return new Blob([BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
}

export function logSessionToCsvText(session: LogSession): string {
  return BOM + convertLogToCSV(session);
}
