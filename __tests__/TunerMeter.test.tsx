
import { render, screen } from "@testing-library/react";
import { TunerMeter } from "@/components/TunerMeter";

describe("TunerMeter", () => {
  it("renders correctly with no deviation", () => {
    const { container } = render(
      <TunerMeter deviation={null} pitchName="A4" />
    );
    expect(container).toMatchSnapshot();
    expect(screen.getByText("A4")).toBeInTheDocument();
    expect(screen.getByText("--.--%")).toBeInTheDocument();
    expect(screen.getByText("No Sound")).toBeInTheDocument();
  });

  it("renders correctly when in tune", () => {
    const { container } = render(
      <TunerMeter deviation={0.05} pitchName="C4" />
    );
    expect(container).toMatchSnapshot();
    expect(screen.getByText("C4")).toBeInTheDocument();
    expect(screen.getByText("+5.00%")).toBeInTheDocument();
    expect(screen.getByText("In Tune")).toBeInTheDocument();
  });

  it("renders correctly when out of tune", () => {
    const { container } = render(
      <TunerMeter deviation={-0.5} pitchName="G#3" />
    );
    expect(container).toMatchSnapshot();
    expect(screen.getByText("G#3")).toBeInTheDocument();
    expect(screen.getByText("-50.00%")).toBeInTheDocument();
    expect(screen.getByText("Out of Tune")).toBeInTheDocument();
  });
});
