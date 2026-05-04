# ChordLens

<p align="center">
  <a href="https://chordlens.vercel.app/" target="_blank">
    <img src="https://img.shields.io/badge/Live_Demo-試してみる-brightgreen?style=for-the-badge" alt="Live Demo">
  </a>
  <a href="https://github.com/guchipa/chordlens/actions">
    <img src="https://img.shields.io/github/actions/workflow/status/guchipa/chordlens/test.yml?style=for-the-badge&label=Tests" alt="Tests">
  </a>
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js 15">
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
| **Framework**        | ![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=next.js&logoColor=white)                                                                                                                      |
| **Language**         | ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)                                                                                                                |
| **UI Library**       | ![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)                                                                                                                           |
| **Styling**          | ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)                                                                                                        |
| **UI Components**    | ![shadcn/ui](https://img.shields.io/badge/shadcn/ui-000000?style=for-the-badge&logo=shadcnui&logoColor=white) ![Radix UI](https://img.shields.io/badge/Radix_UI-161618?style=for-the-badge&logo=radixui&logoColor=white)         |
| **Form Management**  | ![React Hook Form](https://img.shields.io/badge/React_Hook_Form-EC5990?style=for-the-badge&logo=reacthookform&logoColor=white) ![Zod](https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white)      |
| **Audio Processing** | ![Web Audio API](https://img.shields.io/badge/Web_Audio_API-E34F26?style=for-the-badge&logo=html5&logoColor=white)                                                                                                               |
| **Testing**          | ![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white) ![Testing Library](https://img.shields.io/badge/Testing_Library-E33332?style=for-the-badge&logo=testing-library&logoColor=white) |
| **Deployment**       | [![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)                                                                                                     |
| **Package Manager**  | ![npm](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)                                                                                                                                     |

## プロジェクト構造 (Project Structure)

```
ChordLens-web/
├── app/                      # Next.js App Router
│   ├── page.tsx             # メインページ（音声解析統合）
│   ├── layout.tsx           # 全体レイアウト
│   ├── globals.css          # グローバルスタイル
│   ├── manifest.json        # PWAマニフェスト
│   └── experiment/          # 実験用ページ
├── components/              # Reactコンポーネント
│   ├── feature/             # 機能コンポーネント
│   │   ├── PitchSettingForm.tsx    # 構成音入力フォーム
│   │   ├── PitchList.tsx           # 構成音リスト表示
│   │   ├── AnalysisControl.tsx     # 解析開始/停止制御
│   │   ├── AnalysisResult.tsx      # 解析結果表示
│   │   ├── SettingsForm.tsx        # 設定パネル
│   │   ├── PresetManager.tsx       # プリセット管理
│   │   ├── FeedbackTypeSelector.tsx # フィードバック表示切替
│   │   └── LogExportButton.tsx     # ログエクスポート
│   ├── feedback/            # 視覚フィードバック
│   │   ├── UnifiedFeedback.tsx     # 統合フィードバック
│   │   ├── BarFeedback.tsx         # バー表示
│   │   ├── CircleFeedback.tsx      # 円形表示
│   │   ├── StroboFeedback.tsx      # ストロボ表示
│   │   ├── WaveformFeedback.tsx    # 波形表示
│   │   └── NumericFeedback.tsx     # 数値表示
│   ├── layout/              # レイアウトコンポーネント
│   ├── TunerMeter.tsx       # メーター表示（旧）
│   ├── CentDisplay.tsx      # セント表示
│   ├── AppFooter.tsx        # フッター
│   └── ui/                  # shadcn/ui プリミティブ
├── lib/                     # ユーティリティ・ロジック
│   ├── audio_analysis/      # 音声解析ロジック
│   │   ├── calcJustFreq.ts         # 純正律周波数計算
│   │   ├── justAnalyze.ts          # スペクトル解析・評価
│   │   └── rootEstimation.ts       # 根音推定アルゴリズム
│   ├── hooks/               # カスタムフック
│   │   ├── useAudioAnalysis.ts     # 音声解析管理
│   │   ├── useAudioSettings.ts     # 設定管理
│   │   ├── usePitchList.ts         # 構成音リスト管理
│   │   ├── useFeedbackType.ts      # フィードバック表示管理
│   │   └── useLogRecorder.ts       # ログ記録
│   ├── utils/               # ユーティリティ
│   │   └── exportLog.ts            # ログエクスポート
│   ├── constants.ts         # 定数定義
│   ├── schema.ts            # Zodスキーマ定義
│   ├── types.ts             # 型定義
│   ├── presets.ts           # プリセット管理
│   └── utils.ts             # 共通ユーティリティ
├── __tests__/               # Jestテスト
├── public/                  # 静的ファイル
│   ├── sw.js               # Service Worker
│   └── workbox-*.js        # Workbox
├── docs/                    # ドキュメント
└── .github/                 # GitHub設定・CI/CD
```

## セットアップ (Getting Started)

### 必要な環境

- **Node.js**: v18以上
- **npm**: v9以上（または pnpm）

### インストールと起動

```bash
# リポジトリのクローン
git clone https://github.com/guchipa/chordlens.git
cd chordlens

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

### その他のコマンド

```bash
npm run build       # プロダクションビルド
npm run start       # プロダクションサーバー起動
npm run lint        # ESLint実行
npm test            # Jestテスト実行
npm run test:watch  # Jestウォッチモード
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
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

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
指数平滑化・dB 変換) をエミュレートしており、`lib/audio_analysis/justAnalyze.ts` の
`evaluateSpectrum()` をそのまま利用しています。

構成音は **ファイル名末尾** で指定し、**先頭の音がルート** に固定されます。
(`_` で区切られた最後のブロックを `-` で分割して音名 + オクターブ番号として解釈)

```bash
# 基本: 同ディレクトリに <入力名>.csv を出力
npm run analyze:file -- path/to/song_C4-E4-G4.wav

# 出力先を指定
npm run analyze:file -- path/to/Cmaj7_C4-E4-G4-B4.m4a ./out.csv

# サンプルレートを指定 (既定: 48000)
npm run analyze:file -- path/to/F#4-A4-C#5.wav --sample-rate 44100
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
閾値・スムージング定数) は `lib/constants.ts` のブラウザ側デフォルトを使用します。

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

このプロジェクトはJestとReact Testing Libraryを使用してテストされています。

```bash
# すべてのテストを実行
npm test

# ウォッチモードで実行
npm run test:watch

# カバレッジレポート生成
npm test -- --coverage
```

**テスト対象:**
- UIコンポーネント（スナップショットテスト）
- フォームバリデーション
- ユーザーインタラクション
- 音声解析ロジック
- プリセット管理機能
- ログエクスポート機能

## ドキュメント (Documentation)

- **[仕様書](./docs/仕様書.md)**: システム全体の詳細仕様
- **[Copilot Instructions](./.github/copilot-instructions.md)**: AI開発支援用プロジェクトガイド

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
