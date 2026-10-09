import { describe, it, expect } from "vitest";
import { pitchListEquals } from "../../src/presets/pitchListEquals";
import type { Pitch } from "../../src/types";

const triad = (): Pitch[] => [
  { pitchName: "C", octaveNum: 4, enabled: true, isRoot: true },
  { pitchName: "E", octaveNum: 4, enabled: true, isRoot: false },
  { pitchName: "G", octaveNum: 4, enabled: true, isRoot: false },
];

describe("pitchListEquals", () => {
  it("同じ内容なら参照が違っても true", () => {
    expect(pitchListEquals(triad(), triad())).toBe(true);
  });
  it("長さが違えば false", () => {
    expect(pitchListEquals(triad(), triad().slice(0, 2))).toBe(false);
  });
  it("根音・有効フラグ・音が違えば false", () => {
    const root = triad();
    root[0].isRoot = false;
    expect(pitchListEquals(triad(), root)).toBe(false);
    const off = triad();
    off[1].enabled = false;
    expect(pitchListEquals(triad(), off)).toBe(false);
    const other = triad();
    other[2].pitchName = "A";
    expect(pitchListEquals(triad(), other)).toBe(false);
  });
  it("空リスト同士は true", () => {
    expect(pitchListEquals([], [])).toBe(true);
  });
});
