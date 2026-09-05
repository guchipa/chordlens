import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  IonButton,
  IonToggle,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonModal,
} from "@ionic/react";

import { fireIonChange, fireIonInput } from "./helpers/ionic";

describe("Ionic React 基盤 (jsdom 上での挙動確認)", () => {
  it("IonButton: テキストで取得でき、クリックで onClick が呼ばれ、disabled が検出できる", async () => {
    const handleClick = vi.fn();
    render(<IonButton onClick={handleClick}>クリック</IonButton>);

    const button = screen.getByText("クリック");
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);

    const { container } = render(<IonButton disabled>無効ボタン</IonButton>);
    // Stencil のカスタム要素は非同期にアップグレードされるため、
    // customElements.whenDefined を待ってから disabled 属性の反映を確認する
    await customElements.whenDefined("ion-button");
    const disabledButton = container.querySelector("ion-button");
    expect(disabledButton).toHaveAttribute("disabled");
  });

  it("IonToggle: fireIonChange で onIonChange が発火する", async () => {
    const handleChange = vi.fn();
    const { container } = render(
      <IonToggle aria-label="トグル" onIonChange={handleChange} />,
    );

    await customElements.whenDefined("ion-toggle");
    const toggle = container.querySelector("ion-toggle");
    expect(toggle).not.toBeNull();
    fireIonChange(toggle as Element, { checked: true });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange.mock.calls[0][0].detail).toEqual({ checked: true });
  });

  it("IonSelect: fireIonChange で onIonChange が発火し detail.value が取得できる", async () => {
    const handleChange = vi.fn();
    const { container } = render(
      <IonSelect aria-label="選択" onIonChange={handleChange}>
        <IonSelectOption value="C">C</IonSelectOption>
        <IonSelectOption value="D">D</IonSelectOption>
      </IonSelect>,
    );

    await customElements.whenDefined("ion-select");
    const select = container.querySelector("ion-select");
    expect(select).not.toBeNull();
    fireIonChange(select as Element, { value: "C" });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange.mock.calls[0][0].detail.value).toBe("C");
  });

  it("IonInput: fireIonInput で onIonInput が発火する", async () => {
    const handleInput = vi.fn();
    const { container } = render(
      <IonInput aria-label="入力" onIonInput={handleInput} />,
    );

    await customElements.whenDefined("ion-input");
    const input = container.querySelector("ion-input");
    expect(input).not.toBeNull();
    fireIonInput(input as Element, "442");

    expect(handleInput).toHaveBeenCalledTimes(1);
    expect(handleInput.mock.calls[0][0].detail.value).toBe("442");
  });

  it("IonModal: 中身が DOM に出る (ただし document.body 直下にポータルされる)", async () => {
    // @ionic/react の IonModal (createInlineOverlayComponent) は
    // `document.querySelector('ion-app') || document.body` を portalTarget として、
    // 実際の <ion-modal> 要素をそこへ React Portal で描画する。
    // つまり render() が返す container (RTL がテスト用に作る div) の "外" に
    // 出てしまうため、container.querySelector("ion-modal") では絶対に見つからない。
    // 探す場合は document.body を対象にするか screen (= document 全体を検索) を使う。
    //
    // 注意: isOpen={true} で描画すると @ionic/core 側の overlay 実装が
    // present() を内部的に (Watch デコレータ経由で) fire-and-forget 実行し、
    // "framework delegate is missing" という Unhandled Rejection を発生させる
    // (jsdom 上で controller 系のオーバーレイ実装が要求する delegate が
    // 用意できないため)。これは呼び出し元から Promise を捕まえられず
    // テスト側で catch できないため、jsdom でのユニットテストでは
    // isOpen={true} を避け、keepContentsMounted と isOpen={false} の組み合わせで
    // 「中身が DOM に存在すること」だけを検証する回避策を取る。
    // 実際の開閉アニメーションや ionModalDidPresent 等のライフサイクルは
    // ブラウザでの動作確認や E2E に委ねる。
    render(
      <IonModal isOpen={false} keepContentsMounted={true}>
        <div>モーダルの中身</div>
      </IonModal>,
    );

    await customElements.whenDefined("ion-modal");
    const modal = document.body.querySelector("ion-modal");
    expect(modal).not.toBeNull();
    const content = screen.queryByText("モーダルの中身");
    expect(content).not.toBeNull();
  });
});
