/**
 * ScreenWakeLock - 画面スリープ抑止のプラットフォーム非依存抽象
 *
 * 演奏中に画面が消灯・ロックされないようにする。失敗はすべて握りつぶしてよい
 * (未対応環境・権限拒否・低電力モードでも、チューナー本体の動作に影響させない)。
 *
 * 実装例:
 * - Web:       Screen Wake Lock API (apps/web/lib/screenWakeLock.ts)。
 *              タブ非表示で解放されるため、復帰時の再取得は実装側が担う
 * - Capacitor: @capacitor-community/keep-awake
 * - React Native: expo-keep-awake
 * - テスト:     呼び出し回数を数えるモック
 */
export interface ScreenWakeLock {
  /** 画面スリープ抑止を要求する。冪等。失敗しても reject しない */
  acquire(): Promise<void>;
  /** 要求を取り消す。冪等。失敗しても reject しない */
  release(): Promise<void>;
}
