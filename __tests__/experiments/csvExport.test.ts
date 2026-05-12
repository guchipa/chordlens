import { logSessionToCsvText } from "@/lib/experiments/csvExport";
import { convertLogToCSV } from "@/lib/utils/exportLog";
import type { LogSession } from "@/lib/types";

const sampleSession: LogSession = {
  sessionId: "abc-1234",
  startTime: "2026-04-25T00:00:00.000Z",
  endTime: "2026-04-25T00:00:05.000Z",
  entries: [
    {
      timestamp: "2026-04-25T00:00:00.000Z",
      elapsedMs: 0,
      sessionId: "abc-1234",
      pitchList: [
        { pitchName: "D", octaveNum: 4, isRoot: false, enabled: true },
      ],
      analysisResult: [0.1],
      centDeviations: [5],
      centDeviationsRaw: [5],
      centDeviationsDisplay: null,
      isDetectedList: null,
      isHeldList: null,
      settings: {
        a4Freq: 442,
        evalRangeCents: 50,
        evalThreshold: -100,
        fftSize: 32768,
        smoothingTimeConstant: 0.8,
      },
    },
  ],
  metadata: { userAgent: "test" },
};

describe("logSessionToCsvText", () => {
  it("convertLogToCSV と同一の本文 (＋BOM) を返す", () => {
    const text = logSessionToCsvText(sampleSession);
    expect(text.startsWith("﻿")).toBe(true);
    expect(text.slice(1)).toBe(convertLogToCSV(sampleSession));
  });
});
