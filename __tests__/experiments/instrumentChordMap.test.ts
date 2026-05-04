import {
  derivePartAssignment,
  derivePitchLists,
  dedupePitches,
} from "@/lib/experiments/instrumentChordMap";

describe("derivePartAssignment", () => {
  it("低音域楽器のメンバーに低い音、高音域楽器に高い音を割り振る", () => {
    const assignment = derivePartAssignment(["tuba", "trumpet"]);
    expect(assignment.Bb.memberA).toBe("D"); // tuba (low)
    expect(assignment.Bb.memberB).toBe("F"); // trumpet (high)
    expect(assignment.Cm.memberA).toBe("Eb");
    expect(assignment.Cm.memberB).toBe("G");
    expect(assignment.F7.memberA).toBe("A");
    expect(assignment.F7.memberB).toBe("Eb");
  });

  it("音域が逆転すると割り当ても入れ替わる", () => {
    const a = derivePartAssignment(["trumpet", "tuba"]);
    expect(a.Bb.memberA).toBe("F"); // trumpet (high) gets high note
    expect(a.Bb.memberB).toBe("D");
  });

  it("同じ楽器の場合はメンバー A が低音担当", () => {
    const a = derivePartAssignment(["trumpet", "trumpet"]);
    expect(a.Bb.memberA).toBe("D");
    expect(a.Bb.memberB).toBe("F");
  });
});

describe("derivePitchLists", () => {
  it("根音 (isRoot=true, enabled=false) と担当 2 音を返す", () => {
    const assignment = derivePartAssignment(["trumpet", "trumpet"]);
    const pitches = derivePitchLists(["trumpet", "trumpet"], assignment);
    expect(pitches.Bb).toHaveLength(3);
    const names = pitches.Bb.map((p) => p.pitchName);
    expect(names).toEqual(expect.arrayContaining(["Bb", "D", "F"]));
  });

  it("根音は isRoot=true / enabled=false、担当音は isRoot=false / enabled=true", () => {
    const assignment = derivePartAssignment(["trumpet", "trumpet"]);
    const pitches = derivePitchLists(["trumpet", "trumpet"], assignment);
    for (const chord of ["Bb", "Cm", "F7"] as const) {
      const roots = pitches[chord].filter((p) => p.isRoot);
      expect(roots).toHaveLength(1);
      expect(roots[0].enabled).toBe(false);
      const parts = pitches[chord].filter((p) => !p.isRoot);
      parts.forEach((p) => expect(p.enabled).toBe(true));
    }
  });
});

describe("dedupePitches", () => {
  it("同じ音名+オクターブの重複を除去する", () => {
    const out = dedupePitches([
      { pitchName: "C", octaveNum: 4, isRoot: false, enabled: true },
      { pitchName: "C", octaveNum: 4, isRoot: false, enabled: true },
      { pitchName: "E", octaveNum: 4, isRoot: false, enabled: true },
    ]);
    expect(out).toHaveLength(2);
  });
});
