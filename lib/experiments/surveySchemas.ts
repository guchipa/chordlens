/**
 * 事前 / 事後 / システム有用性アンケートの zod スキーマ
 *
 * 論文準拠の質問項目を placeholder として定義。
 * 追加項目はユーザー指示を受けてからここに足す。
 */
import { z } from "zod";
import { INSTRUMENT_KEYS } from "./instrumentChordMap";

export const FIVE_POINT = z
  .number()
  .int()
  .min(1)
  .max(5);

export const JUST_INTONATION_FAMILIARITY = z.enum([
  "none",
  "heard",
  "understand",
  "conscious",
]);

export const JUST_INTONATION_FAMILIARITY_LABELS: Record<
  z.infer<typeof JUST_INTONATION_FAMILIARITY>,
  string
> = {
  none: "知らない",
  heard: "聞いたことがある",
  understand: "理解している",
  conscious: "演奏で意識している",
};

export const MemberSchema = z.object({
  instrument: z.enum(INSTRUMENT_KEYS, {
    required_error: "楽器を選択してください",
  }),
  experienceYears: z.coerce
    .number({
      required_error: "演奏歴を入力してください",
      invalid_type_error: "演奏歴は数値で入力してください",
    })
    .int()
    .min(0)
    .max(80),
  pitchMatchingSkill: FIVE_POINT,
  chordEvaluationSkill: FIVE_POINT,
  justIntonationFamiliarity: JUST_INTONATION_FAMILIARITY,
});

export type MemberInput = z.input<typeof MemberSchema>;
export type MemberOutput = z.output<typeof MemberSchema>;

export const PreSurveySchema = z.object({
  memberA: MemberSchema,
  memberB: MemberSchema,
});

export type PreSurveyInput = z.input<typeof PreSurveySchema>;
export type PreSurveyOutput = z.output<typeof PreSurveySchema>;

export function isEligible(pre: PreSurveyOutput): boolean {
  return pre.memberA.experienceYears >= 1 && pre.memberB.experienceYears >= 1;
}

export const PostSurveySchema = z.object({
  improvementPerceived: FIVE_POINT,
  clarityOfPitchDirection: FIVE_POINT.optional(),
  freeText: z.string().max(2000).optional(),
});

export type PostSurveyInput = z.input<typeof PostSurveySchema>;
export type PostSurveyOutput = z.output<typeof PostSurveySchema>;

export const UsabilitySurveySchema = z.object({
  practiceQuality: FIVE_POINT,
  tunerUndetected: FIVE_POINT,
  deviationClarity: FIVE_POINT,
  continuedUse: FIVE_POINT,
});

export type UsabilitySurveyInput = z.input<typeof UsabilitySurveySchema>;
export type UsabilitySurveyOutput = z.output<typeof UsabilitySurveySchema>;
