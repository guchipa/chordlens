import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PurityFeedback } from "@/components/feedback/PurityFeedback";
import type { Pitch } from "@chordlens/core/types";

const p = (pitchName: string, octaveNum: number, isRoot = false): Pitch => ({
  pitchName,
  octaveNum,
  isRoot,
  enabled: true,
});

describe("PurityFeedback", () => {
  afterEach(cleanup);

  it("最大絶対偏差を大きく出し、最もずれた音と直す方向を示す", () => {
    render(
      <PurityFeedback
        evalRangeCents={50}
        holdEnabled={false}
        analysisData={[
          { pitch: p("C", 4, true), deviation: 0.01 },
          { pitch: p("E", 4), deviation: 0.3 },
          { pitch: p("G", 4), deviation: -0.1 },
        ]}
      />
    );
    expect(screen.getByTestId("purity-value").textContent).toBe("15c");
    expect(screen.getByRole("status").textContent).toContain("ずれています");
    expect(screen.getByRole("status").textContent).toContain("長3度 E4 を下げる");
    const chips = screen.getAllByTestId("purity-chip").map((c) => c.textContent);
    expect(chips).toEqual(["根音C4+1c", "長3度E4+15c", "完全5度G4−5c"]);
  });

  it("全音が合っていれば合っている旨だけを出す", () => {
    render(
      <PurityFeedback
        evalRangeCents={50}
        holdEnabled={false}
        analysisData={[
          { pitch: p("C", 4, true), deviation: 0.01 },
          { pitch: p("G", 4), deviation: -0.02 },
        ]}
      />
    );
    expect(screen.getByRole("status").textContent).toBe("純正に合っています");
  });

  it("何も検出されなければ待機表示", () => {
    render(
      <PurityFeedback
        evalRangeCents={50}
        holdEnabled={false}
        analysisData={[{ pitch: p("C", 4, true), deviation: null }]}
      />
    );
    expect(screen.getByTestId("purity-value").textContent).toBe("—");
    expect(screen.getByRole("status").textContent).toContain("音を待っています");
  });
});
