# ChordLens

<p align="center">
  <a href="https://chordlens.vercel.app/" target="_blank">
    <img src="https://img.shields.io/badge/Live_Demo-試してみる-brightgreen?style=for-the-badge" alt="Live Demo">
  </a>
  <a href="https://github.com/guchipa/chordlens/actions">
    <img src="https://img.shields.io/github/actions/workflow/status/guchipa/chordlens/test.yml?style=for-the-badge&label=Tests" alt="Tests">
  </a>
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 6">
  <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React 19">
</p>

<img width="1920" height="1032" alt="image" src="https://github.com/user-attachments/assets/69517832-dfdf-4ebc-9910-8c501e9c3a3e" />


## 概要 (Introduction)

**ChordLens**は、マイクから入力された音声をリアルタイムで解析し、設定した和音の構成音が**純正律**からどれだけズレているかを視覚的に表示するWebアプリケーションです。

東京理科大学 創域理工学研究科 情報計算科学専攻 大村研究室での研究「和音演奏のための多重音チューニングシステム」で提案した手法を、Web Audio APIを用いて完全にブラウザ上で実装しました。サーバー不要のフロントエンドのみの構成により、高速で安全なリアルタイム音声処理を実現しています。

## 主な特徴 (Features)

* **リアルタイム音声解析**: Web Audio APIによる低レイテンシーなフィードバック（100ms以下）
* **複数音の同時評価**: 和音（コード）に含まれる複数の音を同時に評価可能
* **プリセット機能**: 構成音リストの保存・読込に対応（最大20個まで保存可能）
* **柔軟な設定**: 音名・オクターブの自由な追加/削除、FFTサイズ・平滑化定数などの詳細設定
* **純正律ベース**: 平均律ではなく、美しく響き合う純正律を基準に評価
* **根音自動推定**: 入力された構成音から和音の根音を自動推定する機能
* **多様な視覚フィードバック**: バー、円形、ストロボ、波形など複数の表示モードに対応
* **実験用ログ記録**: チューニング履歴のエクスポート機能（CSV形式）
* **PWA対応**: オフライン動作・ホーム画面へのインストールが可能
* **完全フロントエンド**: サーバー不要、ブラウザ内で完結する音声処理
* **設定の永続化**: localStorageによる設定値の自動保存
* **レスポンシブ対応**: スマートフォン・タブレット・デスクトップに最適化

## 技術スタック (Tech Stack)

| カテゴリ             | 技術                                                                                                                                                                                                                             |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Build Tool**       | ![Vite](https://img.shields.io/badge/Vite_6-646CFF?style=for-the-badge&logo=vite&logoColor=white)                                                                                                                                |
| **Language**         | ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)                                                                                                                |
| **UI Library**       | ![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)                                                                                                                           |
| **Styling**          | ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)                                                                                                        |
| **UI Components**    | ![shadcn/ui](https://img.shields.io/badge/shadcn/ui-000000?style=for-the-badge&logo=shadcnui&logoColor=white) ![Radix UI](https://img.shields.io/badge/Radix_UI-161618?style=for-the-badge&logo=radixui&logoColor=white)         |
| **Form Management**  | ![React Hook Form](https://img.shields.io/badge/React_Hook_Form-EC5990?style=for-the-badge&logo=reacthookform&logoColor=white) ![Zod](https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white)      |
| **Audio Processing** | ![Web Audio API](https://img.shields.io/badge/Web_Audio_API-E34F26?style=for-the-badge&logo=html5&logoColor=white)                                                                                                               |
| **Testing**          | ![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white) ![Testing Library](https://img.shields.io/badge/Testing_Library-E33332?style=for-the-badge&logo=testing-library&logoColor=white) |
| **Deployment**       | [![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)                                                                                                     |
| **Package Manager**  | ![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white) (workspaces monorepo)                                                                                                            |

## プロジェクト構造 (Project Structure)

pnpm workspaces による monorepo 構成です。プラットフォーム非依存のコアロジック
（`packages/core`）と Web アプリ本体（`apps/web`）を分離しており、将来のモバイル
アプリ追加（`apps/mobile`）を見据えた土台になっています
（詳細は [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)、移行計画は
[docs/MOBILE_MIGRATION.md](./docs/MOBILE_MIGRATION.md) を参照）。

```
chordlens/
├── packages/
│   └── core/                 # @chordlens/core: プラットフォーム非依存コア
│       ├── src/
│       │   ├── audio_analysis/       # 音声解析ロジック（純粋 TypeScript）
│       │   │   ├── calcJustFreq.ts          # 純正律周波数計算
│       │   │   ├── justAnalyze.ts           # スペクトル解析・評価
│       │   │   ├── rootEstimation.ts        # 根音推定アルゴリズム
│       │   │   ├── pitchDetection.ts        # ピッチ検出（自己相関法）
│       │   │   ├── swipePitchEstimation.ts  # SWIPE' ピッチ推定
│       │   │   ├── phaseVocoderEstimation.ts # 位相ボコーダ法
│       │   │   └── fft.ts                   # FFT 共通ユーティリティ
│       │   ├── adapters/             # プラットフォーム抽象 (storage / audio)
│       │   ├── presets/              # プリセット管理コア（ストレージ注入式）
│       │   ├── logging/              # ログ CSV 変換
│       │   ├── constants.ts          # 定数定義
│       │   └── types.ts              # 型定義（Zodスキーマ含む）
│       ├── scripts/                  # 音声ファイル解析 CLI
│       └── __tests__/                # コアロジックのテスト (Node 環境)
│
├── apps/
│   └── web/                  # @chordlens/web: Web アプリ (Vite + React)
│       ├── src/              # エントリーポイント・ルーティング
│       │   └── routes/experiments/   # 評価実験フロー
│       ├── components/
│       │   ├── feature/      # 機能コンポーネント
│       │   ├── feedback/     # 視覚フィードバック（バー、円形、ストロボ等）
│       │   ├── layout/       # レイアウトコンポーネント
│       │   └── ui/           # shadcn/ui プリミティブ
│       ├── lib/              # Web 依存ロジック
│       │   ├── hooks/        # カスタムフック（Web Audio API 使用）
│       │   ├── store/        # Jotai atoms（localStorage 永続化）
│       │   ├── experiments/  # 評価実験ロジック
│       │   ├── firebase/     # Firebase 連携
│       │   ├── presets.ts    # プリセット管理（Web バインディング）
│       │   └── utils/exportLog.ts  # CSV ダウンロード（Web バインディング）
│       ├── functions/        # Cloudflare Pages Functions (client-log API)
│       ├── public/           # 静的ファイル
│       └── __tests__/        # コンポーネントテスト (jsdom)
│
├── docs/                     # ドキュメント
├── pnpm-workspace.yaml       # ワークスペース定義
└── .github/                  # GitHub設定・CI/CD
```

## セットアップ (Getting Started)

### 必要な環境

- **Node.js**: v20以上
- **pnpm**: v10以上

### インストールと起動

```bash
# リポジトリのクローン
git clone https://github.com/guchipa/chordlens.git
cd chordlens

# 依存関係のインストール (pnpm workspaces)
pnpm install

# 開発サーバーの起動
pnpm dev
```

ブラウザで http://localhost:3000 を開きます。

### その他のコマンド

いずれもリポジトリルートで実行できます（各 workspace へ委譲されます）。

```bash
pnpm build       # プロダクションビルド (apps/web/dist に出力)
pnpm preview     # ビルド結果のプレビュー
pnpm lint        # ESLint実行
pnpm typecheck   # 全 workspace の型チェック
pnpm test        # 全 workspace の Vitest テスト実行
pnpm test:watch  # Vitest ウォッチモード
```

### 実験参加者フロー `/experiments`

評価実験用のセルフサーブ動線を `/experiments` 以下に用意しています。
参加者ごとに実験者が事前に URL を発行し、参加者はブラウザだけで以下の流れを完了できます。

1. `/experiments` 事前アンケート (ペア 2 名分)
2. `/experiments/test1` 練習前テスト (B♭ / Cm / F7 を 5 秒録音)
3. `/experiments/practice` 10 分間練習 (`cond=with` は ChordLens 表示あり)
4. `/experiments/test2` 練習後テスト
5. `/experiments/post-survey` 事後アンケート

URL フォーマット:

```
/experiments/?cond=with&pairId=PR01    # 提案システム条件
/experiments/?cond=without&pairId=PR02 # 比較条件
```

#### Firebase 設定

録音 / 解析 CSV / アンケート回答は Firebase (Firestore + Cloud Storage) に
匿名認証で保存します。Firebase コンソールで Web アプリを 1 つ作成し、
`.env.local.example` をコピーして以下を設定してください。

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_APP_ID=
```

(`.env.local.example` は `apps/web/` にあります)

##### Firestore / Storage Security Rules (推奨)

```
// Firestore
match /pairs/{pairId} {
  allow create, update: if request.auth != null;
  allow read: if false; // 参加者からは読み取らせない
  match /attempts/{attemptId} {
    allow create, update: if request.auth != null;
    allow read: if false;
  }
}

// Storage
match /pairs/{pairId}/{phase}/{attempt}/{file} {
  allow write: if request.auth != null;
  allow read: if false;
}
```

実験者は Firebase コンソール (または別途用意した管理ツール) で
`/pairs/{pairId}` 以下のドキュメントと Storage オブジェクトを取得します。

### 音声ファイル解析 CLI (Audio File Analysis CLI)

マイク入力に加えて、録音済みの音声ファイル (wav / m4a / mp4 など ffmpeg が扱える形式) を
60fps でフレーム解析し、既存のログ形式と同じ CSV にエクスポートできます。
ブラウザの `AnalyserNode` と同等の挙動 (Blackman 窓・`smoothingTimeConstant` による
指数平滑化・dB 変換) をエミュレートしており、`packages/core/src/audio_analysis/justAnalyze.ts` の
`evaluateSpectrum()` をそのまま利用しています。

構成音は **ファイル名末尾** で指定し、**先頭の音がルート** に固定されます。
(`_` で区切られた最後のブロックを `-` で分割して音名 + オクターブ番号として解釈)

```bash
# 基本: 同ディレクトリに <入力名>.csv を出力
pnpm analyze:file -- path/to/song_C4-E4-G4.wav

# 出力先を指定
pnpm analyze:file -- path/to/Cmaj7_C4-E4-G4-B4.m4a ./out.csv

# サンプルレートを指定 (既定: 48000)
pnpm analyze:file -- path/to/F#4-A4-C#5.wav --sample-rate 44100
```

ファイル名の例:

| 入力ファイル名 | 解釈される構成音 (先頭がルート) |
| :-- | :-- |
| `song_C4-E4-G4.wav` | C4 (root), E4, G4 |
| `Cmaj7_C4-E4-G4-B4.m4a` | C4 (root), E4, G4, B4 |
| `F#4-A4-C#5.wav` | F#4 (root), A4, C#5 |

出力 CSV の列は実験モードのログと同一 (`timestamp`, `elapsedMs`, `sessionId`,
`pitchName`, `pitchIsRoot`, `deviation`, `centDeviation`, `centDeviationRaw`,
`centDeviationDisplay`, `isDetected`, `isHeld`, `a4Freq`, `evalRangeCents`,
`evalThreshold`, `fftSize`, `smoothingTimeConstant`) で、60fps で 1 フレームにつき
構成音ごとに 1 行ずつ書き出します。解析パラメータ (A4 周波数・FFT サイズ・評価範囲・
閾値・スムージング定数) は `packages/core/src/constants.ts` のブラウザ側デフォルトを使用します。

> ffmpeg バイナリは `ffmpeg-static` (devDependency) から自動で解決されるため、
> 別途のインストールは不要です。

## 使い方 (Usage)

### 基本的な使用方法

1. **構成音の追加**
   - 音名とオクターブ番号を選択
   - 根音にする場合は「根音」チェックボックスをオン
   - 「追加」ボタンで構成音リストに追加

2. **根音の推定**（オプション）
   - 構成音リストから「根音を推定」ボタンをクリック
   - システムが自動的に最適な根音を推定

3. **解析開始**
   - 「解析開始」ボタンをクリック
   - マイクアクセスを許可
   - 楽器を演奏すると、リアルタイムでフィードバックが表示

4. **チューニング**
   - 表示が中央に来るように楽器を調整
   - セント単位の正確な値を確認しながら微調整

### プリセット機能

- **保存**: 構成音リストを最大20個まで保存可能
- **読込**: 保存したプリセットをワンクリックで復元
- **削除**: 不要なプリセットを個別に削除

### 表示モード

以下のフィードバック表示モードから選択可能:
- **バー表示**: シンプルなバーによる視覚化
- **円形表示**: 円形メーターによる視覚化
- **ストロボ表示**: 高精度な視覚的フィードバック
- **波形表示**: 周期的な波形による視覚化
- **数値表示**: セント値の数値表示

### 設定の調整

「設定」パネルから以下のパラメータを調整可能:
- FFTサイズ（2048〜32768）
- 平滑化定数（0.0〜1.0）
- 評価範囲（セント単位）
- その他音声処理パラメータ

### ログ記録

実験用途向けに、チューニング履歴をCSV形式でエクスポート可能。タイムスタンプ、構成音、評価結果などが記録されます。

## テスト (Testing)

このプロジェクトはVitestとReact Testing Libraryを使用してテストされています。
コアロジック（`packages/core`）は Node 環境、UI（`apps/web`）は jsdom 環境でテストします。

```bash
# すべてのテストを実行 (core + web)
pnpm test

# ウォッチモードで実行
pnpm test:watch

# カバレッジレポート生成
pnpm --filter @chordlens/web test -- --coverage
```

**テスト対象:**
- UIコンポーネント（スナップショットテスト）
- フォームバリデーション
- ユーザーインタラクション
- 音声解析ロジック
- プリセット管理機能
- ログエクスポート機能

## ドキュメント (Documentation)

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)**: アーキテクチャ概要・ディレクトリ構成
- **[SPECIFICATION.md](./docs/SPECIFICATION.md)**: システム全体の詳細仕様
- **[MOBILE_MIGRATION.md](./docs/MOBILE_MIGRATION.md)**: モバイルアプリ移行計画
- **[AUDIO_PIPELINE.md](./docs/AUDIO_PIPELINE.md)**: 音声解析パイプラインの詳細
- **[STATE_MANAGEMENT.md](./docs/STATE_MANAGEMENT.md)**: Jotai状態管理の詳細
- **[COMPONENTS.md](./docs/COMPONENTS.md)**: コンポーネント一覧
- **[EVALUATION.md](./docs/EVALUATION.md)**: 評価実験ガイド
- **[CLAUDE.md](./CLAUDE.md)**: AI開発支援用プロジェクトガイド

## 対応ブラウザ (Browser Support)

| ブラウザ      | バージョン | 対応状況 |
| :------------ | :--------- | :------- |
| Chrome        | 最新版     | 対応     |
| Edge          | 最新版     | 対応     |
| Safari        | 最新版     | 対応     |
| Firefox       | 最新版     | 対応     |
| iOS Safari    | 最新版     | 対応     |
| Chrome Mobile | 最新版     | 対応     |

**注意事項:**
- HTTPS接続またはlocalhostでの使用が必須（getUserMedia APIの制約）
- Web Audio APIをサポートするブラウザが必要
- PWA機能により、オフラインでも動作可能

## ライセンス (License)

このプロジェクトは[MITライセンス](LICENSE)の下で公開されています。
