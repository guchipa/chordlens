import { render, screen } from "@testing-library/react";
import { AlgorithmComparisonPanel } from "@/components/feature/AlgorithmComparisonPanel";
import type { AlgorithmComparisonEntry } from "@chordlens/core/types";

describe("AlgorithmComparisonPanel", () => {
  const entries: AlgorithmComparisonEntry[] = [
    {
      pitch: { pitchName: "C", octaveNum: 4, enabled: true, isRoot: true },
      fftCentDeviation: 1.2,
      swipeCentDeviation: -3.4,
      phaseVocoderCentDeviation: null,
    },
    {
      pitch: { pitchName: "E", octaveNum: 4, enabled: true, isRoot: false },
      fftCentDeviation: null,
      swipeCentDeviation: null,
      phaseVocoderCentDeviation: null,
    },
  ];

  it("renders pitch names and formatted cent deviations", () => {
    render(<AlgorithmComparisonPanel entries={entries} />);

    expect(screen.getByText("C4")).toBeInTheDocument();
    expect(screen.getByText("E4")).toBeInTheDocument();

    expect(screen.getByText("+1.2")).toBeInTheDocument();
    expect(screen.getByText("-3.4")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(4);
  });
});
