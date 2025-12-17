/**
 * ChordLens 型定義ファイル
 * プロジェクト全体で使用される型を集約管理
 */

import { z } from "zod";
import { PITCH_NAME_LIST } from "@/lib/constants";

// ========================================
// フォーム関連の型定義
// ========================================

/**
 * ピッチ設定フォームのバリデーションスキーマ
 */
export const FormSchema = z.object({
  pitchName: z.string().refine((val) => PITCH_NAME_LIST.includes(val), {
    message: "音名を選択してください",
  }),
  octaveNum: z.coerce.number({
    required_error: "オクターブ番号を選択してください",
  }),
  isRoot: z.boolean().optional(),
  enabled: z.boolean().optional().default(true),
});

/**
 * ピッチ（音高）を表す型
 * 音名、オクターブ番号、ルート音フラグから構成される
 */
export type Pitch = z.infer<typeof FormSchema>;

// 後方互換性のためのエイリアス（非推奨）
/** @deprecated `Pitch` を使用してください */
export type formType = Pitch;

// ========================================
// プリセット関連の型定義
// ========================================

/**
 * プリセット（保存された和音設定）の型定義
 */
export interface PitchPreset {
  /** UUID v4形式の一意識別子 */
  id: string;
  /** ユーザー指定の名前（1～30文字） */
  name: string;
  /** 構成音リスト */
  pitchList: Pitch[];
  /** 作成日時（Unix timestamp ミリ秒） */
  createdAt: number;
}

/**
 * プリセットデータ全体の型定義
 * LocalStorageに保存される形式
 */
export interface PresetsData {
  /** スキーマバージョン（現在: 1） */
  version: number;
  /** プリセット配列 */
  presets: PitchPreset[];
}

// ========================================
// フィードバック関連の型定義
// ========================================

/**
 * フィードバック表示形式の型
 * "meter" | "strobe" | "bar" | "numeric" | "waveform"
 *
 * Note: lib/constants.tsで定義されているFEEDBACK_TYPESから派生
 */
export type { FeedbackType } from "@/lib/constants";

// ========================================
// オーディオ解析関連の型定義
// ========================================

/**
 * オーディオ解析の結果を表す型
 */
export interface AnalysisResult {
  /** 検出された音高のリスト */
  detectedPitches: Pitch[];
  /** 各音高の純正律からの偏差（セント） */
  deviations: (number | null)[];
  /** スペクトル評価が成功したかどうか */
  isValid: boolean;
}

/**
 * useAudioAnalysisフックのprops型定義
 */
export interface UseAudioAnalysisProps {
  currentPitchList: Pitch[];
  evalRangeCents: number;
  a4Freq: number;
  evalThreshold: number;
  fftSize: number;
  smoothingTimeConstant: number;
}

// ========================================
// コンポーネントprops関連の型定義
// ========================================

/**
 * SettingsFormコンポーネントのprops型定義
 */
export interface SettingsFormProps {
  onEvalRangeChange: (value: number) => void;
  onA4FreqChange: (value: number) => void;
  onEvalThresholdChange: (value: number) => void;
  onFftSizeChange: (value: number) => void;
  onSmoothingTimeConstantChange: (value: number) => void;
}

// ========================================
// ログ記録関連の型定義（評価実験用）
// ========================================

/**
 * ログエントリの型定義
 * 1回の解析結果を記録
 */
export interface LogEntry {
  /** ISO 8601形式の日時文字列（ミリ秒・タイムゾーン付き） */
  timestamp: string;
  /** セッション開始からの経過ミリ秒 */
  elapsedMs: number;
  /** セッションID（UUID） */
  sessionId: string;
  /** 構成音リスト */
  pitchList: Pitch[];
  /** 解析結果（deviation値 -1.0 ~ 1.0） */
  analysisResult: (number | null)[];
  /** セント単位のズレ */
  centDeviations: (number | null)[];
  /** 解析設定 */
  settings: {
    a4Freq: number;
    evalRangeCents: number;
    evalThreshold: number;
    fftSize: number;
    smoothingTimeConstant: number;
  };
}

/**
 * ログセッションの型定義
 * 1回の実験セッション全体のログを管理
 */
export interface LogSession {
  /** セッションID（UUID） */
  sessionId: string;
  /** ISO 8601形式の開始日時 */
  startTime: string;
  /** ISO 8601形式の終了日時 */
  endTime: string | null;
  /** ログエントリの配列 */
  entries: LogEntry[];
  /** メタデータ */
  metadata: {
    /** ブラウザのUser-Agent文字列 */
    userAgent: string;
    /** 実験条件（任意） */
    experimentCondition?: string;
    /** 被験者ID（任意） */
    participantId?: string;
  };
}
