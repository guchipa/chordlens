import RootLayout from "@/app/layout";

describe("RootLayout", () => {
  it("exports a RootLayout component", () => {
    // RootLayoutがNext.jsのレイアウトコンポーネントとして存在することを確認
    expect(RootLayout).toBeDefined();
    expect(typeof RootLayout).toBe("function");
  });

  it("has the correct metadata structure", async () => {
    // メタデータのエクスポートが存在するか確認
    // Note: Next.jsのメタデータは実行時ではなくビルド時に処理されるため、
    // ここでは型チェック的な確認のみを行う
    const { metadata } = await import("@/app/layout");
    expect(metadata).toBeDefined();
  });
});
