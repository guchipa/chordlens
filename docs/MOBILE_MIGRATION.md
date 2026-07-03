# モバイルアプリ移行計画 (Mobile Migration Plan)

本ドキュメントは、ChordLens を Web アプリからモバイルアプリへ移行するための計画と、
そのために整備済みの基盤を記述する。

---

## 1. ゴールと方針

- 音声解析・評価ロジック(研究成果の核心)を **一切書き換えずに** モバイルで再利用する
- Web 版は維持したまま、モバイル版を **同一リポジトリ内で並行開発** できる構成にする
- プラットフォーム依存コードを adapter インターフェースの背後に隔離し、
  差し替えるだけで移植が完了する状態を目指す

## 2. 整備済みの基盤 (Phase 0: 完了)

### 2.1. monorepo 構成

```
chordlens/
├── packages/core/   # @chordlens/core: プラットフォーム非依存コア
├── apps/web/        # @chordlens/web: 既存 Web アプリ
└── apps/mobile/     # (将来) React Native / Capacitor アプリ
```

- `packages/core` の `tsconfig.json` は **DOM lib を含まない**。
  `window` / `localStorage` / Web Audio API 等への依存が混入すると
  `pnpm typecheck` が失敗するため、非依存性が CI で保証される。
- コアは `@chordlens/core/...` として import する
  (例: `@chordlens/core/audio_analysis/justAnalyze`)。

### 2.2. コアに移動済みの資産

| モジュール | 内容 | モバイルでの利用 |
|-----------|------|----------------|
| `audio_analysis/` | FFT・SWIPE'・位相ボコーダ・純正律評価・根音推定 | そのまま利用可 |
| `constants.ts` / `types.ts` | 定数・型・Zod スキーマ | そのまま利用可 |
| `presets/presetStore.ts` | プリセット管理 (ストレージ注入式) | ストレージ adapter を実装して利用 |
| `logging/logCsv.ts` | ログの CSV 変換 | そのまま利用可 |
| `utils/emaHold.ts` | EMA + ホールド平滑化 | そのまま利用可 |
| `adapters/` | プラットフォーム抽象インターフェース | モバイル実装の契約 |

### 2.3. adapter インターフェース

| インターフェース | 抽象化対象 | Web 実装 | モバイル実装(候補) |
|----------------|-----------|---------|------------------|
| `KeyValueStorage` | 設定・プリセットの永続化 | `localStorage` (`apps/web/lib/presets.ts`) | MMKV / AsyncStorage |
| `SpectrumSource` | マイク入力とスペクトル取得 | `AudioContext` + `AnalyserNode` (`apps/web/lib/hooks/audio/useAudioContext.ts` が同等機能) | react-native-audio-api / native モジュール + `core/audio_analysis/fft.ts` |

## 3. プラットフォーム依存ポイントの全リスト

モバイル移植時に差し替えが必要な箇所。すべて `apps/web` 内に隔離済み。

| 依存 | 現在の実装箇所 | 移行方針 |
|------|--------------|---------|
| マイク入力 | `lib/hooks/audio/useAudioContext.ts` (getUserMedia) | `SpectrumSource` 実装に置換 |
| FFT (AnalyserNode) | 同上 + `useSpectrumAnalysis.ts` | ネイティブ AnalyserNode 互換 or 自前 FFT (`core/audio_analysis/fft.ts` を利用) |
| 解析ループ | `useSpectrumAnalysis.ts` (requestAnimationFrame) | RN でも rAF は利用可。精度が必要なら setInterval / ネイティブコールバック |
| 設定の永続化 | `lib/store/*` (jotai `atomWithStorage` → localStorage) | `createJSONStorage` に MMKV 等を注入 (jotai 自体は RN 対応) |
| プリセット永続化 | `lib/presets.ts` (localStorage) | `KeyValueStorage` 実装を注入するだけ |
| CSV ダウンロード | `lib/utils/exportLog.ts` (Blob + `<a download>`) | `expo-file-system` + Share API 等 |
| 録音 | `lib/hooks/experiments/useMediaRecorder.ts` (MediaRecorder) | expo-av / react-native-audio-recorder |
| Firebase | `lib/firebase/*` (firebase JS SDK) | firebase JS SDK は RN 対応 (永続化層のみ調整) / @react-native-firebase |
| ルーティング | react-router-dom | React Navigation / expo-router |
| UI | Radix UI + Tailwind (DOM 前提) | RN コンポーネントで再実装 (NativeWind で Tailwind 記法は維持可) |
| PWA / Service Worker | vite-plugin-pwa | 不要 (ネイティブアプリのため) |

## 4. 技術スタック候補の比較

| 観点 | React Native (Expo) | Capacitor |
|------|--------------------|-----------| 
| UI 資産の再利用 | 再実装が必要 (コアロジックは共有可) | 既存 Web UI をほぼそのまま利用 |
| 音声処理 | react-native-audio-api (AnalyserNode 互換) or ネイティブ実装。低レイテンシ | WebView 内の Web Audio API。実質 Web 版と同じ挙動 |
| レイテンシ・パフォーマンス | ◎ (ネイティブ) | △ (WebView 依存。iOS WKWebView の getUserMedia は 14.3+) |
| ストア審査・ネイティブ機能 | ◎ | ○ |
| 移行コスト | 高 (UI 再実装) | 低 |

**推奨**: まず **Capacitor で早期にストア配布**(Web 資産をほぼ流用)し、
レイテンシ・音質要件が WebView で満たせない場合に
**React Native + `@chordlens/core`** へ段階移行する 2 段構え。
どちらのルートでも `packages/core` はそのまま使える。

> **Metro (React Native バンドラ) の注意**: `@chordlens/core` は package.json の
> `exports` フィールドで TS ソースを直接公開している。RN 0.79+ / Expo SDK 53+ では
> package exports がデフォルト有効。それ以前は `unstable_enablePackageExports` を有効にする。

## 5. フェーズ計画

### Phase 0: 基盤整備 — ✅ 完了
- [x] pnpm workspaces による monorepo 化
- [x] コアロジックの `packages/core` への分離 (DOM lib なしで型チェック)
- [x] `KeyValueStorage` / `SpectrumSource` インターフェース定義
- [x] presets / ログ CSV のコア・Web バインディング分割

### Phase 1: Web 側の adapter 完全化
- [ ] `useAudioContext` を `SpectrumSource` 実装 (`WebAudioSpectrumSource`) として切り出し、
      `useSpectrumAnalysis` が `SpectrumSource` インターフェースのみに依存するようリファクタ
- [ ] jotai atoms のストレージを `KeyValueStorage` 経由に統一
      (`atomWithStorage` の storage 引数に注入)
- [ ] `useSpectrumAnalysis` の解析ロジック(フレーム処理部)を純粋関数として core へ移動

### Phase 2: モバイル scaffold
- [ ] 技術選定の確定 (Capacitor 先行 or React Native 直行)
- [ ] `apps/mobile` の scaffold 追加 (workspace に追加するだけ)
- [ ] `SpectrumSource` / `KeyValueStorage` のモバイル実装
- [ ] マイク権限フロー (iOS: NSMicrophoneUsageDescription / Android: RECORD_AUDIO)

### Phase 3: 機能パリティ
- [ ] チューナー画面 (メーター・バー・円形フィードバック)
- [ ] プリセット管理
- [ ] 設定画面
- [ ] ログ記録・エクスポート (Share API)
- [ ] E2E 検証 (実機でのレイテンシ計測: 目標 100ms 以下)

## 6. リスクと対策

| リスク | 影響 | 対策 |
|-------|------|------|
| WebView の音声レイテンシ (Capacitor) | フィードバックの遅延 | 実機で早期に計測。閾値超過なら RN ルートへ |
| JS での FFT 性能 (RN/Hermes) | フレームレート低下 | `core/audio_analysis/fft.ts` は既に純 JS で動作。不足時は JSI ネイティブ FFT に差し替え (インターフェースは不変) |
| `crypto.randomUUID` 非対応環境 | ID 生成失敗 | `presetStore` はフォールバック実装済み + `generateId` 注入可 |
| `toLocaleDateString("ja-JP")` (Hermes Intl) | 日付表示崩れ | Hermes は Intl 対応済み (RN 0.65+)。要動作確認 |
| UI 全面再実装のコスト (RN) | 工数増 | Capacitor 先行で価値検証してから判断 |

## 7. 依存ルールの維持

今後の開発では以下を守ることで移行可能性を維持する:

1. **新しいロジックはまず core に書けないか検討する**。
   ブラウザ API が必要な部分だけを `apps/web/lib` に置く。
2. **core にブラウザ API を追加しない** (`pnpm typecheck` が防いでくれる)。
3. **プラットフォーム依存の新機能は adapter インターフェースを先に定義する**
   (`packages/core/src/adapters/`)。
4. **`apps/web` から core への逆依存を作らない**。
