// "@testing-library/jest-dom/vitest" は jest-dom 側から vitest を import するため
// pnpm workspace の厳密な node_modules 構造では解決できない。
// matchers を明示的に登録する形にして回避する。
import * as matchers from "@testing-library/jest-dom/matchers";
import { expect, vi } from "vitest";

expect.extend(matchers);

// Web Audio API と getUserMedia をモックする
(globalThis as unknown as { AudioContext: unknown }).AudioContext = vi
  .fn()
  .mockImplementation(() => {
    return {
      createAnalyser: vi.fn().mockReturnValue({
        fftSize: 2048,
        smoothingTimeConstant: 0.8,
        frequencyBinCount: 1024,
        getFloatFrequencyData: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
      }),
      createMediaStreamSource: vi.fn().mockReturnValue({
        connect: vi.fn(),
        disconnect: vi.fn(),
        mediaStream: {
          getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
        },
      }),
      close: vi.fn(),
      sampleRate: 44100,
    };
  });

if (typeof globalThis.navigator !== "undefined") {
  if (typeof globalThis.navigator.mediaDevices === "undefined") {
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      configurable: true,
      value: {},
    });
  }
  Object.defineProperty(globalThis.navigator.mediaDevices, "getUserMedia", {
    configurable: true,
    value: vi.fn().mockResolvedValue({
      getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
    }),
  });
}

(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = vi
  .fn()
  .mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
