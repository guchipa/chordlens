import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/feature/Toaster";
import { showToastAtom, toastAtom, TOAST_DURATION_MS } from "@/lib/store";
import type { ToastInput } from "@/lib/store/toastAtoms";

function setup() {
  const store = createStore();
  render(
    <Provider store={store}>
      <Toaster />
    </Provider>,
  );
  const show = (input: ToastInput) =>
    act(() => store.set(showToastAtom, input));
  return { store, show };
}

describe("Toaster", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("ライブリージョン (polite) を常に持ち、通知がなければ空", () => {
    setup();
    const region = screen.getByRole("status");
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.textContent).toBe("");
  });

  it("通知とアクションボタン (44px 以上) を表示し、押すと実行して閉じる", () => {
    const { store, show } = setup();
    const onAction = vi.fn();
    show({ message: "C4 を削除しました", actionLabel: "元に戻す", onAction });
    expect(screen.getByText("C4 を削除しました")).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: "元に戻す" });
    expect(btn.className).toContain("min-h-11");
    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(store.get(toastAtom)).toBeNull();
    expect(screen.queryByText("C4 を削除しました")).toBeNull();
  });

  it("5 秒で自動的に消える", () => {
    const { show } = setup();
    show({ message: "a", actionLabel: "元に戻す", onAction: vi.fn() });
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1));
    expect(screen.getByText("a")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText("a")).toBeNull();
  });

  it("新しい通知は古い通知を置き換え、タイマーも張り直す", () => {
    const { show } = setup();
    show({ message: "first", actionLabel: "元に戻す", onAction: vi.fn() });
    act(() => vi.advanceTimersByTime(4000));
    show({ message: "second", actionLabel: "元に戻す", onAction: vi.fn() });
    expect(screen.queryByText("first")).toBeNull();
    expect(screen.getAllByRole("button", { name: "元に戻す" })).toHaveLength(1);
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByText("second")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByText("second")).toBeNull();
  });
});

describe("Toaster とドロワー", () => {
  it("ドロワー表示中は画面下端寄せ用の変種クラスを持つ (html[data-drawer-open] 基準)", () => {
    cleanup();
    render(
      <Provider store={createStore()}>
        <Toaster />
      </Provider>,
    );
    const region = screen.getByRole("status");
    expect(region.className).toContain("[html[data-drawer-open]_&]:bottom-");
    expect(region.className).toContain("var(--bottom-bar-h");
  });

  it("アクション内で出した通知は閉じずに表示する", () => {
    const { store, show } = setup();
    show({
      message: "削除しました",
      actionLabel: "元に戻す",
      onAction: () => store.set(showToastAtom, { message: "元に戻せませんでした" }),
    });
    fireEvent.click(screen.getByRole("button", { name: "元に戻す" }));
    expect(screen.getByText("元に戻せませんでした")).toBeInTheDocument();
  });
});
