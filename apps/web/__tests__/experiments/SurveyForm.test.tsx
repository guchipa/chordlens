import { render, screen, act } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import {
  FivePointField,
  FreeTextField,
} from "@/components/feature/experiments/SurveyForm";
import { fireIonChange, fireIonInput } from "../helpers/ionic";

interface HarnessValues {
  five?: number;
  text?: string;
}

function Harness() {
  const form = useForm<HarnessValues>();
  const five = form.watch("five");
  const text = form.watch("text");
  return (
    <FormProvider {...form}>
      <FivePointField name="five" label="五段階の質問" />
      <FreeTextField name="text" label="自由記述" />
      <div data-testid="five-value">{JSON.stringify(five ?? null)}</div>
      <div data-testid="text-value">{JSON.stringify(text ?? null)}</div>
    </FormProvider>
  );
}

describe("SurveyForm", () => {
  it("FivePointField: fireIonChange で RHF の値が数値になる", async () => {
    const { container } = render(<Harness />);
    await customElements.whenDefined("ion-select");
    const select = container.querySelector("ion-select");
    expect(select).not.toBeNull();

    act(() => {
      fireIonChange(select as Element, { value: "4" });
    });

    // JSON.stringify(4) === "4"、文字列 "4" なら "\"4\"" になるため数値であることを確認できる
    expect(screen.getByTestId("five-value")).toHaveTextContent("4");
    expect(screen.getByTestId("five-value").textContent).toBe("4");
  });

  it("FreeTextField: fireIonInput で文字列が RHF にセットされる", async () => {
    const { container } = render(<Harness />);
    await customElements.whenDefined("ion-input");
    const input = container.querySelector("ion-input");
    expect(input).not.toBeNull();

    act(() => {
      fireIonInput(input as Element, "自由記述のテスト");
    });

    expect(await screen.findByText('"自由記述のテスト"')).toBeInTheDocument();
  });
});
