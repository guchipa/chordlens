/**
 * /experiments フロー用の型定義
 */
import type { Pitch } from "@chordlens/core/types";
import type { ChordKey, Condition } from "./constants";

export type Phase =
  | "survey"
  | "test1"
  | "practice"
  | "test2"
  | "post-survey"
  | "complete";

export interface ExperimentMember {
  instrument: string;
  experienceYears: number;
  pitchMatchingSkill: number;
  chordEvaluationSkill: number;
  justIntonationFamiliarity: "none" | "heard" | "understand" | "conscious";
}

export interface PartAssignment {
  /** 担当音（実音）の音名（"D", "F", "Eb", "G", "A" など） */
  memberA: string;
  memberB: string;
}

export interface ChordPartAssignments {
  Bb: PartAssignment;
  Cm: PartAssignment;
  F7: PartAssignment;
}

export interface ChordPitches {
  Bb: Pitch[];
  Cm: Pitch[];
  F7: Pitch[];
}

export interface PreSurveyAnswers {
  memberA: ExperimentMember;
  memberB: ExperimentMember;
}

export interface PostSurveyAnswers {
  improvementPerceived: number; // 5 段階
  clarityOfPitchDirection?: number; // cond=with のみ
  freeText?: string;
}

export interface UsabilitySurveyAnswers {
  practiceQuality: number;
  tunerUndetected: number;
  deviationClarity: number;
  continuedUse: number;
}

export interface PendingUpload {
  id: string;
  pairId: string;
  phase: "test1" | "test2";
  chord: ChordKey;
  attempt: number;
  final: boolean;
  mimeType: string;
  durationMs: number;
  rootFreqHz: number;
  audioBlobUrl: string; // ObjectURL — reload 後は無効になる点に注意
  csvText: string;
  createdAt: number;
}

export interface ExperimentSessionState {
  pairId: string;
  condition: Condition;
  phase: Phase;
  members: [ExperimentMember | null, ExperimentMember | null];
  partAssignment: ChordPartAssignments | null;
  chordPitches: ChordPitches | null;
  preSurvey: PreSurveyAnswers | null;
  postSurveyA: PostSurveyAnswers | null;
  postSurveyB: PostSurveyAnswers | null;
  usabilitySurveyA: UsabilitySurveyAnswers | null;
  usabilitySurveyB: UsabilitySurveyAnswers | null;
  pendingUploads: PendingUpload[];
  /** 各 chord の attempt カウンタ（test1/test2 別） */
  attemptCounters: {
    test1: Record<ChordKey, number>;
    test2: Record<ChordKey, number>;
  };
  /** 各 chord の final に採用した attempt 番号 */
  finalizedAttempts: {
    test1: Partial<Record<ChordKey, number>>;
    test2: Partial<Record<ChordKey, number>>;
  };
  startedAt: number | null;
}

export function createInitialSession(
  pairId: string,
  condition: Condition
): ExperimentSessionState {
  return {
    pairId,
    condition,
    phase: "survey",
    members: [null, null],
    partAssignment: null,
    chordPitches: null,
    preSurvey: null,
    postSurveyA: null,
    postSurveyB: null,
    usabilitySurveyA: null,
    usabilitySurveyB: null,
    pendingUploads: [],
    attemptCounters: {
      test1: { Bb: 0, Cm: 0, F7: 0 },
      test2: { Bb: 0, Cm: 0, F7: 0 },
    },
    finalizedAttempts: { test1: {}, test2: {} },
    startedAt: null,
  };
}
