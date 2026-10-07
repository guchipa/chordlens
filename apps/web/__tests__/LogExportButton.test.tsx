import { vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LogExportButton } from "@/components/feature/LogExportButton";

describe("LogExportButton", () => {
  const onStartRecording = vi.fn();
  const onStopRecording = vi.fn();
  const onClearLog = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows 停止中 and 記録開始 when not recording", () => {
    render(
      <LogExportButton
        isRecording={false}
        entryCount={0}
        session={null}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
        onClearLog={onClearLog}
      />
    );

    expect(screen.getByText("停止中")).toBeInTheDocument();
    expect(screen.getByText("記録開始")).toBeInTheDocument();
  });

  it("shows 記録中 and 記録停止 when recording", () => {
    render(
      <LogExportButton
        isRecording={true}
        entryCount={3}
        session={null}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
        onClearLog={onClearLog}
      />
    );

    expect(screen.getByText("記録中")).toBeInTheDocument();
    expect(screen.getByText("記録停止")).toBeInTheDocument();
  });

  it("disables CSV export and clear buttons when entry count is 0", async () => {
    render(
      <LogExportButton
        isRecording={false}
        entryCount={0}
        session={null}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
        onClearLog={onClearLog}
      />
    );

    // Stencil のカスタム要素は非同期にアップグレードされるため、
    // customElements.whenDefined を待ってから disabled 属性の反映を確認する
    await customElements.whenDefined("ion-button");

    await waitFor(() => {
      const exportButton = screen.getByText("CSVエクスポート").closest("ion-button");
      expect(exportButton).toHaveAttribute("disabled");
    });

    await waitFor(() => {
      const clearButton = screen.getByText("ログクリア").closest("ion-button");
      expect(clearButton).toHaveAttribute("disabled");
    });
  });

  it("calls onStartRecording when 記録開始 is clicked", () => {
    render(
      <LogExportButton
        isRecording={false}
        entryCount={0}
        session={null}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
        onClearLog={onClearLog}
      />
    );

    fireEvent.click(screen.getByText("記録開始"));
    expect(onStartRecording).toHaveBeenCalled();
  });
});
