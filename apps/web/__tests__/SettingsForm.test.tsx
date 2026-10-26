import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { afterEach, describe, expect, it } from "vitest";
import { SettingsForm } from "@/components/feature/SettingsForm";
import { inTuneCentsAtom } from "@/lib/store";

describe("SettingsForm: ピッチの正解幅", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  const renderWithStore = () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <SettingsForm />
      </Provider>
    );
    return store;
  };

  it("既定は 2.5 セントで、±ボタンで 0.5 セントずつ変える", () => {
    const store = renderWithStore();
    const input = screen.getByLabelText("ピッチの正解幅 (セント)") as HTMLInputElement;
    expect(input.value).toBe("2.5");
    fireEvent.click(screen.getByRole("button", { name: "正解幅を広げる" }));
    expect(store.get(inTuneCentsAtom)).toBe(3);
    fireEvent.click(screen.getByRole("button", { name: "正解幅を狭める" }));
    fireEvent.click(screen.getByRole("button", { name: "正解幅を狭める" }));
    expect(store.get(inTuneCentsAtom)).toBe(2);
  });

  it("入力は確定時に範囲内へ収め、0.5 刻みに丸める", () => {
    const store = renderWithStore();
    const input = screen.getByLabelText("ピッチの正解幅 (セント)") as HTMLInputElement;

    // 入力途中は反映しない
    fireEvent.change(input, { target: { value: "0.7" } });
    expect(store.get(inTuneCentsAtom)).toBe(2.5);
    fireEvent.blur(input);
    expect(store.get(inTuneCentsAtom)).toBe(0.5);

    fireEvent.change(input, { target: { value: "25" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(store.get(inTuneCentsAtom)).toBe(10);
    expect(input.value).toBe("10");
  });
});
