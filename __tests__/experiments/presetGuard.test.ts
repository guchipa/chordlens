import {
  installExperimentPresets,
  restoreUserPresets,
} from "@/lib/experiments/presetGuard";
import type { ChordPitches } from "@/lib/experiments/types";

const samplePitches: ChordPitches = {
  Bb: [
    { pitchName: "D", octaveNum: 4, isRoot: false, enabled: true },
    { pitchName: "F", octaveNum: 4, isRoot: false, enabled: true },
  ],
  Cm: [
    { pitchName: "Eb", octaveNum: 4, isRoot: false, enabled: true },
    { pitchName: "G", octaveNum: 4, isRoot: false, enabled: true },
  ],
  F7: [
    { pitchName: "A", octaveNum: 4, isRoot: false, enabled: true },
    { pitchName: "Eb", octaveNum: 4, isRoot: false, enabled: true },
  ],
};

describe("preset guard", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("install/restore でユーザープリセットが復元される", () => {
    const userPresetsRaw = JSON.stringify({
      version: 1,
      presets: [
        {
          id: "user-1",
          name: "user-preset",
          pitchList: [],
          createdAt: 1000,
        },
      ],
    });
    window.localStorage.setItem("chordlens-presets", userPresetsRaw);

    installExperimentPresets("PR01", samplePitches);
    const installed = JSON.parse(
      window.localStorage.getItem("chordlens-presets") ?? "null"
    );
    expect(installed.presets).toHaveLength(3);
    const names = installed.presets.map(
      (p: { name: string }) => p.name
    );
    expect(names).toEqual(
      expect.arrayContaining(["__exp__B♭", "__exp__Cm", "__exp__F7"])
    );

    restoreUserPresets("PR01");
    expect(window.localStorage.getItem("chordlens-presets")).toBe(
      userPresetsRaw
    );
    expect(window.localStorage.getItem("chordlens-presets-backup-PR01")).toBe(
      null
    );
  });

  it("ユーザープリセットが空の状態で install/restore してもキーが残らない", () => {
    installExperimentPresets("PR02", samplePitches);
    expect(window.localStorage.getItem("chordlens-presets")).not.toBeNull();
    restoreUserPresets("PR02");
    expect(window.localStorage.getItem("chordlens-presets")).toBeNull();
  });
});
