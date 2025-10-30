import { render, screen } from "@testing-library/react";
import { PresetManager } from "@/components/feature/PresetManager";
import { formType } from "@/lib/schema";

// localStorageのモック
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("PresetManager", () => {
  const mockPitchList: formType[] = [
    { pitchName: "C", octaveNum: 4, isRoot: true },
    { pitchName: "E", octaveNum: 4, isRoot: false },
    { pitchName: "G", octaveNum: 4, isRoot: false },
  ];

  const mockOnLoadPreset = jest.fn();

  beforeEach(() => {
    localStorageMock.clear();
    mockOnLoadPreset.mockClear();
  });

  it("renders preset manager card", () => {
    render(
      <PresetManager
        pitchList={mockPitchList}
        onLoadPreset={mockOnLoadPreset}
      />
    );

    expect(screen.getByText("プリセット")).toBeDefined();
    expect(
      screen.getByText("構成音リストを保存・読み込みできます")
    ).toBeDefined();
  });

  it("shows save button", () => {
    render(
      <PresetManager
        pitchList={mockPitchList}
        onLoadPreset={mockOnLoadPreset}
      />
    );

    const saveButton = screen.getByRole("button", { name: /保存/i });
    expect(saveButton).toBeDefined();
    expect(saveButton.hasAttribute("disabled")).toBe(false);
  });

  it("disables save button when pitch list is empty", () => {
    render(<PresetManager pitchList={[]} onLoadPreset={mockOnLoadPreset} />);

    const saveButton = screen.getByRole("button", { name: /保存/i });
    expect(saveButton.hasAttribute("disabled")).toBe(true);
  });

  it("shows empty state when no presets exist", () => {
    render(
      <PresetManager
        pitchList={mockPitchList}
        onLoadPreset={mockOnLoadPreset}
      />
    );

    expect(screen.getByText("プリセットがありません")).toBeDefined();
  });
});
