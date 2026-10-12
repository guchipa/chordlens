import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useWakeLock } from "@/lib/hooks/useWakeLock";

function makeSentinel() {
  const listeners: Array<() => void> = [];
  return {
    release: vi.fn(async () => {
      listeners.forEach((l) => l());
    }),
    addEventListener: vi.fn((_t: string, l: () => void) => listeners.push(l)),
    listeners,
  };
}

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("useWakeLock", () => {
  let sentinels: ReturnType<typeof makeSentinel>[];
  let request: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sentinels = [];
    request = vi.fn(async () => {
      const s = makeSentinel();
      sentinels.push(s);
      return s;
    });
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: { request },
    });
  });

  afterEach(() => {
    setVisibility("visible");
    // @ts-expect-error テスト用に削除
    delete navigator.wakeLock;
  });

  it("解析開始で取得し、停止で解放する", async () => {
    const { rerender } = renderHook(({ a }) => useWakeLock(a), {
      initialProps: { a: false },
    });
    expect(request).not.toHaveBeenCalled();

    await act(async () => rerender({ a: true }));
    expect(request).toHaveBeenCalledWith("screen");

    await act(async () => rerender({ a: false }));
    expect(sentinels[0].release).toHaveBeenCalled();
  });

  it("アンマウントで解放する", async () => {
    const { unmount } = renderHook(() => useWakeLock(true));
    await act(async () => {});
    unmount();
    await act(async () => {});
    expect(sentinels[0].release).toHaveBeenCalled();
  });

  it("非表示で解放された後、可視復帰で再取得する", async () => {
    renderHook(() => useWakeLock(true));
    await act(async () => {});
    expect(request).toHaveBeenCalledTimes(1);

    // ブラウザによる自動解放
    await act(async () => {
      sentinels[0].listeners.forEach((l) => l());
      setVisibility("hidden");
    });
    expect(request).toHaveBeenCalledTimes(1);

    await act(async () => setVisibility("visible"));
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("停止後は可視復帰しても再取得しない", async () => {
    const { rerender } = renderHook(({ a }) => useWakeLock(a), {
      initialProps: { a: true },
    });
    await act(async () => {});
    await act(async () => rerender({ a: false }));
    await act(async () => setVisibility("visible"));
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("取得が拒否されても例外を投げない", async () => {
    request.mockRejectedValueOnce(new Error("NotAllowedError"));
    vi.spyOn(console, "debug").mockImplementation(() => {});
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow();
    await act(async () => {});
  });

  it("未対応ブラウザでも例外を投げない", async () => {
    // @ts-expect-error テスト用に削除
    delete navigator.wakeLock;
    const { unmount } = renderHook(() => useWakeLock(true));
    await act(async () => {});
    expect(() => unmount()).not.toThrow();
  });
});
