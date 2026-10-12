import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { useAutoStopOnHidden } from "@/lib/hooks/useAutoStopOnHidden";

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("useAutoStopOnHidden", () => {
  afterEach(() => setVisibility("visible"));

  it("解析中に非表示になると 1 回だけ停止し、フラグを立てる", () => {
    const stop = vi.fn();
    const { result } = renderHook(() =>
      useAutoStopOnHidden({ isProcessing: true, stopProcessing: stop }),
    );
    expect(result.current.autoStopped).toBe(false);
    act(() => {
      setVisibility("hidden");
      // iOS では pagehide も続けて来る。二重に停止しない
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(stop).toHaveBeenCalledTimes(1);
    expect(result.current.autoStopped).toBe(true);
  });

  it("解析していなければ何もしない", () => {
    const stop = vi.fn();
    const { result } = renderHook(() =>
      useAutoStopOnHidden({ isProcessing: false, stopProcessing: stop }),
    );
    act(() => setVisibility("hidden"));
    expect(stop).not.toHaveBeenCalled();
    expect(result.current.autoStopped).toBe(false);
  });

  it("pagehide だけでも停止する (iOS)", () => {
    const stop = vi.fn();
    const { result } = renderHook(() =>
      useAutoStopOnHidden({ isProcessing: true, stopProcessing: stop }),
    );
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(stop).toHaveBeenCalledTimes(1);
    expect(result.current.autoStopped).toBe(true);
  });

  it("前面復帰しても自動再開せず、フラグも維持する。開始 (isProcessing: true) で解除", () => {
    const stop = vi.fn();
    const { result, rerender } = renderHook(
      ({ p }) => useAutoStopOnHidden({ isProcessing: p, stopProcessing: stop }),
      { initialProps: { p: true } },
    );
    act(() => setVisibility("hidden"));
    rerender({ p: false }); // 親が isProcessing=false に更新
    act(() => setVisibility("visible"));
    expect(stop).toHaveBeenCalledTimes(1);
    expect(result.current.autoStopped).toBe(true);

    rerender({ p: true }); // ユーザーが再度「解析開始」
    expect(result.current.autoStopped).toBe(false);

    // 再開後にもう一度背面へ回れば再び停止する
    act(() => setVisibility("hidden"));
    expect(stop).toHaveBeenCalledTimes(2);
  });

  it("clearAutoStopped でフラグを下ろせる", () => {
    const { result } = renderHook(() =>
      useAutoStopOnHidden({ isProcessing: true, stopProcessing: vi.fn() }),
    );
    act(() => setVisibility("hidden"));
    expect(result.current.autoStopped).toBe(true);
    act(() => result.current.clearAutoStopped());
    expect(result.current.autoStopped).toBe(false);
  });

  it("注入した lifecycle (Capacitor 想定) でも動き、アンマウントで購読解除する", () => {
    let bg: () => void = () => {};
    const unsub = vi.fn();
    const lifecycle = {
      onBackground: (cb: () => void) => {
        bg = cb;
        return unsub;
      },
      onForeground: () => () => {},
    };
    const stop = vi.fn();
    const { unmount } = renderHook(() =>
      useAutoStopOnHidden({ isProcessing: true, stopProcessing: stop, lifecycle }),
    );
    act(() => bg());
    expect(stop).toHaveBeenCalledTimes(1);
    unmount();
    expect(unsub).toHaveBeenCalled();
  });
});
