"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  PreSurveySchema,
  type PreSurveyInput,
  type PreSurveyOutput,
  isEligible,
} from "@/lib/experiments/surveySchemas";
import {
  derivePartAssignment,
  derivePitchLists,
  type InstrumentKey,
} from "@/lib/experiments/instrumentChordMap";
import { PairMemberInput } from "@/components/feature/experiments/PairMemberInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useExperimentSession } from "@/lib/hooks/experiments/useExperimentSession";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { writePreSurvey } from "@/lib/firebase/session";

export default function ExperimentSurveyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, setPreSurvey, setPhase } = useExperimentSession();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const cond = searchParams.get("cond");
  const pairId = searchParams.get("pairId");

  const form = useForm<PreSurveyInput, unknown, PreSurveyOutput>({
    resolver: zodResolver(PreSurveySchema),
  });

  const onSubmit = async (data: PreSurveyOutput) => {
    console.log("[experiments/page] onSubmit called with data:", data);
    console.log("[experiments/page] session state:", session);
    
    if (!session) {
      console.error("[experiments/page] session is null at form submission", {
        sessionFromHook: session,
        timestamp: new Date().toISOString(),
      });
      setSubmitError("セッションが見つかりません。ページをリロードしてください。");
      return;
    }
    
    console.log("[experiments/page] eligibility check:", isEligible(data));
    
    if (!isEligible(data)) {
      console.log("[experiments/page] user is ineligible, redirecting");
      const queryString = new URLSearchParams({ cond: cond || "", pairId: pairId || "" }).toString();
      router.replace(`/experiments/ineligible/?${queryString}`);
      return;
    }
    const instruments: [InstrumentKey, InstrumentKey] = [
      data.memberA.instrument,
      data.memberB.instrument,
    ];
    const partAssignment = derivePartAssignment(instruments);
    const chordPitches = derivePitchLists(instruments, partAssignment);

    setSubmitting(true);
    setPreSurvey(
      { memberA: data.memberA, memberB: data.memberB },
      partAssignment,
      chordPitches
    );

    if (isFirebaseConfigured()) {
      try {
        await writePreSurvey(
          session.pairId,
          { memberA: data.memberA, memberB: data.memberB },
          partAssignment,
          chordPitches,
          /* isRootIncluded */ false
        );
      } catch (err) {
        console.error("[experiments/page] writePreSurvey failed:", err);
        setSubmitError(
          "アンケートの送信に失敗しました。通信状況を確認して再度お試しください。"
        );
        setSubmitting(false);
        return;
      }
    }

    setPhase("test1");
    const queryString = new URLSearchParams({ cond: cond || "", pairId: pairId || "" }).toString();
    router.push(`/experiments/test1/?${queryString}`);
  };

  return (
    <main className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>実験の流れ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>本実験はペア(2名)で実施します。所要時間は約 25 分です。</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>事前アンケート (このページ)</li>
            <li>1 回目テスト (3 和音 × 5 秒録音)</li>
            <li>10 分間の練習</li>
            <li>2 回目テスト (1 回目と同じ)</li>
            <li>事後アンケート</li>
          </ol>
          <p className="text-muted-foreground">
            録音中は根音をシステムが再生します。各メンバーは担当音 (3 度 / 5 度 / 7 度) を演奏してください。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>実験前アンケート</CardTitle>
        </CardHeader>
        <CardContent className="gap-4 flex flex-col">
          <p className="text-sm text-muted-foreground">
            どちらがメンバーAなのか，Bなのかを忘れないでください．テストや実験後アンケートで必要になります．
          </p>
          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
            >
              <PairMemberInput member="memberA" title="メンバー A" />
              <PairMemberInput member="memberB" title="メンバー B" />
              {submitError && (
                <p className="rounded bg-red-50 p-3 text-sm text-red-700">
                  {submitError}
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? "送信中..." : "1 回目テストへ進む"}
              </Button>
            </form>
          </FormProvider>
        </CardContent>
      </Card>
    </main>
  );
}
