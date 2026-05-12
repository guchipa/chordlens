/**
 * /experiments セッションを Jotai 経由で扱うラッパー。
 * - sessionStorage との同期
 * - phase 進行 / member 設定 / pendingUpload 管理
 */
import { useAtom } from "jotai";
import { useCallback } from "react";
import { experimentSessionAtom } from "@/lib/experiments/experimentAtoms";
import {
  createInitialSession,
  type ChordPartAssignments,
  type ChordPitches,
  type ExperimentSessionState,
  type PendingUpload,
  type Phase,
  type PostSurveyAnswers,
  type PreSurveyAnswers,
  type UsabilitySurveyAnswers,
} from "@/lib/experiments/types";
import type { ChordKey, Condition } from "@/lib/experiments/constants";

export function useExperimentSession() {
  const [session, setSession] = useAtom(experimentSessionAtom);

  const initialize = useCallback(
    (pairId: string, condition: Condition) => {
      setSession((prev) => {
        if (prev && prev.pairId === pairId && prev.condition === condition) {
          return prev;
        }
        const next = createInitialSession(pairId, condition);
        next.startedAt = Date.now();
        return next;
      });
    },
    [setSession]
  );

  const reset = useCallback(() => {
    setSession(null);
  }, [setSession]);

  const update = useCallback(
    (mutator: (prev: ExperimentSessionState) => ExperimentSessionState) => {
      setSession((prev) => (prev ? mutator(prev) : prev));
    },
    [setSession]
  );

  const setPhase = useCallback(
    (phase: Phase) => {
      update((prev) => ({ ...prev, phase }));
    },
    [update]
  );

  const setPreSurvey = useCallback(
    (
      preSurvey: PreSurveyAnswers,
      partAssignment: ChordPartAssignments,
      chordPitches: ChordPitches
    ) => {
      update((prev) => ({
        ...prev,
        preSurvey,
        partAssignment,
        chordPitches,
        members: [preSurvey.memberA, preSurvey.memberB],
      }));
    },
    [update]
  );

  const setPostSurvey = useCallback(
    (
      postSurveyA: PostSurveyAnswers,
      postSurveyB: PostSurveyAnswers,
      usabilityA: UsabilitySurveyAnswers | null,
      usabilityB: UsabilitySurveyAnswers | null
    ) => {
      update((prev) => ({
        ...prev,
        postSurveyA,
        postSurveyB,
        usabilitySurveyA: usabilityA,
        usabilitySurveyB: usabilityB,
      }));
    },
    [update]
  );

  const incrementAttempt = useCallback(
    (phase: "test1" | "test2", chord: ChordKey) => {
      let newAttempt = 0;
      update((prev) => {
        const counters = { ...prev.attemptCounters };
        const phaseCounters = { ...counters[phase] };
        phaseCounters[chord] = (phaseCounters[chord] ?? 0) + 1;
        newAttempt = phaseCounters[chord];
        counters[phase] = phaseCounters;
        return { ...prev, attemptCounters: counters };
      });
      return newAttempt;
    },
    [update]
  );

  const finalizeAttempt = useCallback(
    (phase: "test1" | "test2", chord: ChordKey, attempt: number) => {
      update((prev) => {
        const finalized = { ...prev.finalizedAttempts };
        const phaseFinal = { ...finalized[phase], [chord]: attempt };
        finalized[phase] = phaseFinal;
        return { ...prev, finalizedAttempts: finalized };
      });
    },
    [update]
  );

  const queuePendingUpload = useCallback(
    (item: PendingUpload) => {
      update((prev) => ({
        ...prev,
        pendingUploads: [...prev.pendingUploads, item],
      }));
    },
    [update]
  );

  const removePendingUpload = useCallback(
    (id: string) => {
      update((prev) => ({
        ...prev,
        pendingUploads: prev.pendingUploads.filter((p) => p.id !== id),
      }));
    },
    [update]
  );

  return {
    session,
    initialize,
    reset,
    setPhase,
    setPreSurvey,
    setPostSurvey,
    incrementAttempt,
    finalizeAttempt,
    queuePendingUpload,
    removePendingUpload,
    update,
  };
}
