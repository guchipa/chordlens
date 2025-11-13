import { render, screen } from "@testing-library/react";
import { TunerMeter } from "@/components/TunerMeter";

describe("TunerMeter", () => {
  it("renders correctly with no deviation", () => {
    const analysisData = [
      {
        pitch: { pitchName: "A", octaveNum: 4, isRoot: false },
        deviation: null,
      },
    ];
    render(<TunerMeter analysisData={analysisData} title="Tuner" />);

    // タイトルが表示されている
    expect(screen.getByText("Tuner")).toBeInTheDocument();

    // ピッチ名が表示されている
    expect(screen.getByText(/A4/)).toBeInTheDocument();
  });

  it("renders correctly when in tune", () => {
    const analysisData = [
      {
        pitch: { pitchName: "C", octaveNum: 4, isRoot: false },
        deviation: 0.0,
      },
    ];
    render(<TunerMeter analysisData={analysisData} title="Tuner" />);

    // タイトルが表示されている
    expect(screen.getByText("Tuner")).toBeInTheDocument();

    // ピッチ名が表示されている
    expect(screen.getByText(/C4/)).toBeInTheDocument();
  });

  it("renders correctly when out of tune", () => {
    const analysisData = [
      {
        pitch: { pitchName: "G#", octaveNum: 3, isRoot: false },
        deviation: -0.5,
      },
    ];
    render(<TunerMeter analysisData={analysisData} title="Tuner" />);

    // タイトルが表示されている
    expect(screen.getByText("Tuner")).toBeInTheDocument();

    // ピッチ名が表示されている
    expect(screen.getByText(/G#3/)).toBeInTheDocument();
  });

  it("renders multiple pitches correctly", () => {
    const analysisData = [
      {
        pitch: { pitchName: "C", octaveNum: 4, isRoot: true },
        deviation: 0.0,
      },
      {
        pitch: { pitchName: "E", octaveNum: 4, isRoot: false },
        deviation: -0.2,
      },
      {
        pitch: { pitchName: "G", octaveNum: 4, isRoot: false },
        deviation: 0.1,
      },
    ];
    render(<TunerMeter analysisData={analysisData} title="Chord Tuner" />);

    // タイトルが表示されている
    expect(screen.getByText("Chord Tuner")).toBeInTheDocument();

    // 各ピッチ名が表示されている
    const c4Elements = screen.getAllByText(/C4/);
    expect(c4Elements.length).toBeGreaterThan(0);

    const e4Elements = screen.getAllByText(/E4/);
    expect(e4Elements.length).toBeGreaterThan(0);

    const g4Elements = screen.getAllByText(/G4/);
    expect(g4Elements.length).toBeGreaterThan(0);
  });
});
