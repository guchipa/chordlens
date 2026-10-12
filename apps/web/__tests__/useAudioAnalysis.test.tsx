import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

let resolveInit: (ok: boolean) => void = () => {};
const initialize = vi.fn(() => new Promise<boolean>((r) => (resolveInit = r)));
const cleanup = vi.fn();
const startLoop = vi.fn();

vi.mock("@/lib/hooks/audio/useAudioContext", () => ({
  useAudioContext: () => ({
    nodesRef: { current: null },
    spectrumDataRef: { current: null },
    freqBinsRef: { current: null },
    initialize,
    cleanup,
    updateSettings: vi.fn(),
  }),
}));
vi.mock("@/lib/hooks/audio/useSpectrumAnalysis", () => ({
  useSpectrumAnalysis: () => ({
    analysisResult: null,
    centDeviations: [],
    peakSearchDebug: null,
    comparisonResults: null,
    startLoop,
    stopLoop: vi.fn(),
    clearResults: vi.fn(),
  }),
}));

import { useAudioAnalysis } from "@/lib/hooks/useAudioAnalysis";
import type { UseAudioAnalysisProps } from "@chordlens/core/types";

const props = { currentPitchList: [] } as unknown as UseAudioAnalysisProps;

describe("useAudioAnalysis", () => {
  it("初期化中に停止されたら、初期化完了後も開始せずマイクを解放する", async () => {
    const { result } = renderHook(() => useAudioAnalysis(props));
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.startProcessing();
    });
    expect(result.current.isStarting).toBe(true);

    act(() => result.current.stopProcessing());
    cleanup.mockClear();
    await act(async () => {
      resolveInit(true);
      await pending;
    });

    expect(result.current.isStarting).toBe(false);
    expect(result.current.isProcessing).toBe(false);
    expect(startLoop).not.toHaveBeenCalled();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
