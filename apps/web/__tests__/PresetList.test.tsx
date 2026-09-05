import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { PresetList } from "@/components/feature/PresetList";
import type { PitchPreset } from "@chordlens/core/types";

describe("PresetList", () => {
  const mockPresets: PitchPreset[] = [
    {
      id: "1",
      name: "Cメジャートライアド",
      pitchList: [
        { pitchName: "C", octaveNum: 4, enabled: true, isRoot: true },
        { pitchName: "E", octaveNum: 4, enabled: true, isRoot: false },
        { pitchName: "G", octaveNum: 4, enabled: true, isRoot: false },
      ],
      createdAt: Date.now(),
    },
  ];

  it("プリセットが無いとき空状態を表示する", () => {
    render(<PresetList presets={[]} onLoad={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("プリセットがありません")).toBeInTheDocument();
    expect(
      screen.getByText(
        "構成音を登録して「プリセット保存」ボタンをクリックしてください"
      )
    ).toBeInTheDocument();
  });

  it("プリセット一覧と操作ボタンを表示する", async () => {
    render(
      <PresetList presets={mockPresets} onLoad={vi.fn()} onDelete={vi.fn()} />
    );

    expect(screen.getByText("Cメジャートライアド")).toBeInTheDocument();
    expect(screen.getByText(/3音/)).toBeInTheDocument();
    expect(screen.getByText("読み込み")).toBeInTheDocument();

    // Stencil のカスタム要素は非同期にアップグレードされるため待つ
    await customElements.whenDefined("ion-button");
    const deleteButton = screen.getByLabelText("削除");
    expect(deleteButton.closest("ion-button")).not.toBeNull();
  });

  it("削除・読み込み確認の IonAlert が閉じた状態で描画される", async () => {
    // jsdom で IonAlert の isOpen を true にすると overlay 実装が
    // "framework delegate is missing" の未処理 Promise 拒否を起こし
    // テストランナー全体が落ちるため、閉じた状態の描画のみ確認する
    render(
      <PresetList presets={mockPresets} onLoad={vi.fn()} onDelete={vi.fn()} />
    );

    await customElements.whenDefined("ion-alert");
    const alerts = document.body.querySelectorAll("ion-alert");
    expect(alerts.length).toBe(2);
  });
});
