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
| **AnalysisControl** | 解析の開始・停止ボタン。解析中の状態表示。`topSlot` に PresetSwitcher を載せる (固定バー全体の高さは約 12rem。`App.tsx` の下余白が同値に依存)。マイク取得失敗時はインラインの閉じられるエラーバナー (`error`, `onDismissError`) を表示。`autoStopped` が true (背面移行で自動停止した直後) のとき、状態表示行に「バックグラウンドに移ったため解析を停止しました」を出し、開始ボタンはそのまま押せる (`App.tsx` が `useAutoStopOnHidden` の結果を渡し、開始タップで解除)。実測した高さを CSS 変数 `--bottom-bar-h` に公開し Toaster の位置に使う。 | `useAudioAnalysis` (`error`, `dismissError`) |
| **AnalysisResult** | **[廃止予定]** 旧形式の解析結果表示。現在は `UnifiedFeedback` に移行中。 | `analysisResult` |
| **SettingsForm** | 音声解析の設定。数値入力は `inputMode` 指定・44px 高・16px フォント、A4 周波数は −/＋ ステッパー (430-450Hz にクランプ)。高度な設定はアコーディオン。 | `audioSettingsAtoms` |
| **CentDisplay** | 解析結果の数値詳細表示。構成音ごとの行に音名・音程・平均律との差と、平均律/純正律の再生トグル (`aria-pressed`, 44px 高) を並べる。 | `analysisResult` |
| **FeedbackTypeSwitch** | **評価実験画面専用**。フィードバックカードヘッダに置く 3 分割のセグメント (`role=radiogroup`, 各 44px 高、ラベルは `FEEDBACK_TYPE_LABELS`)。被験者条件を変えないため従来の 3 形式 (`LEGACY_FEEDBACK_TYPES`) のみを扱い、メイン画面専用の形式が保存されていればメーターとして扱う (`toLegacyFeedbackType`)。 | `feedbackTypeAtom` |
| **UnifiedFeedback** | **評価実験画面専用**のフィードバック表示 (メーター/バー/サークル、従来の描画)。カードのヘッダに FeedbackTypeSwitch を置き、横スワイプで前後の形式へ移動。メイン画面は FeedbackCarousel を使う。 | `feedbackTypeAtom` |
| **FeedbackCarousel** | メイン画面のフィードバック表示。全形式 (`FEEDBACK_TYPES`) をカルーセルで並べ、タブは置かない。横スワイプ (`useSwipeNav`、60px またはフリング、`touch-action: pan-y`、左端 24px 起点は無視) で前後の形式へ移り、操作中はカードが指に追従 (`onDrag`、端の形式では抵抗 0.25)。確定時はカードが左右からスライドイン (reduced-motion では無効)。スワイプできない環境向けに前後ボタン (44px) と現在位置のドット・形式名を出す。`header` に ChordHeader を載せ、`transitioning` (和音の切替中) はカードを灰色に落として「和音を判定中…」を重ねる (軌跡は切替区間を自前で描くため対象外)。 | `feedbackTypeAtom` |
| **ChordHeader** | カルーセル上部の和音名ヘッダ。1 台を全員で見る前提で和音名 (`nameChord`)・根音を大きく出し、追従状態 (手動 / 待機 / 追従中 / 判定中 / 固定中) を `role=status` で示す。自動追従中は和音の固定ボタン (`aria-pressed`, 44px) を出す。 | `chordFollowEnabledAtom`, `chordFollowStatusAtom`, `chordFollowPendingAtom`, `chordFollowLockedAtom` |
| **PresetManager** | プリセットの保存・読み込み・削除機能 (設定ドロワー内)。一覧は共有 atom `presetsAtom` で、保存・削除後に `refreshPresetsAtom` で再読み込みする。 | `presetsAtom`, `refreshPresetsAtom`, `localStorage` |
| **PresetSwitcher** | メイン画面の下部固定バー (AnalysisControl の `topSlot`) に置く、プリセットの横スクロールチップ列 (スナップ・スクロールバー非表示・44px 高)。タップで確認なしに即 `loadPresetWithUndoAtom` (直前と内容が違えば「元に戻す」通知)。現在の構成音と一致するチップを `aria-pressed` で強調し、各チップに構成音 (根音は太字) を併記。プリセット 0 件のときは設定ドロワーを開くヒントを表示。 | `presetsAtom`, `pitchListAtom`, `loadPresetWithUndoAtom` |
| **PresetList** | 保存されたプリセットの一覧表示。削除は確認なしで実行し、トーストの「元に戻す」で復元 (読み込みは従来どおり確認ダイアログ)。 | `presets`, `deletePresetWithUndoAtom` |
| **Toaster** | 「元に戻す」付きの通知を 1 件だけ表示 (約 5 秒で自動消去、新しい通知が置き換え)。`App.tsx` に 1 つ置く。`aria-live="polite"` のリージョンを常設し、下部固定バーの真上 (`--bottom-bar-h` を AnalysisControl が実測して公開) に `z-60` で表示。設定ドロワー表示中も押せるよう pointerdown/focus を止めて Radix のモーダルが閉じないようにし、アクションは 44px 以上。 | `toastAtom`, `dismissToastAtom` |
| **LogExportButton** | 実験モード用。解析ログの特定期間記録とCSVエクスポート。 | `useLogRecorder` |
| **AnalysisControl** | 解析の開始/停止を制御するボタン。 | `startProcessing`, `stopProcessing` |

---

## 3. Feedback Components (`components/feedback/`)

音声解析結果（Deviation / Cent）を受け取り、視覚的に表現するコンポーネント群です。これらは「プレゼンテーションコンポーネント」として設計され、原則として内部状態を持ちません。

| コンポーネント | 責務 | Props |
|----------------|------|-------|
| **UnifiedFeedback** | 評価実験画面のフィードバック表示のコンテナ (従来の 3 形式)。 | `feedbackType`, `analysisData` |
| **FeedbackSlide** | メイン画面のカルーセルの 1 枚。形式に応じて以下を enhanced 表示で描く。 | `feedbackType`, `analysisData`, `transitioning` |
| **MeterFeedback** | アナログメーター風の表示。針の角度でズレを表現。ホールド機能に対応。`variant="enhanced"` (メイン画面) では針・凡例を役割 (度数) の色にし、凡例を声部順に「長3度 E4」で出し、和音が変わったら針の状態を捨てる。`hideHeader` でカードヘッダを省く。 | `deviation`, `pitch`, `variant` |
| **BarFeedback** | バーグラフ表示 (1 行)。`BarListFeedback` (メイン画面) は上から高い声部の順に並べ、最低 4 行を確保し、役割ラベル・平均律との差・セント値を出す。 | `deviation`, `pitch`, `enhanced` |
| **CircleFeedback** | 12音を円周状に配置し、和音の形（Geometry）を可視化。`layout` で半音順/5度圏、`variant="enhanced"` で塗りを偏差に応じた連続色に、針の振れを平方根で拡大し、中央に和音名。`CircleSlide` (メイン画面) は並び順を `circleLayoutAtom` から読む。 | `analysisData`, `layout`, `variant` |
| **VoiceLanesFeedback** | 声部レーン形式。声部 (音の高さ順) ごとの縦レーンを低い声部から左に並べ、役割・音名・偏差・方向の指示 (上げる/下げる)・平均律との差を出す。最低 4 レーンを確保して幅を固定。 | `analysisData`, `evalRangeCents` |
| **PurityFeedback** | 純正度インジケータ形式。最大絶対偏差 (`summarizePurity`) をリングと大きな数値で出し、最もずれた音と直す方向、全音の内訳を並べる。 | `analysisData`, `evalRangeCents` |
| **TrajectoryFeedback** | ピッチ軌跡形式。直近 10 秒の偏差を声部ごとの線 (役割の色) で描き、和音ごとの区間に帯と和音名を付ける。切替区間 (判定中とその直前 0.5 秒、`TrajectoryBuffer`) は灰色の帯・破線。 | `analysisData`, `transitioning` |
| **NumericFeedback** | シンプルな数値のみの表示。デバッグや精密確認用。 | `centDeviation` |
| **WaveformFeedback** | **[実験的]** 波形表示。 | `analyserNode` |

---

## 4. Layout Components (`components/layout/`)

ページ全体の構造を定義するコンポーネントです。

| コンポーネント | 責務 |
|----------------|------|
| **AppFooter** | 著作権表示と GitHub リンク。設定ドロワー末尾に配置。 |
| **SettingsDrawer** | 設定画面の左スライドインシート (スマホでは全幅、ヘッダーはタイトル+44px の閉じるボタンで sticky、`env(safe-area-inset-*)` 対応)。セクション順: 現在の評価対象音 → 音の追加 → プリセット → 構成音の自動検出 → フィードバック形式 → 解析設定 (高度な設定) → フッター。 左スワイプで閉じる (`lib/hooks/useSwipeDrawer.ts`: タッチ/ペンのみ、指に追従、約35%超またはフリングで閉じ、足りなければ戻る。縦スクロール・スライダー・入力欄は除外、`prefers-reduced-motion` ではアニメーションなし)。画面左端からのスワイプで開く操作は、効果が薄く誤作動が多いため採用しない。 |
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
