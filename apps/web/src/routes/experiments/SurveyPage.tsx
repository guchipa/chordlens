import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonText,
} from "@ionic/react";
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
import { useExperimentSession } from "@/lib/hooks/experiments/useExperimentSession";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { writePreSurvey } from "@/lib/firebase/session";

import styles from "./SurveyPage.module.css";

export function SurveyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session, setPreSurvey, setPhase } = useExperimentSession();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const cond = searchParams.get("cond");
  const pairId = searchParams.get("pairId");

  const form = useForm<PreSurveyInput, unknown, PreSurveyOutput>({
    resolver: zodResolver(PreSurveySchema),
  });

  const onSubmit = async (data: PreSurveyOutput) => {
    if (!session) {
      setSubmitError("セッションが見つかりません。ページをリロードしてください。");
      return;
    }

    if (!isEligible(data)) {
      const queryString = new URLSearchParams({ cond: cond || "", pairId: pairId || "" }).toString();
      navigate(`/experiments/ineligible/?${queryString}`, { replace: true });
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
        console.error("[experiments/SurveyPage] writePreSurvey failed:", err);
        setSubmitError(
          "アンケートの送信に失敗しました。通信状況を確認して再度お試しください。"
        );
        setSubmitting(false);
        return;
      }
    }

    setPhase("test1");
    const queryString = new URLSearchParams({ cond: cond || "", pairId: pairId || "" }).toString();
    navigate(`/experiments/test1/?${queryString}`);
  };

  return (
    <main className={styles.page}>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>実験の流れ</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <p>本実験はペア(2名)で実施します。所要時間は約 25 分です。</p>
          <ol>
            <li>事前アンケート (このページ)</li>
            <li>1 回目テスト (3 和音 × 5 秒録音)</li>
            <li>10 分間の練習</li>
            <li>2 回目テスト (1 回目と同じ)</li>
            <li>事後アンケート</li>
          </ol>
          <IonText color="medium">
            <p>
              録音中は根音をシステムが再生します。各メンバーは担当音 (3 度 / 5 度 / 7 度) を演奏してください。
            </p>
          </IonText>
        </IonCardContent>
      </IonCard>

      <IonCard>
        <IonCardHeader>
          <IonCardTitle>実験前アンケート</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonText color="medium">
            <p>
              どちらがメンバーAなのか，Bなのかを忘れないでください．テストや実験後アンケートで必要になります．
            </p>
          </IonText>
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className={styles.list}>
              <PairMemberInput member="memberA" title="メンバー A" />
              <PairMemberInput member="memberB" title="メンバー B" />
              {submitError && <p className={styles.errorBox}>{submitError}</p>}
              <IonButton expand="block" type="submit" disabled={submitting}>
                {submitting ? "送信中..." : "1 回目テストへ進む"}
              </IonButton>
            </form>
          </FormProvider>
        </IonCardContent>
      </IonCard>
    </main>
  );
}
