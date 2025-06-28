import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PitchSettingForm } from "@/components/feature/PitchSettingForm";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormSchema, formType } from "@/lib/schema";

// A self-contained wrapper for the form component to be tested
const TestFormWrapper = ({
  onSubmit,
}: {
  onSubmit: (data: formType) => void;
}) => {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      pitchName: "C",
      octaveNum: 4,
      isRoot: false,
    },
  });

  return <PitchSettingForm form={form} onSubmit={onSubmit} />;
};

describe("PitchSettingForm", () => {
  it("renders the form correctly", () => {
    render(<TestFormWrapper onSubmit={jest.fn()} />);
    expect(screen.getByText("評価する音の追加")).toBeInTheDocument();
    expect(screen.getByText("音名")).toBeInTheDocument();
    expect(screen.getByText("オクターブ")).toBeInTheDocument();
    expect(screen.getByText("根音として設定")).toBeInTheDocument();
  });

  it("submits the form with the correct data", async () => {
    const mockOnSubmit = jest.fn();
    render(<TestFormWrapper onSubmit={mockOnSubmit} />);

    // Find the submit button and click it
    const submitButton = screen.getByRole("button", {
      name: /設定した音を追加/i,
    });
    fireEvent.click(submitButton);

    // Use waitFor to handle the asynchronous submission process
    await waitFor(() => {
      // Check if the submit handler was called
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      // Check if it was called with the correct data.
      // react-hook-form's handleSubmit passes the event as the second argument.
      expect(mockOnSubmit).toHaveBeenCalledWith(
        {
          pitchName: "C",
          octaveNum: 4,
          isRoot: false,
        },
        expect.anything()
      );
    });
  });
});