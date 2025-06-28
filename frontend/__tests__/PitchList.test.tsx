
import { render, screen, fireEvent } from "@testing-library/react";
import { PitchList } from "@/components/feature/PitchList";

describe("PitchList", () => {
  const removePitch = jest.fn();
  const clearPitchList = jest.fn();
  const pitchList = [
    { pitchName: "C", octaveNum: 4, isRoot: true },
    { pitchName: "E", octaveNum: 4, isRoot: false },
  ];

  it("renders a message when the pitch list is empty", () => {
    render(
      <PitchList
        currentPitchList={[]}
        removePitch={removePitch}
        clearPitchList={clearPitchList}
      />
    );
    expect(
      screen.getByText("まだ評価する音がありません。上のフォームから追加してください。")
    ).toBeInTheDocument();
  });

  it("renders the list of pitches", () => {
    render(
      <PitchList
        currentPitchList={pitchList}
        removePitch={removePitch}
        clearPitchList={clearPitchList}
      />
    );
    expect(screen.getByText("C4 (R)")).toBeInTheDocument();
    expect(screen.getByText("E4")).toBeInTheDocument();
  });

  it("calls removePitch when a pitch's remove button is clicked", () => {
    render(
      <PitchList
        currentPitchList={pitchList}
        removePitch={removePitch}
        clearPitchList={clearPitchList}
      />
    );
    fireEvent.click(screen.getAllByRole("button", { name: "" })[0]);
    expect(removePitch).toHaveBeenCalledWith(0);
  });

  it("calls clearPitchList when the clear button is clicked", () => {
    render(
      <PitchList
        currentPitchList={pitchList}
        removePitch={removePitch}
        clearPitchList={clearPitchList}
      />
    );
    fireEvent.click(screen.getByText("全てクリア"));
    expect(clearPitchList).toHaveBeenCalled();
  });
});
