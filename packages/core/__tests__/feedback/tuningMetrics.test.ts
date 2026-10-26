import {
  alignResultsByKey,
  inTuneDeviationFromCents,
  scaleDeviationForDisplay,
  summarizePurity,
  tuningLevel,
} from "../../src/feedback/tuningMetrics";
import { CLOSE_DEVIATION, IN_TUNE_DEVIATION } from "../../src/constants";
import type { Pitch } from "../../src/types";

const p = (pitchName: string, octaveNum: number, isRoot = false): Pitch => ({
  pitchName,
  octaveNum,
  isRoot,
  enabled: true,
});

describe("tuningMetrics", () => {
  it("偏差を 3 段階に分ける", () => {
    expect(tuningLevel(0.01)).toBe("inTune");
    expect(tuningLevel(-0.1)).toBe("close");
    expect(tuningLevel(0.5)).toBe("off");
  });

  it("「合っている」の閾値を渡すと段階判定に使う", () => {
    expect(tuningLevel(0.08)).toBe("close");
    expect(tuningLevel(0.08, 0.1)).toBe("inTune");
  });

  describe("inTuneDeviationFromCents", () => {
    it("セントを評価範囲で正規化する", () => {
      expect(inTuneDeviationFromCents(2.5, 50)).toBeCloseTo(0.05, 10);
      expect(inTuneDeviationFromCents(5, 25)).toBeCloseTo(0.2, 10);
    });

    it("「近い」の閾値を超えないよう頭打ちにする", () => {
      expect(inTuneDeviationFromCents(10, 20)).toBe(CLOSE_DEVIATION);
    });

    it("不正な値は既定の閾値に戻す", () => {
      expect(inTuneDeviationFromCents(0, 50)).toBe(IN_TUNE_DEVIATION);
      expect(inTuneDeviationFromCents(Number.NaN, 50)).toBe(IN_TUNE_DEVIATION);
      expect(inTuneDeviationFromCents(2.5, 0)).toBe(IN_TUNE_DEVIATION);
    });
  });

  describe("scaleDeviationForDisplay", () => {
    it("端点と 0 を保ち、範囲外は ±1 に丸める", () => {
      expect(scaleDeviationForDisplay(0)).toBe(0);
      expect(scaleDeviationForDisplay(1)).toBeCloseTo(1, 10);
      expect(scaleDeviationForDisplay(-1)).toBeCloseTo(-1, 10);
      expect(scaleDeviationForDisplay(3)).toBeCloseTo(1, 10);
    });

    it("単調増加の奇関数", () => {
      let prev = -Infinity;
      for (let d = -1; d <= 1; d += 0.01) {
        const y = scaleDeviationForDisplay(d);
        expect(y).toBeGreaterThan(prev);
        expect(scaleDeviationForDisplay(-d)).toBeCloseTo(-y, 10);
        prev = y;
      }
    });

    it("「合っている」帯を線形の 4 倍以上に広げる", () => {
      expect(scaleDeviationForDisplay(IN_TUNE_DEVIATION)).toBeGreaterThan(4 * IN_TUNE_DEVIATION);
      expect(scaleDeviationForDisplay(CLOSE_DEVIATION)).toBeGreaterThan(0.5);
    });
  });

  it("最大絶対偏差の音を選ぶ (未検出は除く)", () => {
    const s = summarizePurity([
      { key: "C4", deviation: 0.02 },
      { key: "E4", deviation: -0.3 },
      { key: "G4", deviation: null },
    ]);
    expect(s.worst).toEqual({ key: "E4", deviation: -0.3 });
    expect(s.detectedCount).toBe(2);
    expect(s.totalCount).toBe(3);
  });

  it("何も検出されなければ worst=null", () => {
    expect(summarizePurity([{ key: "C4", deviation: null }]).worst).toBeNull();
  });

  describe("alignResultsByKey", () => {
    it("解析時のリストのキーで現在のリストに対応付ける", () => {
      const analyzed = [p("C", 4, true), p("E", 4), p("G", 4)];
      const current = [p("C", 4, true), p("Eb", 4), p("G", 4), p("E", 4)];
      expect(alignResultsByKey(current, analyzed, [0.1, 0.2, 0.3])).toEqual([0.1, null, 0.3, 0.2]);
    });

    it("根音が変わったら同名音でも旧根音基準の偏差を使わない", () => {
      const analyzed = [p("C", 4, true), p("E", 4), p("G", 4)];
      const current = [p("A", 3, true), p("C", 4), p("E", 4)];
      expect(alignResultsByKey(current, analyzed, [0.1, 0.2, 0.3])).toEqual([null, null, null]);
    });

    it("解析時のリストが無ければ位置で対応付ける", () => {
      expect(alignResultsByKey([p("C", 4, true)], null, [0.4])).toEqual([0.4]);
    });

    it("結果が無ければすべて null", () => {
      expect(alignResultsByKey([p("C", 4, true)], null, null)).toEqual([null]);
    });
  });
});
