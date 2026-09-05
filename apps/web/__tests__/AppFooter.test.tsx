
import { render, screen } from "@testing-library/react";
import { AppFooter } from "@/components/layout/AppFooter";

describe("AppFooter", () => {
  it("displays the current year", () => {
    render(<AppFooter />);
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(`© ${currentYear} Hinata Moriguchi`)).toBeInTheDocument();
  });

  it("has a link to the GitHub repository with the expected attributes", () => {
    render(<AppFooter />);
    const link = screen.getByRole("link", { name: /github repository/i });
    expect(link).toHaveAttribute("href", "https://github.com/guchipa/chordlens");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("exposes an accessible name for the GitHub link", () => {
    render(<AppFooter />);
    expect(
      screen.getByRole("link", { name: "GitHub Repository" })
    ).toBeInTheDocument();
  });
});
