import { render, screen, cleanup, within } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { afterEach, describe, expect, it } from "vitest";
import { TunerMeter } from "@/components/feedback/MeterFeedback";
import { BarListFeedback } from "@/components/feedback/BarFeedback";
import { CircleFeedback, CircleSlide } from "@/components/feedback/CircleFeedback";
import { circleLayoutAtom } from "@/lib/store";
import type { Pitch } from "@chordlens/core/types";

const p = (pitchName: string, octaveNum: number, isRoot = false): Pitch => ({
  pitchName,
  octaveNum,
  isRoot,
  enabled: true,
});

const cMajorUnordered = [
  { pitch: p("G", 4), deviation: 0.2 },
  { pitch: p("C", 4, true), deviation: 0.0 },
  { pitch: p("E", 4), deviation: -0.3 },
];

describe("既存形式の enhanced 表示 (メイン画面)", () => {
  afterEach(cleanup);

  it("メーター: 凡例を声部順に役割付きで出す (legacy は音名のみ)", () => {
    const { container, rerender } = render(
      <TunerMeter analysisData={cMajorUnordered} hideHeader variant="enhanced" />
    );
    const legend = container.querySelectorAll(".flex-wrap > div");
    expect([...legend].map((d) => d.textContent)).toEqual(["根音 C4", "長3度 E4", "完全5度 G4"]);

    rerender(<TunerMeter analysisData={cMajorUnordered} hideHeader />);
    const legacy = container.querySelectorAll(".flex-wrap > div");
    expect([...legacy].map((d) => d.textContent)).toEqual(["G4", "C4", "E4"]);
  });

  it("バー: 上から高い声部の順に並べ、最低 4 行を確保してセント値を出す", () => {
    render(
      <BarListFeedback analysisData={cMajorUnordered} evalRangeCents={50} a4Freq={442} holdEnabled={false} />
    );
    const rows = screen.getAllByTestId("bar-row");
    expect(rows.map((r) => r.textContent?.match(/[A-G][#b]?\d/)?.[0])).toEqual(["G4", "E4", "C4"]);
    // 合っている音には ✓ を付ける
    expect(within(rows[2]).getByRole("img", { name: "合っています" })).toBeDefined();
    expect(rows[1].textContent).toContain("長3度");
    expect(screen.getAllByTestId("bar-cents").map((c) => c.textContent)).toEqual(["+10c", "−15c", "±0c"]);
    expect(screen.getAllByTestId("bar-empty-row")).toHaveLength(1);
  });

  it("サークル: 5 度圏の並びにでき、中央に和音名を出す", () => {
    const store = createStore();
    store.set(circleLayoutAtom, "fifths");
    const { container } = render(
      <Provider store={store}>
        <CircleSlide analysisData={cMajorUnordered} holdEnabled={false} />
      </Provider>
    );
    const names = [...container.querySelectorAll("text")].map((t) => t.textContent);
    expect(screen.getByTestId("circle-center-label").textContent).toBe("C");
    // 先頭は中央の和音名、続いて 5 度圏の順
    expect(names.slice(1, 6)).toEqual(["C", "G", "D", "A", "E"]);
  });

  it("サークル: legacy は半音順・2 値の塗りのまま", () => {
    const { container } = render(
      <CircleFeedback analysisData={[{ pitchName: "E4", deviation: -0.1 }]} />
    );
    const names = [...container.querySelectorAll("text")].map((t) => t.textContent);
    expect(names.slice(0, 3)).toEqual(["C", "C#", "D"]);
    expect(container.querySelector('path[fill="#ef4444"]')).not.toBeNull();
    expect(screen.queryByTestId("circle-center-label")).toBeNull();
  });
});
