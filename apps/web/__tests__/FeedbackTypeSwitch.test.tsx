import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { afterEach, describe, expect, it } from "vitest";
import { UnifiedFeedback } from "@/components/feedback/UnifiedFeedback";
import { FeedbackTypeSelector } from "@/components/feature/FeedbackTypeSelector";
import { feedbackTypeAtom } from "@/lib/store";
import type { FeedbackType } from "@chordlens/core/constants";
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

function Harness({ store }: { store: ReturnType<typeof createStore> }) {
  return (
    <Provider store={store}>
      <Connected />
    </Provider>
  );
}
import { useAtomValue } from "jotai";
function Connected() {
  const type = useAtomValue(feedbackTypeAtom);
  return (
    <>
      <UnifiedFeedback feedbackType={type} analysisData={data} evalRangeCents={50} />
      <FeedbackTypeSelector />
    </>
  );
}

function setup(initial: FeedbackType = "meter") {
  const store = createStore();
  store.set(feedbackTypeAtom, initial);
  render(<Harness store={store} />);
  return store;
}

/** touch ポインタでスワイプを再現する */
function swipe(el: Element, from: [number, number], to: [number, number]) {
  const base = { pointerType: "touch", isPrimary: true, pointerId: 1 } as const;
  fireEvent.pointerDown(el, { ...base, clientX: from[0], clientY: from[1] });
  fireEvent.pointerMove(el, { ...base, clientX: to[0], clientY: to[1] });
  fireEvent.pointerUp(el, { ...base, clientX: to[0], clientY: to[1] });
}

describe("FeedbackTypeSwitch (評価実験画面)", () => {
  afterEach(cleanup);

  it("3 形式のセグメントを表示し、現在の形式が選択状態になる", () => {
    setup("bar");
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.textContent)).toEqual(["メーター", "バー", "サークル"]);
    expect(screen.getByRole("radio", { name: "バー" }).getAttribute("aria-checked")).toBe("true");
  });

  it("タップで形式が切り替わり、ドロワーのセレクタと atom を共有する", () => {
    const store = setup("meter");
    fireEvent.click(screen.getByRole("radio", { name: "サークル" }));
    expect(store.get(feedbackTypeAtom)).toBe("circle");
    expect(screen.getByRole("radio", { name: "サークル" }).getAttribute("aria-checked")).toBe("true");
    // ドロワー側セレクタの説明文も追従する
    expect(screen.getByText(/円になった音名/)).toBeDefined();
  });

  it("左スワイプで次の形式、右スワイプで前の形式へ移動する", () => {
    const store = setup("bar");
    const area = document.querySelector('[data-slot="feedback-swipe-area"]')!;
    swipe(area, [250, 200], [120, 205]);
    expect(store.get(feedbackTypeAtom)).toBe("circle");
    swipe(area, [100, 200], [240, 200]);
    expect(store.get(feedbackTypeAtom)).toBe("bar");
  });

  it("縦方向のスワイプ・短い移動・左端開始では切り替わらない", () => {
    const store = setup("bar");
    const area = document.querySelector('[data-slot="feedback-swipe-area"]')!;
    swipe(area, [200, 100], [140, 260]);
    swipe(area, [200, 200], [180, 200]);
    swipe(area, [10, 200], [200, 200]);
    expect(store.get(feedbackTypeAtom)).toBe("bar");
  });

  it("端の形式ではそれ以上動かない", () => {
    const store = setup("meter");
    const area = document.querySelector('[data-slot="feedback-swipe-area"]')!;
    swipe(area, [100, 200], [250, 200]);
    expect(store.get(feedbackTypeAtom)).toBe("meter");
  });
});
