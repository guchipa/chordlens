# コンポーネントリファレンス (Components Reference)

ChordLensのUIコンポーネント構造と各コンポーネントの責務について解説します。

---

## 1. コンポーネント構成

```
components/
├── feature/      # 機能コンポーネント（ドメインロジックを含む）
├── feedback/     # フィードバック表示（視覚化に特化）
├── layout/       # レイアウト（ヘッダー、フッター、ドロワー）
└── ui/           # UIプリミティブ（shadcn/ui）
```

---

## 2. Feature Components (`components/feature/`)

アプリケーションの主要な機能を提供するコンポーネント群です。多くはJotai Atomsやカスタムフックと連携し、状態を持ちます。

| コンポーネント | 責務 | 依存するState/Hook |
|----------------|------|--------------------|
| **PitchSettingForm** | 構成音の入力フォーム。12 音のワンタップグリッド (`aria-pressed`, 44px 高) とオクターブのセグメント (`OCTAVE_NUM_LIST`)、マイク入力と同じ行の「C4 を追加」ボタン (選択中の音名を表示、スクロール不要・追加後は aria-live で「追加しました」を表示) で追加する。根音/計測対象のタップ行 (44px 以上) はその下に置く。 | `pitchListAtom`, `addOrUpdatePitchAtom` |
| **PitchList** | 現在設定されている構成音のチップ一覧 (削除は 44px の `×`、`aria-label="C4 を削除"`)。根音推定・全クリア (44px)。設定ドロワーの先頭に配置。 | `pitchListAtom`, `removePitchAtom`, `rootEstimation` |
| **AnalysisControl** | 解析の開始・停止ボタン。解析中の状態表示。`topSlot` に PresetSwitcher を載せる (固定バー全体の高さは約 12rem。`App.tsx` の下余白と SettingsDrawer の左端ゾーンの `bottom` が同値に依存)。マイク取得失敗時はインラインの閉じられるエラーバナー (`error`, `onDismissError`) を表示。 | `useAudioAnalysis` (`error`, `dismissError`) |
| **AnalysisResult** | **[廃止予定]** 旧形式の解析結果表示。現在は `UnifiedFeedback` に移行中。 | `analysisResult` |
| **SettingsForm** | 音声解析の設定。数値入力は `inputMode` 指定・44px 高・16px フォント、A4 周波数は −/＋ ステッパー (430-450Hz にクランプ)。高度な設定はアコーディオン。 | `audioSettingsAtoms` |
| **CentDisplay** | 解析結果の数値詳細表示。構成音ごとの行に音名・音程・平均律との差と、平均律/純正律の再生トグル (`aria-pressed`, 44px 高) を並べる。 | `analysisResult` |
| **FeedbackTypeSwitch** | メイン画面のフィードバックカードヘッダに置く 3 分割のセグメント (`role=radiogroup`, 各 44px 高、ラベルは `FEEDBACK_TYPE_LABELS`)。`feedbackTypeAtom` を設定ドロワーの FeedbackTypeSelector と共有 (同じ localStorage 永続化)。 | `feedbackTypeAtom` |
| **UnifiedFeedback** | フィードバック形式 (メーター/バー/サークル) の描画。カードのヘッダに FeedbackTypeSwitch を置き、カード上の横スワイプ (`useSwipeNav`、60px またはフリング、`touch-action: pan-y`、左端 24px 起点は無視) で前後の形式へ移動。切替時はカード本体が左右からスライドイン (reduced-motion では無効)。 | `feedbackTypeAtom` |
| **PresetManager** | プリセットの保存・読み込み・削除機能 (設定ドロワー内)。一覧は共有 atom `presetsAtom` で、保存・削除後に `refreshPresetsAtom` で再読み込みする。 | `presetsAtom`, `refreshPresetsAtom`, `localStorage` |
| **PresetSwitcher** | メイン画面の下部固定バー (AnalysisControl の `topSlot`) に置く、プリセットの横スクロールチップ列 (スナップ・スクロールバー非表示・44px 高)。タップで確認なしに即 `loadPresetAtom`。現在の構成音と一致するチップを `aria-pressed` で強調し、各チップに構成音 (根音は太字) を併記。プリセット 0 件のときは設定ドロワーを開くヒントを表示。 | `presetsAtom`, `pitchListAtom`, `loadPresetAtom` |
| **PresetList** | 保存されたプリセットの一覧表示。 | `presets` |
| **LogExportButton** | 実験モード用。解析ログの特定期間記録とCSVエクスポート。 | `useLogRecorder` |
| **AnalysisControl** | 解析の開始/停止を制御するボタン。 | `startProcessing`, `stopProcessing` |

---

## 3. Feedback Components (`components/feedback/`)

音声解析結果（Deviation / Cent）を受け取り、視覚的に表現するコンポーネント群です。これらは「プレゼンテーションコンポーネント」として設計され、原則として内部状態を持ちません。

| コンポーネント | 責務 | Props |
|----------------|------|-------|
| **UnifiedFeedback** | フィードバック表示のコンテナ。設定に応じて以下のコンポーネントを切り替える。 | `feedbackType`, `analysisData` |
| **MeterFeedback** | アナログメーター風の表示。針の角度でズレを表現。ホールド機能に対応。 | `deviation`, `pitch` |
| **BarFeedback** | シンプルなバーグラフ表示。1 つのカード内に音ごとの行 (左に音名、右にバー) と共通の目盛り凡例を並べる。 | `deviation`, `pitch` |
| **CircleFeedback** | 12音を円周状に配置し、和音の形（Geometry）を可視化。 | `pitchList`, `deviations` |
| **NumericFeedback** | シンプルな数値のみの表示。デバッグや精密確認用。 | `centDeviation` |
| **WaveformFeedback** | **[実験的]** 波形表示。 | `analyserNode` |

---

## 4. Layout Components (`components/layout/`)

ページ全体の構造を定義するコンポーネントです。

| コンポーネント | 責務 |
|----------------|------|
| **AppFooter** | 著作権表示と GitHub リンク。設定ドロワー末尾に配置。 |
| **SettingsDrawer** | 設定画面の左スライドインシート (スマホでは全幅、ヘッダーはタイトル+44px の閉じるボタンで sticky、`env(safe-area-inset-*)` 対応)。セクション順: 現在の評価対象音 → 音の追加 → プリセット → 構成音の自動検出 → フィードバック形式 → 解析設定 (高度な設定) → フッター。 左スワイプで閉じ、画面左端 (約22px の専用ゾーン。アプリバー・下部バーは避ける) からの右スワイプで開ける (`lib/hooks/useSwipeDrawer.ts`: 指に追従、約35%超またはフリングで閉じ、足りなければ戻る。縦スクロール・スライダー・入力欄は除外、左端開きはタッチ入力のみで iOS はインストール済み PWA のときだけ有効 (Safari の戻るジェスチャと競合するため。判定は `lib/platform.ts`)、`prefers-reduced-motion` ではアニメーションなし)。開いている間は履歴エントリを 1 つ積み、戻る操作で閉じる (`lib/hooks/useBackButtonClose.ts`、UI 操作で閉じたときは `history.back()` で取り除く。ダイアログにも再利用可)。 |
| **SettingsSection** | ドロワー用の軽量セクション (小さな見出し + 淡い背景のグループ)。`TAP_ROW` / `FIELD_TOUCH` / `SELECT_TOUCH` のタッチ向け共通クラスも提供。 |

---

## 5. UI Primitives (`components/ui/`)

[shadcn/ui](https://ui.shadcn.com/) をベースにした再利用可能なUI部品です。Radix UIをラップしており、アクセシビリティ（A11y）に配慮されています。

**主要なコンポーネント**:
- `Button`: ボタン
- `Input`, `Select`, `Slider`, `Switch`: フォーム要素。`Checkbox` の `touch` プロップと `Switch` の `size="touch"` は 44px のタップ領域を持つ (設定ドロワー用。既定の見た目は実験フロー向けに不変)
- `Dialog`, `Sheet` (Drawer): モーダル・オーバーレイ
- `Accordion`: 折りたたみ表示
- `Card`: コンテンツコンテナ
- `Table`: データ表示

---

## 6. 実験モード用コンポーネント

`components/feature/experiment/` に配置されています。

- **ExperimentModePanel**: 実験ページ専用の統合パネル。ログ記録ボタンやデバッグ表示を含む。
- **PeakSearchBinsPanel**: ピーク探索範囲のスペクトルをグラフ化するデバッグ用コンポーネント。

---

## 7. コンポーネント設計の指針

1. **Atomic Designの意識**:
   - `ui/` = Atoms
   - `feedback/` = Molecules
   - `feature/` = Organisms
   - `layout/` = Templates
   
2. **Container/Presenter パターン**:
   - 状態管理は `apps/web/src/App.tsx` や `feature/` コンポーネント（Container）で行う
   - `feedback/` コンポーネント（Presenter）はデータを受け取って描画するだけにする

3. **コンポジション**:
   - 巨大なコンポーネントを作らず、小さな部品を組み合わせて構成する
   - 例: `UnifiedFeedback` は `MeterFeedback` などを条件分岐でレンダリングする
