/**
 * 評価 CLI の引数ヘルパーのテスト。
 * 不正な引数を黙って受け流すと、空のレポートや NaN パラメータのまま
 * 正常終了してしまい、評価結果を誤読する原因になる
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { requireIdListArg } from "../../scripts/lib/cliArgs";

/** failArg の process.exit を捕まえ、終了時のメッセージを取り出す */
function captureExit(fn: () => void): string {
  const exit = vi
    .spyOn(process, "exit")
    .mockImplementation((() => {
      throw new Error("__exit__");
    }) as never);
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect(fn).toThrow("__exit__");
    expect(exit).toHaveBeenCalledWith(1);
    return error.mock.calls.map((args) => String(args[0])).join("\n");
  } finally {
    exit.mockRestore();
    error.mockRestore();
  }
}

describe("requireIdListArg", () => {
  const allowed = ["baseline", "no-subtraction"] as const;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("既知の ID をカンマ区切りで受け取る (前後の空白は除去する)", () => {
    expect(requireIdListArg("baseline, no-subtraction", "--variants", allowed))
      .toEqual(["baseline", "no-subtraction"]);
  });

  it("未知の ID はその場で弾く (空レポートで正常終了させない)", () => {
    const message = captureExit(() =>
      requireIdListArg("baseline,no-subtractoin", "--variants", allowed)
    );
    expect(message).toContain("no-subtractoin");
    expect(message).toContain("baseline, no-subtraction");
  });

  it("値の欠落を弾く", () => {
    const message = captureExit(() =>
      requireIdListArg(undefined, "--variants", allowed)
    );
    expect(message).toContain("--variants");
  });

  it("カンマだけの指定を弾く", () => {
    const message = captureExit(() =>
      requireIdListArg(",,", "--variants", allowed)
    );
    expect(message).toContain("--variants");
  });
});
