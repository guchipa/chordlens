/**
 * AppLifecycle - アプリのフォアグラウンド/バックグラウンド遷移のプラットフォーム非依存抽象
 *
 * 解析中にアプリが背面へ回ったとき、マイクを開いたままにしない (バッテリー・マイク使用表示) ために使う。
 * 各コールバックは遷移のたびに呼ばれる。同じ遷移が複数のイベントから重複して通知されてもよい
 * (利用側は冪等に扱うこと)。購読解除関数を返す。
 *
 * 実装例:
 * - Web:       visibilitychange / pagehide / pageshow (apps/web/lib/appLifecycle.ts)
 * - Capacitor: @capacitor/app の appStateChange (isActive) / pause・resume
 * - React Native: AppState.addEventListener("change", ...)
 * - テスト:     コールバックを手動で呼べるモック
 */
export interface AppLifecycle {
  /** アプリが背面へ回った (タブ非表示・アプリ切替・画面消灯) */
  onBackground(callback: () => void): () => void;
  /** アプリが前面へ戻った */
  onForeground(callback: () => void): () => void;
}
