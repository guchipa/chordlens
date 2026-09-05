import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
    // vitest はテストファイルを SSR (Node) 実行するため、package.json の
    // exports 条件解決が既定で "node" 条件を優先してしまう。
    // @ionic/react が依存する @lit/react はこの条件で SSR 向けの
    // 「イベント/プロパティを DOM に反映しないスタブ実装」を返してしまい、
    // ionChange 等の CustomEvent がハンドラに届かなくなる。
    // "browser" 条件を優先させることで jsdom 上でも実際に
    // addEventListener が行われる実装を読み込ませる。
    conditions: ["browser"],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    // WSL のメモリが少ない環境 (約 3.7GB) で並列ワーカーが OOM を起こし
    // WSL ごと落ちるため、テストは単一プロセスで直列実行する
    fileParallelism: false,
    maxWorkers: 1,
    server: {
      // @ionic/react (経由の @lit/react) は既定では Node の "externalized" 依存として
      // Node 自身の ESM ローダーで解決されてしまい、上の resolve.conditions が効かず
      // "node" 条件 (SSR 向けのイベント/プロパティ未設定スタブ) が選ばれてしまう。
      // Vite の変換パイプラインに載せる (inline) ことで resolve.conditions の
      // "browser" が有効になり、実際に addEventListener するブラウザ向け実装が読み込まれる。
      deps: {
        inline: [/@lit\/react/, /@stencil\/react-output-target/],
      },
    },
  },
});
