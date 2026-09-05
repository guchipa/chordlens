import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "generateSW",
      manifest: false,
      includeAssets: [
        "audio-processor.js",
        "pcm-capture-processor.js",
        "icon-192.png",
        "icon-512.png",
        "manifest.json",
        "favicon.ico",
        "icon.svg",
      ],
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallbackDenylist: [/^\/api\//],
        // Ionic React 導入でメインバンドルが既定の 2MiB を超えたため引き上げる。
        // 根本対応 (コード分割) は最終タスク (Tailwind 撤去 + バンドル最適化) で検討する
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  server: {
    port: 3000,
  },
});
