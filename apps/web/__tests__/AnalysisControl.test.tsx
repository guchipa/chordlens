import { vi } from "vitest";

import { render, screen, fireEvent } from "@testing-library/react";
import { AnalysisControl } from "@/components/feature/AnalysisControl";

describe("AnalysisControl", () => {
  const startProcessing = vi.fn();
  const stopProcessing = vi.fn();

  it("renders correctly when not processing", () => {
    render(
      <AnalysisControl
        isProcessing={false}
        startProcessing={startProcessing}
        stopProcessing={stopProcessing}
        isPitchListEmpty={false}
      />
    );
    expect(screen.getByText("解析開始")).toBeInTheDocument();
  });

  it("renders correctly when processing", () => {
    render(
      <AnalysisControl
        isProcessing={true}
        startProcessing={startProcessing}
        stopProcessing={stopProcessing}
        isPitchListEmpty={false}
      />
    );
    expect(screen.getByText("解析停止")).toBeInTheDocument();
  });

  it("calls startProcessing when the button is clicked", () => {
    render(
      <AnalysisControl
        isProcessing={false}
        startProcessing={startProcessing}
        stopProcessing={stopProcessing}
        isPitchListEmpty={false}
      />
    );
    fireEvent.click(screen.getByText("解析開始"));
    expect(startProcessing).toHaveBeenCalled();
  });

  it("calls stopProcessing when the button is clicked", () => {
    render(
      <AnalysisControl
        isProcessing={true}
        startProcessing={startProcessing}
        stopProcessing={stopProcessing}
        isPitchListEmpty={false}
      />
    );
    fireEvent.click(screen.getByText("解析停止"));
    expect(stopProcessing).toHaveBeenCalled();
  });

  it("disables the button when the pitch list is empty and not processing", async () => {
    const { container } = render(
      <AnalysisControl
        isProcessing={false}
        startProcessing={startProcessing}
        stopProcessing={stopProcessing}
        isPitchListEmpty={true}
      />
    );
    // Stencil のカスタム要素は非同期にアップグレードされるため、
    // customElements.whenDefined を待ってから disabled 属性の反映を確認する
    await customElements.whenDefined("ion-button");
    const button = container.querySelector("ion-button");
    expect(button).toHaveAttribute("disabled");
  });
});
