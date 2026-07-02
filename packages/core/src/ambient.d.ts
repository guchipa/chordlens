/**
 * コアが前提とする最小限のホスト環境グローバル。
 * console はブラウザ / Node.js / React Native (Hermes) のすべてに存在する。
 *
 * DOM lib を含めない tsconfig.json (src 専用チェック) のための宣言。
 * @types/node を読み込む tsconfig.dev.json では二重宣言になるため exclude される。
 */
declare const console: {
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
};
