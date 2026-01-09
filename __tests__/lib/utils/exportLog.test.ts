import { convertLogToCSV, exportLogSession } from "@/lib/utils/exportLog";
import type { LogSession, LogEntry } from "@/lib/types";

describe("exportLog", () => {
  describe("convertLogToCSV", () => {
    it("基本的なログセッションをCSV形式に変換する", () => {
      const session: LogSession = {
        sessionId: "test-session-123",
        startTime: "2025-11-14T10:00:00.000Z",
        endTime: "2025-11-14T10:00:01.000Z",
        metadata: {
          userAgent: "test-agent",
        },
        entries: [
          {
            timestamp: "2025-11-14T10:00:00.000Z",
            elapsedMs: 0,
            sessionId: "test-session-123",
            pitchList: [
              { pitchName: "C", octaveNum: 4, isRoot: true },
              { pitchName: "E", octaveNum: 4, isRoot: false },
            ],
            analysisResult: [0.1, -0.05],
            centDeviations: [5.0, -2.5],
            settings: {
              a4Freq: 440,
              evalRangeCents: 50,
              evalThreshold: 0.3,
              fftSize: 4096,
              smoothingTimeConstant: 0.8,
            },
          },
        ],
      };

      const csv = convertLogToCSV(session);
      const lines = csv.split("\n");

      // ヘッダー + 2行のデータ（構成音2つ）
      expect(lines).toHaveLength(3);

      // ヘッダー確認
      expect(lines[0]).toBe(
        "timestamp,elapsedMs,sessionId,pitchName,pitchIsRoot,deviation,centDeviation,centDeviationRaw,centDeviationDisplay,isDetected,isHeld,a4Freq,evalRangeCents,evalThreshold,fftSize,smoothingTimeConstant"
      );

      // 1行目のデータ（C4）
      expect(lines[1]).toContain("2025-11-14T10:00:00.000Z");
      expect(lines[1]).toContain("0");
      expect(lines[1]).toContain("test-session-123");
      expect(lines[1]).toContain("C4");
      expect(lines[1]).toContain("true");
      expect(lines[1]).toContain("0.1");
      expect(lines[1]).toContain("5");
      expect(lines[1]).toContain("440");

      // 2行目のデータ（E4）
      expect(lines[2]).toContain("E4");
      expect(lines[2]).toContain("false");
      expect(lines[2]).toContain("-0.05");
      expect(lines[2]).toContain("-2.5");
    });

    it("複数エントリを正しく展開する", () => {
      const session: LogSession = {
        sessionId: "session-456",
        startTime: "2025-11-14T10:00:00.000Z",
        endTime: "2025-11-14T10:00:00.200Z",
        metadata: { userAgent: "test-agent" },
        entries: [
          {
            timestamp: "2025-11-14T10:00:00.000Z",
            elapsedMs: 0,
            sessionId: "session-456",
            pitchList: [{ pitchName: "A", octaveNum: 4, isRoot: true }],
            analysisResult: [0.0],
            centDeviations: [0.0],
            settings: {
              a4Freq: 440,
              evalRangeCents: 50,
              evalThreshold: 0.3,
              fftSize: 4096,
              smoothingTimeConstant: 0.8,
            },
          },
          {
            timestamp: "2025-11-14T10:00:00.100Z",
            elapsedMs: 100,
            sessionId: "session-456",
            pitchList: [{ pitchName: "A", octaveNum: 4, isRoot: true }],
            analysisResult: [0.02],
            centDeviations: [1.0],
            settings: {
              a4Freq: 440,
              evalRangeCents: 50,
              evalThreshold: 0.3,
              fftSize: 4096,
              smoothingTimeConstant: 0.8,
            },
          },
        ],
      };

      const csv = convertLogToCSV(session);
      const lines = csv.split("\n");

      // ヘッダー + 2エントリ（各1音）= 3行
      expect(lines).toHaveLength(3);

      // 最初のエントリ
      expect(lines[1]).toContain("0");
      expect(lines[1]).toContain("0");

      // 2番目のエントリ
      expect(lines[2]).toContain("100");
      expect(lines[2]).toContain("0.02");
      expect(lines[2]).toContain("1");
    });

    it("カンマを含む値を正しくエスケープする", () => {
      const session: LogSession = {
        sessionId: "test,session",
        startTime: "2025-11-14T10:00:00.000Z",
        endTime: null,
        metadata: { userAgent: "test-agent" },
        entries: [
          {
            timestamp: "2025-11-14T10:00:00.000Z",
            elapsedMs: 0,
            sessionId: "test,session",
            pitchList: [{ pitchName: "C", octaveNum: 4, isRoot: true }],
            analysisResult: [0.0],
            centDeviations: [0.0],
            settings: {
              a4Freq: 440,
              evalRangeCents: 50,
              evalThreshold: 0.3,
              fftSize: 4096,
              smoothingTimeConstant: 0.8,
            },
          },
        ],
      };

      const csv = convertLogToCSV(session);

      // カンマを含むsessionIdはダブルクォートで囲まれる
      expect(csv).toContain('"test,session"');
    });

    it("null値を正しく処理する", () => {
      const session: LogSession = {
        sessionId: "session-null",
        startTime: "2025-11-14T10:00:00.000Z",
        endTime: null,
        metadata: { userAgent: "test-agent" },
        entries: [
          {
            timestamp: "2025-11-14T10:00:00.000Z",
            elapsedMs: 0,
            sessionId: "session-null",
            pitchList: [{ pitchName: "C", octaveNum: 4, isRoot: true }],
            analysisResult: [null],
            centDeviations: [null],
            settings: {
              a4Freq: 440,
              evalRangeCents: 50,
              evalThreshold: 0.3,
              fftSize: 4096,
              smoothingTimeConstant: 0.8,
            },
          },
        ],
      };

      const csv = convertLogToCSV(session);

      // null値は空文字列として出力される
      expect(csv).toContain(",,");
    });

    it("空のエントリ配列でもヘッダーを出力する", () => {
      const session: LogSession = {
        sessionId: "empty-session",
        startTime: "2025-11-14T10:00:00.000Z",
        endTime: null,
        metadata: { userAgent: "test-agent" },
        entries: [],
      };

      const csv = convertLogToCSV(session);
      const lines = csv.split("\n");

      // ヘッダーのみ
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain("timestamp");
      expect(lines[0]).toContain("centDeviationRaw");
    });

    it("追加列が未指定の場合は空欄で出力する", () => {
      const session: LogSession = {
        sessionId: "session-optional",
        startTime: "2025-11-14T10:00:00.000Z",
        endTime: null,
        metadata: { userAgent: "test-agent" },
        entries: [
          {
            timestamp: "2025-11-14T10:00:00.000Z",
            elapsedMs: 0,
            sessionId: "session-optional",
            pitchList: [{ pitchName: "A", octaveNum: 4, isRoot: true }],
            analysisResult: [0.0],
            centDeviations: [0.0],
            settings: {
              a4Freq: 440,
              evalRangeCents: 50,
              evalThreshold: 0.3,
              fftSize: 4096,
              smoothingTimeConstant: 0.8,
            },
          },
        ],
      };

      const csv = convertLogToCSV(session);
      const lines = csv.split("\n");

      // ヘッダー + 1行
      expect(lines).toHaveLength(2);

      // 追加列は空欄（",,,," のような連続カンマが含まれる）
      expect(lines[1]).toContain(",0,0,,,,");
    });

    it("追加列が指定されている場合は出力する", () => {
      const entry: LogEntry = {
        timestamp: "2025-11-14T10:00:00.000Z",
        elapsedMs: 0,
        sessionId: "session-with-extra",
        pitchList: [{ pitchName: "A", octaveNum: 4, isRoot: true }],
        analysisResult: [0.0],
        centDeviations: [0.0],
        centDeviationsRaw: [0.0],
        centDeviationsDisplay: [0.5],
        isDetectedList: [true],
        isHeldList: [false],
        settings: {
          a4Freq: 440,
          evalRangeCents: 50,
          evalThreshold: 0.3,
          fftSize: 4096,
          smoothingTimeConstant: 0.8,
        },
      };

      const session: LogSession = {
        sessionId: "session-with-extra",
        startTime: "2025-11-14T10:00:00.000Z",
        endTime: null,
        metadata: { userAgent: "test-agent" },
        entries: [entry],
      };

      const csv = convertLogToCSV(session);
      const lines = csv.split("\n");
      expect(lines).toHaveLength(2);

      // centDeviationRaw, centDeviationDisplay, isDetected, isHeld
      expect(lines[1]).toContain(",0,0,0,0.5,true,false,");
    });

    it("複数構成音を持つエントリを正しく展開する", () => {
      const session: LogSession = {
        sessionId: "chord-session",
        startTime: "2025-11-14T10:00:00.000Z",
        endTime: null,
        metadata: { userAgent: "test-agent" },
        entries: [
          {
            timestamp: "2025-11-14T10:00:00.000Z",
            elapsedMs: 0,
            sessionId: "chord-session",
            pitchList: [
              { pitchName: "C", octaveNum: 4, isRoot: true },
              { pitchName: "E", octaveNum: 4, isRoot: false },
              { pitchName: "G", octaveNum: 4, isRoot: false },
            ],
            analysisResult: [0.0, 0.1, -0.05],
            centDeviations: [0.0, 5.0, -2.5],
            settings: {
              a4Freq: 440,
              evalRangeCents: 50,
              evalThreshold: 0.3,
              fftSize: 4096,
              smoothingTimeConstant: 0.8,
            },
          },
        ],
      };

      const csv = convertLogToCSV(session);
      const lines = csv.split("\n");

      // ヘッダー + 3構成音 = 4行
      expect(lines).toHaveLength(4);

      // タイムスタンプとsessionIdは全行で同じ
      expect(lines[1]).toContain("2025-11-14T10:00:00.000Z");
      expect(lines[2]).toContain("2025-11-14T10:00:00.000Z");
      expect(lines[3]).toContain("2025-11-14T10:00:00.000Z");

      // 各構成音の情報が異なる
      expect(lines[1]).toContain("C4");
      expect(lines[2]).toContain("E4");
      expect(lines[3]).toContain("G4");
    });
  });

  describe("exportLogSession", () => {
    // DOM操作のモック
    let createElementSpy: jest.SpyInstance;
    let mockLink: any;

    beforeEach(() => {
      // document.createElement のモック
      mockLink = {
        href: "",
        download: "",
        style: { display: "" },
        click: jest.fn(),
      };

      createElementSpy = jest
        .spyOn(document, "createElement")
        .mockReturnValue(mockLink as any);

      // appendChild/removeChild のモック
      jest.spyOn(document.body, "appendChild").mockImplementation(() => mockLink as any);
      jest.spyOn(document.body, "removeChild").mockImplementation(() => mockLink as any);

      // URL API のモック
      (global as any).URL.createObjectURL = jest.fn(() => "blob:mock-url");
      (global as any).URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("CSVファイルのダウンロードを正しくトリガーする", () => {
      const session: LogSession = {
        sessionId: "abc123-def456-ghi789",
        startTime: "2025-11-14T10:00:00.000Z",
        endTime: null,
        metadata: { userAgent: "test-agent" },
        entries: [
          {
            timestamp: "2025-11-14T10:00:00.000Z",
            elapsedMs: 0,
            sessionId: "abc123-def456-ghi789",
            pitchList: [{ pitchName: "C", octaveNum: 4, isRoot: true }],
            analysisResult: [0.0],
            centDeviations: [0.0],
            settings: {
              a4Freq: 440,
              evalRangeCents: 50,
              evalThreshold: 0.3,
              fftSize: 4096,
              smoothingTimeConstant: 0.8,
            },
          },
        ],
      };

      exportLogSession(session);

      // createElement が呼ばれたか
      expect(createElementSpy).toHaveBeenCalledWith("a");

      // Blob URLが作成されたか
      expect((global as any).URL.createObjectURL).toHaveBeenCalled();

      // link要素のclickが呼ばれたか
      expect(mockLink.click).toHaveBeenCalled();

      // ファイル名にセッションIDが含まれているか
      expect(mockLink.download).toContain("chordlens_log_abc123");

      // クリーンアップが呼ばれたか
      expect((global as any).URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });
  });
});
