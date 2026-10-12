import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CentDisplay } from "@/components/feature/CentDisplay";
import type { Pitch } from "@chordlens/core/types";

const p = (pitchName: string, octaveNum: number, isRoot = false): Pitch => ({
  pitchName,
  octaveNum,
  isRoot,
  enabled: true,
});

describe("CentDisplay", () => {
  afterEach(cleanup);

  it("minRows を指定すると不足ぶんの見えない行で高さを確保する", () => {
    render(<CentDisplay pitchList={[p("C", 4, true), p("E", 4)]} a4Freq={442} minRows={4} />);
    const placeholders = screen.getAllByTestId("cent-display-placeholder");
    expect(placeholders).toHaveLength(2);
    expect(placeholders.every((el) => el.getAttribute("aria-hidden") === "true")).toBe(true);
  });

  it("既定 (評価実験画面など) では確保しない", () => {
    render(<CentDisplay pitchList={[p("C", 4, true)]} a4Freq={442} />);
    expect(screen.queryAllByTestId("cent-display-placeholder")).toHaveLength(0);
  });
});
