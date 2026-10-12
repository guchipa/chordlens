import { chordKey, nameChord } from "../../src/feedback/chordName";
import type { Pitch } from "../../src/types";

const p = (pitchName: string, octaveNum: number, isRoot = false, enabled = true): Pitch => ({
  pitchName,
  octaveNum,
  isRoot,
  enabled,
});

describe("nameChord", () => {
  it.each([
    [[p("C", 4, true), p("E", 4), p("G", 4)], "C"],
    [[p("A", 3, true), p("C", 4), p("E", 4)], "Am"],
    [[p("G", 3, true), p("B", 3), p("D", 4), p("F", 4)], "G7"],
    [[p("D", 4, true), p("F", 4), p("A", 4), p("C", 5)], "Dm7"],
    [[p("Eb", 4, true), p("G", 4), p("Bb", 4)], "Eb"],
    // 転回形でも根音基準で名前が決まる
    [[p("E", 3), p("G", 3), p("C", 4, true)], "C"],
  ])("%j → %s", (pitches, expected) => {
    expect(nameChord(pitches)?.symbol).toBe(expected);
  });

  it("2 音は音程名で表す", () => {
    expect(nameChord([p("C", 4, true), p("E", 4)])?.symbol).toBe("C + 長3度");
    expect(nameChord([p("C", 4, true), p("G", 4)])?.symbol).toBe("C5");
  });

  it("無効化した音は含めない", () => {
    expect(nameChord([p("C", 4, true), p("E", 4), p("G", 4), p("Bb", 4, false, false)])?.symbol).toBe("C");
  });

  it("表にない組み合わせは symbol=null、根音なしは null", () => {
    expect(nameChord([p("C", 4, true), p("C#", 4), p("D", 4)])).toEqual({ rootName: "C", symbol: null });
    expect(nameChord([p("C", 4), p("E", 4)])).toBeNull();
  });

  it("chordKey は有効な音と根音印で同一判定する", () => {
    expect(chordKey([p("C", 4, true), p("E", 4)])).toBe("C4*,E4");
    expect(chordKey([p("C", 4, true), p("E", 4, false, false)])).toBe("C4*");
  });
});
