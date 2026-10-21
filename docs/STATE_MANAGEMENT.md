# 状態管理 (State Management)

ChordLensでは、軽量かつ柔軟な状態管理ライブラリである[Jotai](https://jotai.org/)を採用しています。各状態は「Atom」と呼ばれる単位で管理され、コンポーネント間で効率的に共有されます。

---

## 1. 状態管理の設計方針

- **アトミック性**: 状態を最小単位（Atom）に分割し、必要なコンポーネントだけが再レンダリングされるようにする
- **永続化**: ユーザー設定は`localStorage`に自動保存し、リロード後も設定を維持する
- **関心の分離**: 音声設定、構成音リスト、UI状態を個別のファイルに分割して管理する

---

## 2. Store構造

`apps/web/lib/store/` ディレクトリ配下に以下のファイルで構成されています。

```
apps/web/lib/store/
├── index.ts                # エントリーポイント（全Atomをエクスポート）
├── audioSettingsAtoms.ts   # 音声解析の設定（FFTサイズ、A4周波数など）
├── pitchListAtoms.ts       # 構成音リストの管理
└── feedbackAtoms.ts        # フィードバック表示設定
```

### 2.1. Audio Settings Atoms (`audioSettingsAtoms.ts`)

音声解析エンジンの挙動を制御する設定群です。すべて`atomWithStorage`を使用しており、ブラウザの`localStorage`に永続化されます。

| Atom名 | 型 | デフォルト値 | 説明 | Storage Key |
|--------|----|------------|------|-------------|
| `evalRangeCentsAtom` | `number` | `50` | 評価範囲（±セント） | `chordlens-evalRangeCents` |
| `a4FreqAtom` | `number` | `442` | 基準周波数（Hz） | `chordlens-a4Freq` |
| `fftSizeAtom` | `number` | `32768` | FFTサイズ | `chordlens-fftSize` |
| `smoothingTimeConstantAtom` | `number` | `0.8` | 平滑化定数 | `chordlens-smoothingTimeConstant` |
| `evalThresholdAtom` | `number` | `-100` | 評価閾値（dB） | `chordlens-evalThreshold` |
| `holdEnabledAtom` | `boolean` | `true` | 表示ホールド機能 | `chordlens-holdEnabled` |

**派生Atom**:
- `sensitivityAtom`: UI用の感度（0-100）と内部dB値（-60〜-140）を相互変換するRead-Write Atom。
- `experimentModeAtom`: 実験モードのON/OFF（永続化しない）。

### 2.2. Pitch List Atoms (`pitchListAtoms.ts`)

解析対象となる構成音リストを管理します。

| Atom名 | 役割 | 説明 |
|--------|------|------|
| `pitchListAtom` | State | 現在の構成音リスト（`Pitch[]`）を保持 |
| `addOrUpdatePitchAtom` | Action | 構成音を追加または更新（重複チェックあり） |
| `removePitchAtom` | Action | 指定インデックスの構成音を削除 |
| `clearPitchListAtom` | Action | リストを全消去 |
| `loadPresetAtom` | Action | プリセットからリストを一括読み込み |
| `setRootAtom` | Action | 指定した音を根音（ルート）に設定 |

#### 「元に戻す」付きの操作 (`undoAtoms.ts`)

メインアプリ (設定ドロワー・プリセット切替) 専用。実験フローは従来の `removePitchAtom` / `loadPresetAtom` 等をそのまま使い、挙動は変わらない。実行後に `showToastAtom` で取り消し用トーストを出す。

| Atom名 | 役割 | 取り消しの内容 |
|--------|------|----------------|
| `removePitchWithUndoAtom` | 構成音を 1 つ削除 | 元の index に `isRoot` / `enabled` ごと挿入 (`core/undo/listOps.insertAt`) |
| `clearPitchListWithUndoAtom` | 全クリア | クリア前のリスト全体を復元 |
| `loadPresetWithUndoAtom` | プリセット読み込み (メイン画面のチップ) | 直前のリストへ戻す。内容が同じ (`pitchListEquals`) なら通知しない |
| `deletePresetWithUndoAtom` | プリセット削除 (確認ダイアログなし) | `restorePreset` で同じ id・名前・`createdAt` (= 並び順) のまま復元 |

### 2.2c. Toast Atoms (`toastAtoms.ts`)

| Atom名 | 役割 | 説明 |
|--------|------|------|
| `toastAtom` | State | 表示中の通知 (`{ id, message, actionLabel?, onAction? }`) または `null`。同時に 1 件のみ |
| `showToastAtom` | Action | 通知を表示。新しい通知は古いものを置き換える (`id` が変わりタイマーを張り直す) |
| `dismissToastAtom` | Action | 通知を閉じる |

表示時間は `TOAST_DURATION_MS` (5 秒)。タイマーは `Toaster` コンポーネントが持つ。

### 2.2b. Preset Atoms (`presetAtoms.ts`)

保存済みプリセット一覧を設定ドロワーとメイン画面で共有します。永続化は `lib/presets.ts` (localStorage)。

| Atom名 | 役割 | 説明 |
|--------|------|------|
| `presetsAtom` | State | 保存済みプリセット (`PitchPreset[]`) の読み込みキャッシュ |
| `refreshPresetsAtom` | Action | localStorage から再読み込み (マウント時・保存/削除後に呼ぶ) |

### 2.3. Feedback Atoms (`feedbackAtoms.ts`)

視覚フィードバックの表示形式を管理します。

| Atom名 | 型 | デフォルト値 | Storage Key |
|--------|----|------------|-------------|
| `feedbackTypeAtom` | `FeedbackType` (`FEEDBACK_TYPES`) | `"trajectory"` | `feedbackType` |
| `experimentFeedbackTypeAtom` | `LegacyFeedbackType` (`LEGACY_FEEDBACK_TYPES`) | `"meter"` | `experimentFeedbackType` |
| `circleLayoutAtom` | `"chromatic" \| "fifths"` | `"chromatic"` | `circleLayout` |

メイン画面の `FeedbackCarousel` (横スワイプ・前後ボタン) と、設定ドロワーの `FeedbackTypeSelector` は同じ atom を読み書きするため常に同期します。評価実験画面の `FeedbackTypeSwitch` / `UnifiedFeedback` / `PracticeWithTuner` は別の `experimentFeedbackTypeAtom` を使い、メイン画面の操作で実験条件が変わらないようにしています。`experimentFeedbackType` が未保存の場合は、分離前に共有していた `feedbackType` の値を (従来の 3 形式であれば) 引き継ぎます。`circleLayoutAtom` はメイン画面のサークルのみが参照します。

**カスタムストレージロジック**:
`localStorage`に不正な値が入っていた場合、アプリケーションがクラッシュしないよう、読み込み時にバリデーション（`FEEDBACK_TYPES.includes` / `LEGACY_FEEDBACK_TYPES.includes` / `CIRCLE_LAYOUTS.includes`）を行い、無効な値はデフォルト値にフォールバックします。

### 2.4. Chord Detection Atoms (`chordDetectionAtoms.ts`)

構成音の自動追従の状態を、設定ドロワーのトグルと App 常駐の `useChordFollow`、メイン画面の `ChordHeader` / `FeedbackCarousel` の間で共有します。いずれも永続化しません。

| Atom名 | 型 | 説明 |
|--------|----|------|
| `chordFollowEnabledAtom` | `boolean` | 自動追従モードの ON/OFF |
| `chordFollowStatusAtom` | `"idle" \| "listening" \| "tracking"` | 追従ループの状態 |
| `chordFollowErrorAtom` | `string \| null` | 追従ループのエラー |
| `chordFollowPendingAtom` | `boolean` | 推定中の和音が確定値と食い違う (切替中)。フィードバックを灰色にする |
| `chordFollowLockedAtom` | `boolean` | 和音の固定。推定は続け、構成音リストへの反映だけを止める |

---

## 3. 使用例

### コンポーネントでの利用

```tsx
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { 
  a4FreqAtom, 
  pitchListAtom, 
  addOrUpdatePitchAtom 
} from "@/lib/store";

export function ExampleComponent() {
  // 値の読み取りのみ（再レンダリング最適化）
  const pitchList = useAtomValue(pitchListAtom);
  
  // 値の読み書き
  const [a4Freq, setA4Freq] = useAtom(a4FreqAtom);
  
  // 更新関数のみ（レンダリングに依存しない）
  const addPitch = useSetAtom(addOrUpdatePitchAtom);

  return (
    <div>
      <p>A4 Frequency: {a4Freq}Hz</p>
      <button onClick={() => setA4Freq(440)}>Reset A4</button>
      
      <button onClick={() => addPitch({ 
        pitchName: "C", 
        octaveNum: 4, 
        enabled: true 
      })}>
        Add C4
      </button>
    </div>
  );
}
```

### 永続化の仕組み

`atomWithStorage`を使用することで、`set`関数を呼ぶだけで自動的にlocalStorageへの書き込みが行われます。また、ページロード時にlocalStorageから初期値を復元するため、`useEffect`での手動読み込みは不要です。

```typescript
// 定義側
export const a4FreqAtom = atomWithStorage<number>("chordlens-a4Freq", 442);

// 利用側
const [freq, setFreq] = useAtom(a4FreqAtom);
setFreq(440); // -> localStorageに "chordlens-a4Freq": "440" が即座に保存される
```

---

## 4. 依存関係図

```mermaid
graph TD
    UI[UI Components]
    
    subgraph Store
        P[pitchListAtom]
        S[audioSettingsAtom]
        F[feedbackTypeAtom]
        
        Action[Actions<br/>add/remove/update]
    end
    
    subgraph Storage[localStorage]
        LK[chordlens-evalRangeCents]
        LA[chordlens-a4Freq]
        LF[feedbackType]
    end

    UI -->|useAtomValue| P
    UI -->|useAtomValue| S
    UI -->|useAtom| F
    UI -->|useSetAtom| Action
    
    Action -->|update| P
    
    S <-->|sync| LK & LA
    F <-->|sync| LF
```
