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
    const { container } = render(
      <TunerMeter analysisData={analysisData} title="Tuner" />
    );
    expect(container).toMatchSnapshot();
  });

  it("renders correctly when in tune", () => {
    const analysisData = [
      {
        pitch: { pitchName: "C", octaveNum: 4, isRoot: false },
        deviation: 0.0,
      },
    ];
    const { container } = render(
      <TunerMeter analysisData={analysisData} title="Tuner" />
    );
    expect(container).toMatchSnapshot();
  });

  it("renders correctly when out of tune", () => {
    const analysisData = [
      {
        pitch: { pitchName: "G#", octaveNum: 3, isRoot: false },
        deviation: -0.5,
      },
    ];
    const { container } = render(
      <TunerMeter analysisData={analysisData} title="Tuner" />
    );
    expect(container).toMatchSnapshot();
  });
});
