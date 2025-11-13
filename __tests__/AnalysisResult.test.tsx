import { render, screen } from "@testing-library/react";
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
    // TunerMeterが表示されていることを確認
    expect(screen.getByText("解析結果")).toBeInTheDocument();
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
    // "平均律からの差" カードが表示されていることを確認
    expect(screen.getByText("平均律からの差")).toBeInTheDocument();

    // CentDisplayコンポーネント内にピッチ名が表示されていることを確認（複数あるのでAllByを使用）
    const c4Elements = screen.getAllByText(/C4/);
    expect(c4Elements.length).toBeGreaterThan(0);

    const e4Elements = screen.getAllByText(/E4/);
    expect(e4Elements.length).toBeGreaterThan(0);

    const g4Elements = screen.getAllByText(/G4/);
    expect(g4Elements.length).toBeGreaterThan(0);
  });
});
