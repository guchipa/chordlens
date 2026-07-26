import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { viteStaticCopy } from "vite-plugin-static-copy";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// pnpm の symlink を実体パスに解決しないと dist 側のディレクトリ構造が崩れる
const basicPitchModelDir = fs.realpathSync(
  path.resolve(__dirname, "node_modules/@spotify/basic-pitch/model")
);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // basic-pitch の TFJS モデル (model.json + 重み) を静的配信する。
    // モデルは実行時に /models/basic-pitch/model.json から fetch される
    viteStaticCopy({
      targets: [
        {
          src: `${basicPitchModelDir}/*`,
          dest: "models/basic-pitch",
          // 一致したパスの親ディレクトリ構造を保持せずフラットに配置する
          rename: { stripBase: true },
        },
      ],
    }),
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
