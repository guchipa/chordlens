import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { PitchSettingForm } from "@/components/feature/PitchSettingForm";
import { pitchListAtom } from "@/lib/store/pitchListAtoms";
import type { Pitch } from "@/lib/types";

// AudioContext のモック
const mockAudioContext = {
  createAnalyser: jest.fn(() => ({
    fftSize: 2048,
    frequencyBinCount: 1024,
    getFloatTimeDomainData: jest.fn(),
  })),
  createMediaStreamSource: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
  sampleRate: 44100,
  close: jest.fn(),
};

// navigator.mediaDevices のモック
Object.defineProperty(navigator, "mediaDevices", {
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
    }),
  },
  writable: true,
});

// AudioContext のモック
(global as unknown as { AudioContext: unknown }).AudioContext = jest.fn(
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

    // 音名を選択
    const pitchNameSelect = screen.getAllByRole("combobox")[0];
    fireEvent.click(pitchNameSelect);

    await waitFor(() => {
      const cOption = screen.getByRole("option", { name: "C" });
      fireEvent.click(cOption);
    });

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
});