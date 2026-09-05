# コンポーネントリファレンス (Components Reference)

ChordLensのUIコンポーネント構造と各コンポーネントの責務について解説します。

---

## 1. コンポーネント構成

```
components/
├── feature/      # 機能コンポーネント（ドメインロジックを含む）
├── feedback/     # フィードバック表示（視覚化に特化）
└── layout/       # レイアウト（ヘッダー、フッター、ドロワー）
```

---

## 2. Feature Components (`components/feature/`)

アプリケーションの主要な機能を提供するコンポーネント群です。多くはJotai Atomsやカスタムフックと連携し、状態を持ちます。

| コンポーネント | 責務 | 依存するState/Hook |
|----------------|------|--------------------|
| **PitchSettingForm** | 構成音の入力フォーム。音名・オクターブ・根音を選択して追加する。 | `pitchListAtom`, `addOrUpdatePitchAtom` |
| **PitchList** | 現在設定されている構成音の一覧表示。削除や根音変更、プリセット操作のトリガー。 | `pitchListAtom`, `removePitchAtom`, `rootEstimation` |
| **AnalysisControl** | 解析の開始・停止ボタン。解析中の状態表示。 | `useAudioAnalysis` |
| **AnalysisResult** | **[廃止予定]** 旧形式の解析結果表示。現在は `UnifiedFeedback` に移行中。 | `analysisResult` |
| **SettingsForm** | 音声解析や表示の設定パネル。 | `audioSettingsAtoms` |
| **CentDisplay** | 解析結果の数値詳細表示。和音名やセント差分を表形式で出す。 | `analysisResult` |
| **PresetManager** | プリセットの保存・読み込み・削除機能。 | `localStorage` |
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
| **BarFeedback** | シンプルなバーグラフ表示。複数の音をコンパクトに並べるのに適している。 | `deviation`, `pitch` |
| **CircleFeedback** | 12音を円周状に配置し、和音の形（Geometry）を可視化。 | `pitchList`, `deviations` |
| **NumericFeedback** | シンプルな数値のみの表示。デバッグや精密確認用。 | `centDeviation` |
| **WaveformFeedback** | **[実験的]** 波形表示。 | `analyserNode` |

---

## 4. Layout Components (`components/layout/`)

ページ全体の構造を定義するコンポーネントです。

| コンポーネント | 責務 |
|----------------|------|
| **MainHeader** | アプリケーションタイトル、GitHubリンク、設定ボタンの配置。 |
| **AppFooter** | フッター情報の表示。 |
| **SettingsDrawer** | モバイル対応の設定画面スライドインメニュー。`SettingsForm` を内包する。 |

---

## 5. UI ライブラリ (Ionic React)

[Ionic React](https://ionicframework.com/docs/react) 9 を使用しています。Web Components ベースで
アクセシビリティ（A11y）に配慮されており、`apps/web/components/` の各コンポーネントが直接
Ionic コンポーネントを組み合わせて構築します（`components/ui/` のような共通プリミティブ層は持たない）。

- **画面構成**: `IonMenu` によるサイドメニュー構成（設定パネルを内包し、`IonMenuButton` で開閉）
- **スタイリング**: Ionic ユーティリティクラス（`ion-padding`, `ion-text-center` 等）+
  CSS Modules（コンポーネントごとの `*.module.css`）
- **配色**: `src/globals.css` の Ionic 色変数（`--ion-color-*`）で定義。現行の slate 配色を踏襲し、
  OS のダーク設定に追従する
- **アイコン**: [ionicons](https://ionic.io/ionicons)

**主要なコンポーネント**:
- `IonButton`: ボタン
- `IonInput`, `IonSelect`, `IonRange`, `IonToggle`, `IonCheckbox`: フォーム要素
- `IonModal`, `IonAlert`, `IonToast`: モーダル・オーバーレイ
- `IonAccordion`: 折りたたみ表示
- `IonCard`: コンテンツコンテナ
- `IonList`, `IonItem`: データ・リスト表示

---

## 6. 実験モード用コンポーネント

`components/feature/experiment/` に配置されています。

- **ExperimentModePanel**: 実験ページ専用の統合パネル。ログ記録ボタンやデバッグ表示を含む。
- **PeakSearchBinsPanel**: ピーク探索範囲のスペクトルをグラフ化するデバッグ用コンポーネント。

---

## 7. コンポーネント設計の指針

1. **Atomic Designの意識**:
   - Ionic React コンポーネント = Atoms
   - `feedback/` = Molecules
   - `feature/` = Organisms
   - `layout/` = Templates
   
2. **Container/Presenter パターン**:
   - 状態管理は `apps/web/src/App.tsx` や `feature/` コンポーネント（Container）で行う
   - `feedback/` コンポーネント（Presenter）はデータを受け取って描画するだけにする

3. **コンポジション**:
   - 巨大なコンポーネントを作らず、小さな部品を組み合わせて構成する
   - 例: `UnifiedFeedback` は `MeterFeedback` などを条件分岐でレンダリングする
