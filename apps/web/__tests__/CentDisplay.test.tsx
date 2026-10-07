import { vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CentDisplay } from "@/components/feature/CentDisplay";
import type { Pitch } from "@chordlens/core/types";

describe("CentDisplay", () => {
  const pitchList: Pitch[] = [
    { pitchName: "C", octaveNum: 4, isRoot: true, enabled: true },
    { pitchName: "E", octaveNum: 4, isRoot: false, enabled: true },
    { pitchName: "G", octaveNum: 4, isRoot: false, enabled: true },
  ];

  // vitest.setup.ts の AudioContext モックには createOscillator/createGain/
  // destination/currentTime が無いため、このテストファイル内で差し替える
  beforeEach(() => {
    (globalThis as unknown as { AudioContext: unknown }).AudioContext = vi
      .fn()
      .mockImplementation(() => ({
        currentTime: 0,
        destination: {},
        createOscillator: vi.fn().mockReturnValue({
          connect: vi.fn(),
          frequency: { value: 0 },
          type: "sine",
          start: vi.fn(),
          stop: vi.fn(),
        }),
        createGain: vi.fn().mockReturnValue({
          connect: vi.fn(),
          gain: {
            value: 0,
            cancelScheduledValues: vi.fn(),
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
        }),
      }));
  });

  it("displays pitch names, interval names, and signed cent differences", () => {
    render(<CentDisplay pitchList={pitchList} a4Freq={442} title="平均律からの差" />);

    expect(screen.getByText("平均律からの差")).toBeInTheDocument();

    // 音名
    expect(screen.getByText("C4")).toBeInTheDocument();
    expect(screen.getByText("E4")).toBeInTheDocument();
    expect(screen.getByText("G4")).toBeInTheDocument();

    // 音程名（根音・長3度・完全5度）
    expect(screen.getByText("根音")).toBeInTheDocument();
    expect(screen.getByText("長3度")).toBeInTheDocument();
    expect(screen.getByText("完全5度")).toBeInTheDocument();

    // セント差が符号付きで表示されている（+ または - で始まる）
    const centPattern = /^[+-]\d+\.\d{2}$/;
    const centTexts = screen
      .getAllByText(centPattern)
      .map((el) => el.textContent);
    expect(centTexts.length).toBe(3);
  });

  it("creates an AudioContext oscillator when the equal temperament play button is clicked", () => {
    render(<CentDisplay pitchList={pitchList} a4Freq={442} title="平均律からの差" />);

    const playButtons = screen.getAllByLabelText("平均律を再生/停止");
    fireEvent.click(playButtons[0]);

    const AudioContextMock = (globalThis as unknown as { AudioContext: ReturnType<typeof vi.fn> })
      .AudioContext;
    expect(AudioContextMock).toHaveBeenCalled();

    const instance = AudioContextMock.mock.results[0].value;
    expect(instance.createOscillator).toHaveBeenCalled();
    expect(instance.createGain).toHaveBeenCalled();
  });
});
