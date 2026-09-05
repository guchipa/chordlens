import { vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { PitchSettingForm } from "@/components/feature/PitchSettingForm";
import { pitchListAtom } from "@/lib/store/pitchListAtoms";
import type { Pitch } from "@chordlens/core/types";
import { fireIonChange } from "./helpers/ionic";

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

  it("renders the form correctly", async () => {
    const { container } = renderWithJotai();
    expect(screen.getByText("評価する音の追加")).toBeInTheDocument();

    // IonSelect の label prop は Stencil のシャドウ DOM 内に描画され、
    // jsdom では light DOM のテキストとして拾えないため、
    // アップグレード後の label プロパティを直接検証する
    await customElements.whenDefined("ion-select");
    const selects = container.querySelectorAll("ion-select");
    expect((selects[0] as unknown as { label: string }).label).toBe("音名");
    expect((selects[1] as unknown as { label: string }).label).toBe(
      "オクターブ"
    );

    expect(screen.getByText("根音として設定")).toBeInTheDocument();
  });

  it("submits the form with the correct data", async () => {
    const { store, container } = renderWithJotai();

    // 音名を選択 (ion-select は 1 つ目が音名、2 つ目がオクターブ)
    await customElements.whenDefined("ion-select");
    const pitchNameSelect = container.querySelectorAll("ion-select")[0];
    fireIonChange(pitchNameSelect, { value: "C" });

    // 送信 (IonButton type="submit" は jsdom で form submit を起こさないため
    // form 要素へ直接 submit イベントを発火する)
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

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
    // Radix Select の操作を含み並列実行時に 5s の既定タイムアウトを超えることがある
  }, 15000);
});