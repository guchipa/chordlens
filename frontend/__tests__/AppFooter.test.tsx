
import { render, screen } from "@testing-library/react";
import { AppFooter } from "@/components/AppFooter";

describe("AppFooter", () => {
  it("renders correctly", () => {
    const { container } = render(<AppFooter />);
    expect(container).toMatchSnapshot();
  });

  it("displays the current year", () => {
    render(<AppFooter />);
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(`© ${currentYear} ChordLens`)).toBeInTheDocument();
  });

  it("has a link to the GitHub repository", () => {
    render(<AppFooter />);
    const link = screen.getByRole("link", { name: /github repository/i });
    expect(link).toHaveAttribute("href", "https://github.com/guchipa/chordlens");
    expect(link).toHaveAttribute("target", "_blank");
  });
});
