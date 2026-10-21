import {
  alignResultsByKey,
  summarizePurity,
  tuningLevel,
} from "../../src/feedback/tuningMetrics";
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
