import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useBackButtonClose } from "@/lib/hooks/useBackButtonClose";

/** jsdom の history.back() は非同期に popstate を発火する */
const flush = () => act(() => new Promise<void>((r) => setTimeout(r, 20)));

describe("useBackButtonClose", () => {
  let backSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.history.replaceState({ idx: 3, key: "k" }, "", "/");
    backSpy = vi.spyOn(window.history, "back");
  });
  afterEach(() => {
    backSpy.mockRestore();
  });

  it("閉じている間は履歴を触らない", () => {
    const len = window.history.length;
    renderHook(() => useBackButtonClose(false, vi.fn()));
    expect(window.history.length).toBe(len);
  });

  it("開くと履歴エントリを積み、既存の state (react-router) を引き継ぐ", () => {
    const len = window.history.length;
    const { rerender } = renderHook(
      ({ open }) => useBackButtonClose(open, vi.fn()),
      { initialProps: { open: false } },
    );
    rerender({ open: true });
    expect(window.history.length).toBe(len + 1);
    expect(window.history.state).toMatchObject({
      idx: 3,
      key: "k",
      chordlensBackClose: true,
    });
  });

  it("popstate (戻る操作) で onClose を呼び、back() は呼ばない", async () => {
    const onClose = vi.fn();
    const { rerender } = renderHook(
      ({ open }) => useBackButtonClose(open, onClose),
      { initialProps: { open: true } },
    );
    act(() => {
      window.history.back();
    });
    await flush();
    expect(onClose).toHaveBeenCalledTimes(1);
    backSpy.mockClear();
    // 親が isOpen=false にしても追加の back() は発生しない (ループ防止)
    rerender({ open: false });
    await flush();
    expect(backSpy).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("UI 操作で閉じると積んだエントリを back() で 1 回だけ消費し、onClose は呼ばない", async () => {
    const onClose = vi.fn();
    const { rerender } = renderHook(
      ({ open }) => useBackButtonClose(open, onClose),
      { initialProps: { open: true } },
    );
    rerender({ open: false });
    await flush();
    expect(backSpy).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(window.history.state?.chordlensBackClose).toBeUndefined();
  });

  it("再度開閉しても履歴が蓄積しない", async () => {
    const { rerender } = renderHook(
      ({ open }) => useBackButtonClose(open, vi.fn()),
      { initialProps: { open: false } },
    );
    const idxLen = window.history.length;
    for (let i = 0; i < 3; i++) {
      rerender({ open: true });
      rerender({ open: false });
      await flush();
    }
    // 戻った先のエントリは前方履歴として残るが、現在位置は元の state
    expect(window.history.state).toMatchObject({ idx: 3, key: "k" });
    expect(window.history.length).toBeLessThanOrEqual(idxLen + 1);
  });

  it("アンマウント時も自分のエントリを取り除く", async () => {
    const { unmount } = renderHook(() => useBackButtonClose(true, vi.fn()));
    unmount();
    await flush();
    expect(backSpy).toHaveBeenCalledTimes(1);
  });
});
