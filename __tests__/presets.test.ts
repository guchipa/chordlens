import {
  savePreset,
  getPresets,
  deletePreset,
  isDuplicatePresetName,
  getRelativeTimeString,
  isLocalStorageAvailable,
} from "@/lib/presets";
import { formType } from "@/lib/schema";

// localStorageのモック
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("presets utility functions", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe("isLocalStorageAvailable", () => {
    it("should return true when localStorage is available", () => {
      expect(isLocalStorageAvailable()).toBe(true);
    });
  });

  describe("savePreset", () => {
    const testPitchList: formType[] = [
      { pitchName: "C", octaveNum: 4, isRoot: true },
      { pitchName: "E", octaveNum: 4, isRoot: false },
      { pitchName: "G", octaveNum: 4, isRoot: false },
    ];

    it("should save a new preset successfully", () => {
      const result = savePreset("Test Preset", testPitchList);
      expect(result.success).toBe(true);

      const presets = getPresets();
      expect(presets).toHaveLength(1);
      expect(presets[0].name).toBe("Test Preset");
      expect(presets[0].pitchList).toEqual(testPitchList);
    });

    it("should return error when preset name is empty", () => {
      const result = savePreset("", testPitchList);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("プリセット名を入力してください");
      }
    });

    it("should return error when preset name is too long", () => {
      const longName = "a".repeat(31);
      const result = savePreset(longName, testPitchList);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("30文字以内");
      }
    });

    it("should return error when pitch list is empty", () => {
      const result = savePreset("Empty Preset", []);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("構成音が登録されていません");
      }
    });

    it("should overwrite existing preset with same name", () => {
      savePreset("Test", testPitchList);
      const newPitchList: formType[] = [
        { pitchName: "D", octaveNum: 4, isRoot: true },
      ];
      savePreset("Test", newPitchList);

      const presets = getPresets();
      expect(presets).toHaveLength(1);
      expect(presets[0].pitchList).toEqual(newPitchList);
    });
  });

  describe("getPresets", () => {
    it("should return empty array when no presets exist", () => {
      const presets = getPresets();
      expect(presets).toEqual([]);
    });

    it("should return presets sorted by creation date (newest first)", () => {
      const pitchList: formType[] = [
        { pitchName: "C", octaveNum: 4, isRoot: true },
      ];

      savePreset("First", pitchList);
      // 少し待つ
      jest.advanceTimersByTime(10);
      savePreset("Second", pitchList);
      jest.advanceTimersByTime(10);
      savePreset("Third", pitchList);

      const presets = getPresets();
      expect(presets[0].name).toBe("Third");
      expect(presets[1].name).toBe("Second");
      expect(presets[2].name).toBe("First");
    });
  });

  describe("deletePreset", () => {
    it("should delete preset successfully", () => {
      const pitchList: formType[] = [
        { pitchName: "C", octaveNum: 4, isRoot: true },
      ];
      savePreset("To Delete", pitchList);

      const presets = getPresets();
      const id = presets[0].id;

      const result = deletePreset(id);
      expect(result).toBe(true);
      expect(getPresets()).toHaveLength(0);
    });

    it("should return false when preset not found", () => {
      const result = deletePreset("non-existent-id");
      expect(result).toBe(false);
    });
  });

  describe("isDuplicatePresetName", () => {
    it("should return true when name exists", () => {
      const pitchList: formType[] = [
        { pitchName: "C", octaveNum: 4, isRoot: true },
      ];
      savePreset("Duplicate", pitchList);

      expect(isDuplicatePresetName("Duplicate")).toBe(true);
    });

    it("should return false when name does not exist", () => {
      expect(isDuplicatePresetName("Non-existent")).toBe(false);
    });

    it("should trim whitespace when checking", () => {
      const pitchList: formType[] = [
        { pitchName: "C", octaveNum: 4, isRoot: true },
      ];
      savePreset("Test", pitchList);

      expect(isDuplicatePresetName("  Test  ")).toBe(true);
    });
  });

  describe("getRelativeTimeString", () => {
    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2025-10-30T12:00:00Z"));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it("should return 'たった今' for recent timestamps", () => {
      const now = Date.now();
      expect(getRelativeTimeString(now)).toBe("たった今");
      expect(getRelativeTimeString(now - 30000)).toBe("たった今");
    });

    it("should return minutes for timestamps within an hour", () => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      expect(getRelativeTimeString(fiveMinutesAgo)).toBe("5分前");
    });

    it("should return hours for timestamps within a day", () => {
      const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
      expect(getRelativeTimeString(threeHoursAgo)).toBe("3時間前");
    });

    it("should return days for timestamps within a week", () => {
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
      expect(getRelativeTimeString(threeDaysAgo)).toBe("3日前");
    });

    it("should return weeks for timestamps within a month", () => {
      const twoWeeksAgo = Date.now() - 2 * 7 * 24 * 60 * 60 * 1000;
      expect(getRelativeTimeString(twoWeeksAgo)).toBe("2週間前");
    });

    it("should return date string for older timestamps", () => {
      const twoMonthsAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
      const result = getRelativeTimeString(twoMonthsAgo);
      expect(result).toMatch(/\d{4}\/\d{1,2}\/\d{1,2}/);
    });
  });
});
