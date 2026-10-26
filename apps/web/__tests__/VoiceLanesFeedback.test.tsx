import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { VoiceLanesFeedback } from "@/components/feedback/VoiceLanesFeedback";
import type { Pitch } from "@chordlens/core/types";

const p = (pitchName: string, octaveNum: number, isRoot = false): Pitch => ({
  pitchName,
  octaveNum,
  isRoot,
  enabled: true,
});

describe("VoiceLanesFeedback", () => {
  afterEach(cleanup);

  it("低い声部から左に並べ、役割と偏差・方向の指示を出す", () => {
    render(
      <VoiceLanesFeedback
        evalRangeCents={50}
        holdEnabled={false}
        analysisData={[
          { pitch: p("G", 4), deviation: 0.2 },
          { pitch: p("C", 4, true), deviation: 0.01 },
          { pitch: p("E", 4), deviation: -0.3 },
        ]}
      />
    );
    const lanes = screen.getAllByTestId("voice-lane");
    expect(lanes.map((l) => l.getAttribute("aria-label"))).toEqual([
      "根音 C4",
      "長3度 E4",
      "完全5度 G4",
    ]);
    const cents = screen.getAllByTestId("lane-cents").map((c) => c.textContent);
    expect(cents).toEqual(["+1c", "−15c", "+10c"]);
    expect(lanes[0].textContent).toContain("✓");
    expect(lanes[1].textContent).toContain("▲ 上げる");
    expect(lanes[2].textContent).toContain("▼ 下げる");
    // 長3度は平均律より約 −14c が目標
    expect(lanes[1].textContent).toContain("平均律−14c");
  });

  it("構成音が 3 音でも 4 レーンぶん確保して幅を固定する", () => {
    render(
      <VoiceLanesFeedback
        evalRangeCents={50}
        holdEnabled={false}
        analysisData={[
          { pitch: p("C", 4, true), deviation: null },
          { pitch: p("E", 4), deviation: null },
          { pitch: p("G", 4), deviation: null },
        ]}
      />
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getAllByLabelText("空きレーン")).toHaveLength(1);
    expect(screen.getAllByText("未検出")).toHaveLength(3);
  });
});
