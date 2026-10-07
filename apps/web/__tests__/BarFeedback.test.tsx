import { render, screen } from "@testing-library/react";
import { BarFeedback } from "@/components/feedback/BarFeedback";

describe("BarFeedback", () => {
  it("shows a not-detected message when deviation is null", () => {
    render(<BarFeedback pitchName="C4" deviation={null} />);

    expect(screen.getByText("音を検出していません")).toBeInTheDocument();
    expect(screen.getByText("--")).toBeInTheDocument();
  });

  it("shows a checkmark when deviation is 0 (in tune)", () => {
    render(<BarFeedback pitchName="C4" deviation={0} />);

    expect(screen.getByText("✓")).toBeInTheDocument();
    expect(
      screen.queryByText("音を検出していません")
    ).not.toBeInTheDocument();
  });
});
