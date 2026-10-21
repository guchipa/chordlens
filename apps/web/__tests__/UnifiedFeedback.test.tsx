import { render, screen, cleanup } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { afterEach, describe, expect, it } from "vitest";
import { UnifiedFeedback } from "@/components/feedback/UnifiedFeedback";
import { feedbackTypeAtom } from "@/lib/store";
import type { Pitch } from "@chordlens/core/types";

const data = [
  { pitch: { pitchName: "C", octaveNum: 4, enabled: true, isRoot: true } as Pitch, deviation: 0.1 },
  { pitch: { pitchName: "E", octaveNum: 4, enabled: true, isRoot: false } as Pitch, deviation: -0.2 },
  { pitch: { pitchName: "G", octaveNum: 4, enabled: false, isRoot: false } as Pitch, deviation: null },
];

describe("UnifiedFeedback (評価実験画面)", () => {
  afterEach(cleanup);

  it("メイン画面の形式によらずメーターで描き、形式の切替 UI を置かない", () => {
    const store = createStore();
    store.set(feedbackTypeAtom, "bar");
    render(
      <Provider store={store}>
        <UnifiedFeedback analysisData={data} />
      </Provider>
    );
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(document.querySelector('[data-slot="feedback-swipe-area"]')).toBeNull();
    expect(screen.getByText(/C4/)).toBeInTheDocument();
    expect(screen.getByText(/E4/)).toBeInTheDocument();
    // 無効な音は描かない
    expect(screen.queryByText(/G4/)).toBeNull();
  });
});
