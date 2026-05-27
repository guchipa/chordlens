import {
  isEligible,
  PreSurveySchema,
} from "@/lib/experiments/surveySchemas";

const validMember = {
  instrument: "trumpet" as const,
  experienceYears: 3,
  pitchMatchingSkill: 4,
  chordEvaluationSkill: 3,
  justIntonationFamiliarity: "heard" as const,
};

describe("PreSurveySchema", () => {
  it("正常な入力をパースできる", () => {
    const parsed = PreSurveySchema.parse({
      memberA: validMember,
      memberB: { ...validMember, instrument: "trombone" },
    });
    expect(parsed.memberA.experienceYears).toBe(3);
  });

  it("演奏歴が文字列でも数値に変換される", () => {
    const parsed = PreSurveySchema.parse({
      memberA: { ...validMember, experienceYears: "5" },
      memberB: validMember,
    });
    expect(parsed.memberA.experienceYears).toBe(5);
  });
});

describe("isEligible", () => {
  it("両者の演奏歴が 1 年以上なら true", () => {
    const pre = PreSurveySchema.parse({
      memberA: { ...validMember, experienceYears: 1 },
      memberB: { ...validMember, experienceYears: 2 },
    });
    expect(isEligible(pre)).toBe(true);
  });

  it("片方が 1 年未満なら false", () => {
    const pre = PreSurveySchema.parse({
      memberA: { ...validMember, experienceYears: 0 },
      memberB: { ...validMember, experienceYears: 5 },
    });
    expect(isEligible(pre)).toBe(false);
  });
});
