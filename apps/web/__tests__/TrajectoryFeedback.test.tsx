import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TrajectoryFeedback } from "@/components/feedback/TrajectoryFeedback";
import type { Pitch } from "@chordlens/core/types";

const p = (pitchName: string, octaveNum: number, isRoot = false): Pitch => ({
  pitchName,
  octaveNum,
  isRoot,
  enabled: true,
});

const cMajor = [p("C", 4, true), p("E", 4), p("G", 4)];
const fMajor = [p("F", 4, true), p("A", 4), p("C", 5)];
const frame = (pitches: Pitch[], deviation: number) =>
  pitches.map((pitch) => ({ pitch, deviation }));

describe("TrajectoryFeedback", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("サンプルを貯めて声部ごとの線と和音の区間を描き、切替区間を分ける", () => {
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const { rerender } = render(
      <TrajectoryFeedback analysisData={frame(cMajor, 0.1)} evalRangeCents={50} transitioning={false} />
    );
    for (let i = 1; i <= 10; i++) {
      now = i * 400;
      rerender(
        <TrajectoryFeedback analysisData={frame(cMajor, 0.1 + i * 0.01)} evalRangeCents={50} transitioning={i >= 8} />
      );
    }
    for (let i = 11; i <= 20; i++) {
      now = i * 400;
      rerender(<TrajectoryFeedback analysisData={frame(fMajor, -0.1)} evalRangeCents={50} transitioning={false} />);
    }

    expect(screen.getAllByTestId("trajectory-line").length).toBeGreaterThanOrEqual(6);
    const labels = screen.getAllByTestId("trajectory-segment").map((g) => g.textContent);
    expect(labels).toEqual(["C", "F"]);
    expect(screen.getAllByTestId("trajectory-transition")).toHaveLength(1);
    // 凡例は現在の和音の役割
    expect(screen.getByRole("list", { name: "線の色 (役割)" }).textContent).toContain("長3度A4");
  });
});
