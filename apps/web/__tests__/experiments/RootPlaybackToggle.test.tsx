import { vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RootPlaybackToggle } from "@/components/feature/experiments/RootPlaybackToggle";

describe("RootPlaybackToggle", () => {
  beforeEach(() => {
    // vitest.setup.ts の AudioContext モックには createOscillator / createGain が
    // 無いため、このコンポーネントのテストに必要な分だけここで補う。
    const gainNode = {
      gain: {
        value: 0,
        cancelScheduledValues: vi.fn(),
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
    const oscillatorNode = {
      type: "sine",
      frequency: {
        value: 0,
        setValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    (globalThis as unknown as { AudioContext: unknown }).AudioContext = vi
      .fn()
      .mockImplementation(() => ({
        state: "running",
        currentTime: 0,
        destination: {},
        resume: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        createOscillator: vi.fn().mockReturnValue(oscillatorNode),
        createGain: vi.fn().mockReturnValue(gainNode),
      }));
  });

  it("初期表示は「▶ 再生」を含み、クリックで「■ 停止」に変わる", () => {
    render(<RootPlaybackToggle frequencyHz={440} label="根音" />);

    expect(screen.getByText(/▶ 再生/)).toBeInTheDocument();

    const button = screen.getByText(/▶ 再生/);
    fireEvent.click(button);

    expect(screen.getByText(/■ 停止/)).toBeInTheDocument();
  });
});
