import { describe, it, expect } from "vitest";
import { insertAt, removeAt } from "../../src/undo/listOps";

describe("listOps", () => {
  it("removeAt は指定位置を除いた新しい配列を返す", () => {
    const src = ["a", "b", "c"];
    expect(removeAt(src, 1)).toEqual(["a", "c"]);
    expect(src).toEqual(["a", "b", "c"]);
  });

  it("insertAt は元の位置へ戻せる", () => {
    const src = ["a", "b", "c"];
    expect(insertAt(removeAt(src, 1), 1, "b")).toEqual(src);
    expect(insertAt(removeAt(src, 0), 0, "a")).toEqual(src);
    expect(insertAt(removeAt(src, 2), 2, "c")).toEqual(src);
  });

  it("insertAt は範囲外の index を丸める", () => {
    expect(insertAt(["a"], 9, "x")).toEqual(["a", "x"]);
    expect(insertAt(["a"], -3, "x")).toEqual(["x", "a"]);
    expect(insertAt([], 0, "x")).toEqual(["x"]);
  });
});
