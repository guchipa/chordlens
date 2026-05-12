"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PostSurveySchema,
  UsabilitySurveySchema,
} from "@/lib/experiments/surveySchemas";
import {
  FivePointField,
  FreeTextField,
} from "@/components/feature/experiments/SurveyForm";
import { useExperimentSession } from "@/lib/hooks/experiments/useExperimentSession";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import {
  updatePairStatus,
  writePostSurvey,
} from "@/lib/firebase/session";
import type {
  PostSurveyAnswers,
  UsabilitySurveyAnswers,
} from "@/lib/experiments/types";

const Combined = z.object({
  post: PostSurveySchema,
  usability: UsabilitySurveySchema.optional(),
});
type CombinedInput = z.input<typeof Combined>;
type CombinedOutput = z.output<typeof Combined>;

export default function ExperimentPostSurveyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, setPostSurvey, setPhase } = useExperimentSession();
  const [step, setStep] = useState<"A" | "B">("A");
  const [memberAData, setMemberAData] = useState<CombinedOutput | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cond = searchParams.get("cond");
  const pairId = searchParams.get("pairId");

  const isWith = session?.condition === "with";
  const form = useForm<CombinedInput, unknown, CombinedOutput>({
    resolver: zodResolver(Combined),
  });

  const handleStepA = (data: CombinedOutput) => {
    setMemberAData(data);
    form.reset();
    setStep("B");
  };

  const handleStepB = async (data: CombinedOutput) => {
    if (!session || !memberAData) return;
    setSubmitting(true);
    setError(null);

    const postA: PostSurveyAnswers = memberAData.post;
    const postB: PostSurveyAnswers = data.post;
    const usabilityA: UsabilitySurveyAnswers | null = isWith
      ? (memberAData.usability ?? null)
      : null;
    const usabilityB: UsabilitySurveyAnswers | null = isWith
      ? (data.usability ?? null)
      : null;

    setPostSurvey(postA, postB, usabilityA, usabilityB);

    if (isFirebaseConfigured()) {
      try {
        await writePostSurvey(session.pairId, postA, postB, usabilityA, usabilityB);
        await updatePairStatus(session.pairId, "complete");
      } catch (err) {
        console.error("[post-survey] write failed:", err);
        setError("送信に失敗しました。通信状況を確認して再度お試しください。");
        setSubmitting(false);
        return;
      }
    }

    setPhase("complete");
    const queryString = new URLSearchParams({
      cond: cond || "",
      pairId: pairId || "",
    }).toString();
    router.push(`/experiments/complete/?${queryString}`);
  };

  const memberLabel = step === "A" ? "被験者 A" : "被験者 B";
  const isLastStep = step === "B";

  return (
    <main className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            事後アンケート — {memberLabel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2 text-sm text-muted-foreground">
            <span
              className={
                step === "A" ? "font-semibold text-foreground" : ""
              }
            >
              被験者 A
            </span>
            <span>→</span>
            <span
              className={
                step === "B" ? "font-semibold text-foreground" : ""
              }
            >
              被験者 B
            </span>
          </div>

          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit(isLastStep ? handleStepB : handleStepA)}
              className="space-y-6"
            >
              <fieldset className="space-y-4 rounded-lg border p-4">
                <legend className="px-2 font-semibold">練習の感想</legend>
                <FivePointField
                  name="post.improvementPerceived"
                  label="10分の練習で音程が改善したと感じる"
                />
                {isWith && (
                  <FivePointField
                    name="post.clarityOfPitchDirection"
                    label="どの音が高い/低いかが明確だった"
                  />
                )}
                <FreeTextField
                  name="post.freeText"
                  label="自由記述 (任意)"
                />
              </fieldset>

              {isWith && (
                <fieldset className="space-y-4 rounded-lg border p-4">
                  <legend className="px-2 font-semibold">
                    システムの有用性
                  </legend>
                  <FivePointField
                    name="usability.practiceQuality"
                    label="和音練習の質が上がると感じた"
                  />
                  <FivePointField
                    name="usability.tunerUndetected"
                    label="市販のチューナーでは分からない問題を発見できた"
                  />
                  <FivePointField
                    name="usability.deviationClarity"
                    label="「どの音が」「どれだけ」ズレているかが分かりやすい"
                  />
                  <FivePointField
                    name="usability.continuedUse"
                    label="今後も練習に取り入れたい"
                  />
                </fieldset>
              )}

              {error && (
                <p className="rounded bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {isLastStep
                  ? submitting
                    ? "送信中..."
                    : "送信して完了"
                  : "次の被験者へ →"}
              </Button>
            </form>
          </FormProvider>
        </CardContent>
      </Card>
    </main>
  );
}
