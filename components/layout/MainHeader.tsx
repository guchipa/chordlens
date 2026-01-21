export function MainHeader() {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-extrabold text-gray-800 sm:text-4xl">
        和音チューナー
      </h1>
      <h2 className="mt-2 max-w-2xl text-base text-gray-600 sm:text-lg">
        マイクから音声を入力し、設定した和音の純正律からの音程のズレをリアルタイムで解析します。
      </h2>
    </div>
  );
}
