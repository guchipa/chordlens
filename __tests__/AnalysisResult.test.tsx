
import { render, screen, within } from "@testing-library/react";
import { AnalysisResult } from "@/components/feature/AnalysisResult";

describe("AnalysisResult", () => {
  const pitchList = [
    { pitchName: "C", octaveNum: 4, isRoot: true },
    { pitchName: "E", octaveNum: 4, isRoot: false },
    { pitchName: "G", octaveNum: 4, isRoot: false },
  ];

  it("renders a message when the pitch list is empty and not processing", () => {
    render(
      <AnalysisResult
        isProcessing={false}
        analysisResult={null}
        currentPitchList={[]}
        evalRangeCents={50}
        a4Freq={440}
      />
    );
    expect(
      screen.getByText("評価する音を追加して、解析を開始してください。")
    ).toBeInTheDocument();
  });

  it("renders tuner meters for each pitch in the list", () => {
    render(
      <AnalysisResult
        isProcessing={true}
        analysisResult={[0.1, -0.2, 0.05]}
        currentPitchList={pitchList}
        evalRangeCents={50}
        a4Freq={440}
      />
    );
    // TunerMeterのタイトルはtext-3xlクラスを持つ
    const titles = screen
      .getAllByText(/C4|E4|G4/)
      .filter((el) => el.classList.contains("text-3xl"));
    expect(titles).toHaveLength(3);
    expect(titles[0]).toHaveTextContent("C4");
    expect(titles[1]).toHaveTextContent("E4");
    expect(titles[2]).toHaveTextContent("G4");
  });

  it("renders detailed results when analysis is complete", () => {
    render(
      <AnalysisResult
        isProcessing={false}
        analysisResult={[0.01, -0.5, 0.2]}
        currentPitchList={pitchList}
        evalRangeCents={50}
        a4Freq={440}
      />
    );
    const detailedResultsCard = screen
      .getByText("平均律からの差")
      .closest('div[data-slot="card"]');
    expect(detailedResultsCard).toBeInTheDocument();
    if (!detailedResultsCard) throw new Error("Card not found");

    const withinCard = within(detailedResultsCard as HTMLElement);
    // "平均律からの差" カードの中に各ピッチの差分が表示されていることを確認
    expect(withinCard.getByText("0.00")).toBeInTheDocument();
    expect(withinCard.getByText("-13.69")).toBeInTheDocument();
    expect(withinCard.getByText("1.96")).toBeInTheDocument();
  });
});
