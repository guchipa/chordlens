import { describe, it, expect } from "vitest";
import { resolveSwipeIntent, stepItem, stepItemLoop } from "../../src/gestures/swipeIntent";

describe("resolveSwipeIntent", () => {
  it("十分な距離の左スワイプは next、右スワイプは prev", () => {
    expect(resolveSwipeIntent({ dx: -80, dy: 5, dtMs: 400 })).toBe("next");
    expect(resolveSwipeIntent({ dx: 80, dy: 5, dtMs: 400 })).toBe("prev");
  });
  it("距離が足りなければ null", () => {
    expect(resolveSwipeIntent({ dx: -40, dy: 0, dtMs: 400 })).toBeNull();
  });
  it("短くても速ければフリングとして確定する", () => {
    expect(resolveSwipeIntent({ dx: -40, dy: 0, dtMs: 60 })).toBe("next");
  });
  it("極端に短い移動はフリングでも無視する", () => {
    expect(resolveSwipeIntent({ dx: -10, dy: 0, dtMs: 10 })).toBeNull();
  });
  it("縦方向が優勢なら null", () => {
    expect(resolveSwipeIntent({ dx: -70, dy: 90, dtMs: 200 })).toBeNull();
  });
});

describe("stepItem", () => {
  const items = ["a", "b", "c"] as const;
  it("隣の項目を返し、端では null", () => {
    expect(stepItem(items, "b", 1)).toBe("c");
    expect(stepItem(items, "b", -1)).toBe("a");
    expect(stepItem(items, "c", 1)).toBeNull();
    expect(stepItem(items, "a", -1)).toBeNull();
  });
});

describe("stepItemLoop", () => {
  const items = ["a", "b", "c"] as const;
  it("端では反対側の端へ循環する", () => {
    expect(stepItemLoop(items, "b", 1)).toBe("c");
    expect(stepItemLoop(items, "c", 1)).toBe("a");
    expect(stepItemLoop(items, "a", -1)).toBe("c");
  });
  it("見つからない・項目が 1 つ以下なら null", () => {
    expect(stepItemLoop(items, "z" as never, 1)).toBeNull();
    expect(stepItemLoop(["a"], "a", 1)).toBeNull();
  });
});
