import { vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { PitchSettingForm } from "@/components/feature/PitchSettingForm";
import { pitchListAtom } from "@/lib/store/pitchListAtoms";
import type { Pitch } from "@chordlens/core/types";

// AudioContext のモック
const mockAudioContext = {
  createAnalyser: vi.fn(() => ({
    fftSize: 2048,
    frequencyBinCount: 1024,
    getFloatTimeDomainData: vi.fn(),
  })),
  createMediaStreamSource: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  sampleRate: 44100,
  close: vi.fn(),
};

// navigator.mediaDevices のモック
Object.defineProperty(navigator, "mediaDevices", {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
    }),
  },
  writable: true,
});

// AudioContext のモック
(global as unknown as { AudioContext: unknown }).AudioContext = vi.fn(
  () => mockAudioContext
);

describe("PitchSettingForm", () => {
  // Jotai storeをセットアップするヘルパー関数
  const renderWithJotai = (initialPitchList: Pitch[] = []) => {
    const store = createStore();
    store.set(pitchListAtom, initialPitchList);
    return {
      store,
      ...render(
        <Provider store={store}>
          <PitchSettingForm />
        </Provider>
      ),
    };
  };

  it("renders the form correctly", () => {
    renderWithJotai();
    expect(screen.getByText("評価する音の追加")).toBeInTheDocument();
    expect(screen.getByText("音名")).toBeInTheDocument();
    expect(screen.getByText("オクターブ")).toBeInTheDocument();
    expect(screen.getByText("根音として設定")).toBeInTheDocument();
  });

  it("submits the form with the correct data", async () => {
    const { store } = renderWithJotai();

    // 音名をワンタップで選択
    const cButton = screen.getByRole("button", { name: "C" });
    fireEvent.click(cButton);
    expect(cButton).toHaveAttribute("aria-pressed", "true");

    // 送信ボタンをクリック
    const submitButton = screen.getByRole("button", {
      name: /設定した音を追加/i,
    });
    fireEvent.click(submitButton);

    // Use waitFor to handle the asynchronous submission process
    await waitFor(() => {
      // Jotai storeに追加されていることを確認
      const pitchList = store.get(pitchListAtom);
      expect(pitchList.length).toBeGreaterThan(0);

      // 追加された音を確認
      const addedPitch = pitchList.find(
        (p) => p.pitchName === "C" && p.octaveNum === 4
      );
      expect(addedPitch).toBeDefined();
      expect(addedPitch?.enabled).toBe(true);
    });
  });

  it("changes the octave via the segmented control", async () => {
    const { store } = renderWithJotai();
    fireEvent.click(screen.getByRole("button", { name: "A" }));
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    fireEvent.click(screen.getByRole("button", { name: /設定した音を追加/ }));
    await waitFor(() => {
      expect(
        store.get(pitchListAtom).find(
          (p) => p.pitchName === "A" && p.octaveNum === 3
        )
      ).toBeDefined();
    });
  });

  it("disables submit until a note name is chosen", () => {
    renderWithJotai();
    expect(
      screen.getByRole("button", { name: /設定した音を追加/ })
    ).toBeDisabled();
  });
});