import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { afterEach, describe, expect, it } from "vitest";
import { FeedbackCarousel } from "@/components/feedback/FeedbackCarousel";
import { feedbackTypeAtom } from "@/lib/store";
import { FEEDBACK_TYPES, FEEDBACK_TYPE_LABELS, type FeedbackType } from "@chordlens/core/constants";
import type { Pitch } from "@chordlens/core/types";

// jsdom には PointerEvent がないため、座標・pointerType を持つ最小実装を用意する
if (typeof window.PointerEvent === "undefined") {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    isPrimary: boolean;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? "";
      this.isPrimary = init.isPrimary ?? false;
    }
  }
  window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}

const data = [
  { pitch: { pitchName: "C", octaveNum: 4, enabled: true, isRoot: true } as Pitch, deviation: 0.1 },
  { pitch: { pitchName: "E", octaveNum: 4, enabled: true, isRoot: false } as Pitch, deviation: -0.2 },
];

function setup(initial: FeedbackType = "meter", transitioning = false) {
  const store = createStore();
  store.set(feedbackTypeAtom, initial);
  render(
    <Provider store={store}>
      <FeedbackCarousel
        analysisData={data}
        evalRangeCents={50}
        a4Freq={442}
        holdEnabled
        transitioning={transitioning}
      />
    </Provider>
  );
  return store;
}

const base = { pointerType: "touch", isPrimary: true, pointerId: 1 } as const;
const area = () => document.querySelector('[data-slot="feedback-swipe-area"]')!;

function swipe(from: [number, number], to: [number, number]) {
  fireEvent.pointerDown(area(), { ...base, clientX: from[0], clientY: from[1] });
  fireEvent.pointerMove(area(), { ...base, clientX: to[0], clientY: to[1] });
  fireEvent.pointerUp(area(), { ...base, clientX: to[0], clientY: to[1] });
}

const slideTrack = () =>
  screen.getByRole("group", { name: /\d+ \/ \d+/ }).parentElement as HTMLElement;

describe("FeedbackCarousel (メイン画面)", () => {
  afterEach(cleanup);

  it("タブは置かず、形式名と全形式ぶんのドットを表示する", () => {
    setup("bar");
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.getAllByTestId("carousel-dot")).toHaveLength(FEEDBACK_TYPES.length);
    expect(screen.getByRole("group", { name: `2 / ${FEEDBACK_TYPES.length}: バー` })).toBeDefined();
  });

  it("左スワイプで次の形式、右スワイプで前の形式へ移動する", () => {
    const store = setup("bar");
    swipe([250, 200], [120, 205]);
    expect(store.get(feedbackTypeAtom)).toBe(FEEDBACK_TYPES[2]);
    swipe([100, 200], [240, 200]);
    expect(store.get(feedbackTypeAtom)).toBe("bar");
  });

  it("縦方向・短い移動・左端開始では切り替わらない", () => {
    const store = setup("bar");
    swipe([200, 100], [140, 260]);
    swipe([200, 200], [180, 200]);
    swipe([10, 200], [200, 200]);
    expect(store.get(feedbackTypeAtom)).toBe("bar");
  });

  it("操作中はカードが指に追従し、離すと元の位置に戻る", () => {
    setup("bar");
    fireEvent.pointerDown(area(), { ...base, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(area(), { ...base, clientX: 170, clientY: 201 });
    expect(slideTrack().style.transform).toBe("translateX(-30px)");
    fireEvent.pointerUp(area(), { ...base, clientX: 170, clientY: 201 });
    expect(slideTrack().style.transform).toBe("");
  });

  it("端の形式からは反対側の端へ循環する (スワイプ)", () => {
    const last = FEEDBACK_TYPES[FEEDBACK_TYPES.length - 1];
    const store = setup("meter");
    swipe([100, 200], [250, 200]);
    expect(store.get(feedbackTypeAtom)).toBe(last);
    swipe([250, 200], [120, 205]);
    expect(store.get(feedbackTypeAtom)).toBe("meter");
  });

  it("端をまたぐ循環でも操作した向きからスライドインする", () => {
    setup("meter");
    // 前へ (右スワイプ) で最後の形式へ: 左から入る
    swipe([100, 200], [250, 200]);
    expect(screen.getByRole("group", { name: /\d+ \/ \d+/ }).className).toContain("slide-in-from-left-6");
    // 次へ (左スワイプ) で最初の形式へ: 右から入る
    swipe([250, 200], [120, 205]);
    expect(screen.getByRole("group", { name: /\d+ \/ \d+/ }).className).toContain("slide-in-from-right-6");
  });

  it("端の形式でも引っ張りに抵抗をかけず指に追従する", () => {
    setup("meter");
    fireEvent.pointerDown(area(), { ...base, clientX: 100, clientY: 200 });
    fireEvent.pointerMove(area(), { ...base, clientX: 180, clientY: 200 });
    expect(slideTrack().style.transform).toBe("translateX(80px)");
    fireEvent.pointerUp(area(), { ...base, clientX: 180, clientY: 200 });
  });

  it("前後ボタンは端でも無効にならず循環する", () => {
    const last = FEEDBACK_TYPES[FEEDBACK_TYPES.length - 1];
    const store = setup("meter");
    const prev = screen.getByRole("button", { name: `前の形式: ${FEEDBACK_TYPE_LABELS[last]}` });
    expect(prev).toHaveProperty("disabled", false);
    fireEvent.click(prev);
    expect(store.get(feedbackTypeAtom)).toBe(last);
    fireEvent.click(screen.getByRole("button", { name: `次の形式: ${FEEDBACK_TYPE_LABELS.meter}` }));
    expect(store.get(feedbackTypeAtom)).toBe("meter");
  });

  it("前後ボタンでも切り替えられる (スワイプできない環境向け)", () => {
    const store = setup("meter");
    fireEvent.click(screen.getByRole("button", { name: `次の形式: ${FEEDBACK_TYPE_LABELS.bar}` }));
    expect(store.get(feedbackTypeAtom)).toBe("bar");
    fireEvent.click(screen.getByRole("button", { name: `前の形式: ${FEEDBACK_TYPE_LABELS.meter}` }));
    expect(store.get(feedbackTypeAtom)).toBe("meter");
  });

  it("和音の切替中はカードを灰色にして判定中と表示する", () => {
    setup("bar", true);
    expect(screen.getByTestId("feedback-slide-body").dataset.transitioning).toBe("true");
    expect(screen.getByText("和音を判定中…")).toBeDefined();
  });
});
