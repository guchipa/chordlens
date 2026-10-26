import { pitchListKey } from "../../src/presets/pitchListKey";
import type { Pitch } from "../../src/types";

const p = (pitchName: string, octaveNum: number, isRoot = false, enabled = true): Pitch => ({
  pitchName,
  octaveNum,
  isRoot,
  enabled,
});

describe("pitchListKey", () => {
  it("有効な音を音高の低い順に並べ、根音に印を付ける", () => {
    expect(pitchListKey([p("C", 4, true), p("E", 4), p("G", 4)])).toBe("C4*,E4,G4");
  });

  it("登録順が違っても同じキーになる (オクターブをまたぐ並びも音高順)", () => {
    expect(pitchListKey([p("G", 4), p("C", 4, true), p("E", 4)])).toBe("C4*,E4,G4");
    expect(pitchListKey([p("C", 5), p("B", 4, true)])).toBe("B4*,C5");
  });

  it("無効な音は含めない", () => {
    expect(pitchListKey([p("C", 4, true), p("E", 4), p("G", 4), p("Bb", 4, false, false)])).toBe(
      "C4*,E4,G4"
    );
  });

  it("根音が違えば別のキーになる", () => {
    expect(pitchListKey([p("C", 4), p("E", 4, true), p("G", 4)])).not.toBe(
      pitchListKey([p("C", 4, true), p("E", 4), p("G", 4)])
    );
  });
});
