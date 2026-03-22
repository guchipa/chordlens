# 開発者体験 (DX) 問題点レポート

> 調査日: 2026-03-22
> 対象ブランチ: `claude/identify-dx-issues-15wF3`

---

## 🔴 Critical（開発ブロッキング）

### 1. `node_modules` が存在しない / セットアップ手順の欠如

- **場所:** プロジェクトルート
- **問題:** リポジトリに `node_modules` が含まれておらず、初回セットアップ後に `npm install` を実行しないとすべての依存関係が UNMET 状態になる。`npm run dev`・`npm test`・`npm run build` がすべて失敗する。
- **詳細:** README やドキュメントに「まず `npm install` を実行する」旨の手順が明記されていない。
- **推奨対応:** README にセットアップ手順（`npm install && npm run dev`）を追記する。

---

## 🟠 High（UX・安全性）

### 2. マイクエラー通知に `alert()` を使用

- **場所:** `lib/hooks/useAudioAnalysis.ts:64`
- **コード:**
  ```typescript
  alert("マイクへのアクセスを許可してください。");
  ```
- **問題:** ブラウザネイティブの `alert()` はブロッキング UI であり、既存の shadcn/ui コンポーネント群と一貫性がない。ユーザーを混乱させるほか、テストでモックが困難。
- **推奨対応:** `components/ui/alert-dialog.tsx` または `sonner` トースト通知に置き換える。

---

## 🟡 Medium（品質・パフォーマンス）

### 3. パフォーマンスクリティカルなパスでのデバッグ `console.log`

- **場所:** `lib/hooks/audio/useSpectrumAnalysis.ts:84-91`
- **コード:**
  ```typescript
  if (debugFrameCountRef.current % 30 === 0) {
      console.log("[AudioDebug] Max spectrum dB:", maxDb.toFixed(1), "| AudioContext state:", audioContext.state);
  }
  ```
- **問題:** `requestAnimationFrame` ループ内で 30 フレームごとに `console.log` を出力している。DevTools を開いているだけでパフォーマンスが低下する。ファイル内のコメントで「毎フレームの `console.log` は避ける」と注意書きがあるにもかかわらず残存している（矛盾）。
- **推奨対応:**
  ```typescript
  if (process.env.NODE_ENV === 'development' && debugFrameCountRef.current % 30 === 0) {
      console.log("[AudioDebug] ...");
  }
  ```

### 4. `localStorage` の未ガードアクセス

- **場所:** `lib/hooks/useFeedbackType.ts:9,13`
- **コード:**
  ```typescript
  localStorage.setItem("feedbackType", type);   // Line 9
  const savedFeedbackType = localStorage.getItem("feedbackType"); // Line 13
  ```
- **問題:** `lib/presets.ts` では `isLocalStorageAvailable()` でガードしているのに、このファイルだけ直接アクセスしている。プライベートブラウジングモードやサードパーティ Cookie ブロック環境で例外が発生しうる。コードベース内で一貫性がない。
- **推奨対応:**
  ```typescript
  import { isLocalStorageAvailable } from "@/lib/utils/localStorage";

  if (isLocalStorageAvailable()) {
    localStorage.setItem("feedbackType", type);
  }
  ```

### 5. テストカバレッジの不足

- **場所:** `__tests__/` ディレクトリ（14 ファイル、1756 行）
- **問題:** 以下の重要パスにテストがない:
  - `lib/hooks/useAudioAnalysis.ts` — メインの音声解析フック
  - `lib/hooks/audio/useSpectrumAnalysis.ts` 内の `evaluateSpectrum()` ロジック
  - Jotai atom の状態遷移テスト
  - `components/feature/PitchSettingForm.tsx`（276 行）の動作テスト
- **現状カバレッジ強い箇所:** `exportLog.test.ts`・`peakInterpolation.test.ts`・`presets.test.ts` は充実している。

### 6. テストファイルでの `any` 型多用

- **場所:** `__tests__/lib/utils/exportLog.test.ts:322,335,338,339,342,343,381,390`
- **コード例:**
  ```typescript
  let mockLink: any;
  (global as any).URL.createObjectURL = jest.fn(() => "blob:mock-url");
  (global as any).URL.revokeObjectURL = jest.fn();
  ```
- **問題:** TypeScript strict mode を有効にしているにもかかわらず、テストコードで `any` を多用しており型安全性の恩恵を受けられていない。
- **推奨対応:** `jest.spyOn` や適切な型定義・型アサーションに置き換える。

---

## 🟢 Low（保守性・ドキュメント）

### 7. 非推奨ファイル `lib/schema.ts` の残存

- **場所:** `lib/schema.ts`
- **コード:**
  ```typescript
  /**
   * スキーマ定義（後方互換性のため残存）
   * @deprecated lib/types.ts から直接インポートしてください
   */
  export { FormSchema } from "@/lib/types";
  ```
- **問題:** `@deprecated` とコメントされたまま削除されずに残っており、新規開発者がどちらを使うべきか迷う原因になる。
- **推奨対応:** 全インポート箇所を `lib/types.ts` に移行後、ファイルを削除する。

### 8. `.env.example` ファイルの欠如

- **場所:** プロジェクトルート
- **問題:** `NEXT_PUBLIC_VERCEL_CLIENT_LOG`・`NEXT_PUBLIC_VERCEL_CLIENT_LOG_FPS` などの環境変数が存在するが、`.env.example` がない。新規開発者がローカルで機能をテストするために何を設定すべきかわからない。
- **推奨対応:**
  ```bash
  # .env.example
  # クライアントログ機能（Vercel デプロイ時のみ有効）
  NEXT_PUBLIC_VERCEL_CLIENT_LOG=        # "1" で有効化
  NEXT_PUBLIC_VERCEL_CLIENT_LOG_FPS=    # ログ送信 FPS（デフォルト: 1）
  ```

### 9. `.gitignore` のエンコーディング問題

- **場所:** `.gitignore` の PWA ファイルセクション
- **問題:** 文字間にスペースが混入している（例: `p u b l i c / s w . j s`）。該当パターンが gitignore として機能せず、`public/sw.js` 等の PWA 生成ファイルが誤ってコミットされる可能性がある。
- **推奨対応:** 該当行を正しい形式に修正する:
  ```
  # PWA files
  public/sw.js
  public/sw.js.map
  public/workbox-*.js
  public/workbox-*.js.map
  ```

### 10. `Math.random()` による UUID 生成

- **場所:** `lib/hooks/useLogRecorder.ts:61`
- **コード:**
  ```typescript
  function generateUUID(): string {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          // ...
      });
  }
  ```
- **問題:** `lib/hooks/audio/useSpectrumAnalysis.ts` では `crypto.randomUUID()` を使っているのに、こちらは `Math.random()` を使っており実装が統一されていない。
- **推奨対応:** `crypto.randomUUID()` に統一する（Next.js 環境・モダンブラウザでは利用可能）。

---

## まとめ

| 優先度 | 件数 | 主な内容 |
|--------|------|---------|
| 🔴 Critical | 1 | 依存関係インストール手順の欠如 |
| 🟠 High | 1 | `alert()` によるエラー通知 |
| 🟡 Medium | 4 | デバッグログ残存、localStorage 未ガード、テスト不足、型安全性 |
| 🟢 Low | 4 | 非推奨ファイル、環境変数ドキュメント欠如、.gitignore 破損、UUID 不統一 |

**全体評価:** コードベースの構造・型定義・コンポーネント設計は質が高い。主に「環境セットアップのハードル」「デバッグコードの残存」「テストカバレッジの偏り」が DX を低下させている。
