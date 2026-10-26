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
    // 切替区間の帯は合っている帯より手前 (後) に描く
    const band = screen.getByTestId("trajectory-in-tune-band");
    const transition = screen.getByTestId("trajectory-transition");
    expect(band.compareDocumentPosition(transition) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // 凡例は現在の和音の役割
    const legend = screen.getByRole("list", { name: "線の色 (役割)" });
    expect(legend.textContent).toContain("長3度A4");
    // 3 声部でも 2 列 × 2 行ぶんの枠を確保して高さを固定する
    expect(legend.children).toHaveLength(4);
  });

  it("縦軸は 0 付近を拡大し、「合っている」帯に描画域の 2 割以上を割く", () => {
    render(<TrajectoryFeedback analysisData={frame(cMajor, 0)} evalRangeCents={50} transitioning={false} />);
    const band = screen.getByTestId("trajectory-in-tune-band");
    // 描画域の高さは 196 (PLOT_BOTTOM - PLOT_TOP)。線形だと 9.8 しかない
    expect(Number(band.getAttribute("height"))).toBeGreaterThan(196 * 0.2);
    // 帯の境界 (±2.5 セント) と ±10 / ±50 セントに目盛りを振る
    const svgText = screen.getByRole("img").textContent;
    for (const label of ["+50", "+10", "+2.5", "0", "−2.5", "−10", "−50"]) {
      expect(svgText).toContain(label);
    }
  });

  it("正解幅を広げると緑の帯が広がり、重なる「近い」の目盛りを省く", () => {
    render(
      <TrajectoryFeedback
        analysisData={frame(cMajor, 0)}
        evalRangeCents={50}
        transitioning={false}
        inTuneDeviation={0.2}
      />
    );
    const band = screen.getByTestId("trajectory-in-tune-band");
    expect(Number(band.getAttribute("height"))).toBeGreaterThan(196 * 0.35);
    const labels = [...screen.getByRole("img").querySelectorAll("text")].map((t) => t.textContent);
    expect(labels.filter((l) => l === "+10")).toHaveLength(1);
  });

  it("平滑化を指定すると線が急な変化に遅れて追従する", () => {
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const renderAt = (deviation: number, smoothingMs: number) => (
      <TrajectoryFeedback
        analysisData={frame([p("C", 4, true)], deviation)}
        evalRangeCents={50}
        transitioning={false}
        smoothingMs={smoothingMs}
      />
    );
    const latestY = () =>
      Number(screen.getByRole("img").querySelector("circle")!.getAttribute("cy"));

    const { rerender, unmount } = render(renderAt(0, 0));
    now = 100;
    rerender(renderAt(1, 0));
    const rawY = latestY();
    unmount();

    now = 0;
    const smoothed = render(renderAt(0, 500));
    now = 100;
    smoothed.rerender(renderAt(1, 500));
    // 上が正。平滑化ありは目標 (+1) まで上がりきらない
    expect(latestY()).toBeGreaterThan(rawY + 10);
  });
});
