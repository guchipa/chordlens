# CLAUDE.md

ChordLens — リアルタイム純正律和音チューナー。マイク入力をブラウザ内で解析し、
和音の構成音が純正律からどれだけズレているかを視覚フィードバックする。

## リポジトリ構成 (pnpm workspaces monorepo)

- `packages/core` (`@chordlens/core`) — **プラットフォーム非依存コア**。
  音声解析アルゴリズム (`src/audio_analysis/`)、定数・型 (`src/constants.ts`, `src/types.ts`)、
  プリセット管理 (`src/presets/`)、ログ CSV 変換 (`src/logging/`)、
  adapter インターフェース (`src/adapters/`)。
- `apps/web` (`@chordlens/web`) — Vite + React 19 の Web アプリ。
  UI コンポーネント (`components/`)、ブラウザ依存ロジック (`lib/`: hooks, Jotai store, firebase)。

詳細: `docs/ARCHITECTURE.md`、モバイル移行計画: `docs/MOBILE_MIGRATION.md`

## 絶対に守るルール

1. **`packages/core` にブラウザ API (window/document/localStorage/Web Audio) を持ち込まない**。
   core の tsconfig は DOM lib を含まないため typecheck で落ちる。これは意図的な設計。
2. **core → apps/web の依存を作らない**(逆方向のみ許可)。
3. プラットフォーム依存の処理が必要な場合は、`packages/core/src/adapters/` に
   インターフェースを定義し、`apps/web/lib/` に実装を置いて注入する
   (例: `KeyValueStorage` ← localStorage 実装は `apps/web/lib/presets.ts`)。
4. 新しいロジックはまず core に置けないか検討する(モバイル移行を見据えるため)。

## import 規約

- `apps/web` 内: `@/*` エイリアス (`apps/web/` がルート)。例: `@/components/ui/button`
- core のモジュール: `@chordlens/core/<path>`。例: `@chordlens/core/audio_analysis/justAnalyze`
- core 内部: 相対パス

## コマンド (すべてリポジトリルートで実行)

| コマンド | 説明 |
|---------|------|
| `pnpm dev` | 開発サーバー (localhost:3000) |
| `pnpm test` | 全テスト (core: Node 環境 / web: jsdom) |
| `pnpm typecheck` | 全 workspace の型チェック (core の DOM 非依存もここで検証) |
| `pnpm lint` | ESLint |
| `pnpm build` | 本番ビルド (`apps/web/dist`) |
| `pnpm analyze:file -- <audio>` | 音声ファイルのオフライン解析 CLI |

単一テストの実行: `pnpm --filter @chordlens/web test -- __tests__/PitchList.test.tsx`

## テスト配置

- コアロジックのテスト → `packages/core/__tests__/` (Node 環境、DOM モック不可)
- コンポーネント・ブラウザ依存のテスト → `apps/web/__tests__/` (jsdom、
  Web Audio API のモックは `apps/web/vitest.setup.ts`)

## ドメイン知識の要点

- 基準は**純正律** (平均律ではない)。根音からの周波数比 (`JUST_RATIOS`) で期待周波数を計算
- 偏差の単位は**セント**: `1200 * log2(actual / expected)`。deviation は ±evalRangeCents で正規化した -1〜1
- ピッチ推定は 3 アルゴリズム: FFT ピーク (デフォルト) / SWIPE' / 位相ボコーダ
- 構成音の自動検出は pitchplease のみ (倍音和サリエンス + 貪欲減算, Goertzel ベースの core 実装,
  A4 設定に追従, ノイズ床基準の dB SNR で音名ビンを正規化 (noiseFloor 既定),
  AudioWorklet + `StreamingChordTracker` によるストリーミング方式で低レイテンシ)。
  アルゴリズム選択の設定は持たない (basic-pitch は 3 秒録音のバッチ方式でしか動かせず
  リアルタイム追従のレイテンシ要件を構成上満たせないため削除済み。経緯は
  `docs/CHORD_DETECTION.md` §5.4)。
  `NoteDetector` adapter 経由で音名特定のみに使い、純正律偏差の計測には使わない。
  アルゴリズム詳細は `docs/CHORD_DETECTION.md`、追加手順は同 §6 と
  `apps/web/lib/audio/noteDetectorFactory.ts` のコメント参照
- 構成音検出を変更したら実録音で回帰評価する:
  `pnpm --filter @chordlens/core eval:chords <録音ディレクトリ> --root-optional`
  (正解ラベルはファイル名末尾 `_C4-Eb4-G4` 形式・先頭が根音。アンサンブル実験の
  録音は根音奏者の有無が混在するため `--root-optional` で根音を任意採点にする)
  レベル不均衡 (1 人だけ弱い/欠けた演奏) への耐性も `--attenuate 6` / `--attenuate 12` で確認する
- A4 デフォルトは **442Hz** (`packages/core/src/constants.ts`)
- 数値解析コードを変更したら必ず `packages/core/__tests__/audio_analysis/` のテストを実行

## 変更時の注意

- `docs/` は実装と同期させる (特に ARCHITECTURE.md のディレクトリ構成)
- deploy は Vercel (`vercel.json` がルート)。出力先 `apps/web/dist` を変えたら vercel.json も更新
- `/experiments` 配下は評価実験用フロー。被験者データに影響するため挙動変更は慎重に
