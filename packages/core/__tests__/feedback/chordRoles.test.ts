import {
  describeVoices,
  intervalFromRoot,
  justOffsetFromEqualCents,
  chordRoleOf,
} from "../../src/feedback/chordRoles";
import type { Pitch } from "../../src/types";

const p = (pitchName: string, octaveNum: number, isRoot = false, enabled = true): Pitch => ({
  pitchName,
  octaveNum,
  isRoot,
  enabled,
});

describe("chordRoles", () => {
  it("根音からの半音数をオクターブをまたいで 0〜11 に正規化する", () => {
    expect(intervalFromRoot(p("E", 4), p("C", 4))).toBe(4);
    expect(intervalFromRoot(p("E", 3), p("C", 4))).toBe(4);
    expect(intervalFromRoot(p("C", 5), p("C", 4))).toBe(0);
    expect(intervalFromRoot(p("B", 3), p("C", 4))).toBe(11);
  });

  it("度数を役割に分類する", () => {
    expect(chordRoleOf(0)).toBe("root");
    expect(chordRoleOf(3)).toBe("third");
    expect(chordRoleOf(4)).toBe("third");
    expect(chordRoleOf(7)).toBe("fifth");
    expect(chordRoleOf(10)).toBe("seventh");
    expect(chordRoleOf(2)).toBe("other");
  });

  it("純正律と平均律の差 (長3度 ≈ −13.7、完全5度 ≈ +2.0)", () => {
    expect(justOffsetFromEqualCents(4)).toBeCloseTo(-13.69, 1);
    expect(justOffsetFromEqualCents(7)).toBeCloseTo(1.96, 1);
    expect(justOffsetFromEqualCents(3)).toBeCloseTo(15.64, 1);
    expect(justOffsetFromEqualCents(0)).toBeCloseTo(0, 5);
  });

  it("有効な音を低い順に並べ、役割を付ける", () => {
    const voices = describeVoices([
      p("G", 4),
      p("C", 4, true),
      p("E", 4),
      p("B", 4, false, false),
    ]);
    expect(voices.map((v) => v.key)).toEqual(["C4", "E4", "G4"]);
    expect(voices.map((v) => v.intervalLabel)).toEqual(["根音", "長3度", "完全5度"]);
    expect(voices.map((v) => v.role)).toEqual(["root", "third", "fifth"]);
  });

  it("根音が定まらなければ役割は null", () => {
    const voices = describeVoices([p("C", 4), p("E", 4)]);
    expect(voices.every((v) => v.role === null && v.interval === null)).toBe(true);
  });
});
