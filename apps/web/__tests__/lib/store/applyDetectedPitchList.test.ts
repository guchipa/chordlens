import { createStore } from "jotai";
import { describe, expect, it } from "vitest";
import { applyDetectedPitchListAtom, pitchListAtom } from "@/lib/store";
import type { Pitch } from "@chordlens/core/types";

const p = (pitchName: string, octaveNum: number, isRoot = false, enabled = true): Pitch => ({
  pitchName,
  octaveNum,
  isRoot,
  enabled,
});

const detectedCMajor = [p("C", 4, true), p("E", 4), p("G", 4)];

describe("applyDetectedPitchListAtom", () => {
  it("登録順や無効化した音だけが違うリストは上書きしない", () => {
    const store = createStore();
    const userList = [p("G", 4), p("C", 4, true), p("E", 4), p("Bb", 4, false, false)];
    store.set(pitchListAtom, userList);
    expect(store.set(applyDetectedPitchListAtom, detectedCMajor)).toBe(false);
    expect(store.get(pitchListAtom)).toBe(userList);
  });

  it("和音が違えば推定結果で置き換える", () => {
    const store = createStore();
    store.set(pitchListAtom, [p("F", 4, true), p("A", 4), p("C", 5)]);
    expect(store.set(applyDetectedPitchListAtom, detectedCMajor)).toBe(true);
    expect(store.get(pitchListAtom)).toEqual(detectedCMajor);
  });
});
