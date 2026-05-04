/**
 * ペアセッションの Firestore 操作。
 */
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { ensureAnonymousAuth, getFirebaseFirestore } from "./client";
import type {
  ChordPitches,
  ChordPartAssignments,
  PreSurveyAnswers,
  PostSurveyAnswers,
  UsabilitySurveyAnswers,
} from "@/lib/experiments/types";
import type { ChordKey, Condition } from "@/lib/experiments/constants";

export type PairStatus =
  | "started"
  | "test1-done"
  | "practice-done"
  | "test2-done"
  | "complete";

export interface AttemptDocInput {
  phase: "test1" | "test2";
  chord: ChordKey;
  attempt: number;
  final: boolean;
  audioPath: string;
  csvPath: string;
  mimeType: string;
  durationMs: number;
  rootFreqHz: number;
}

function pairDocRef(pairId: string) {
  return doc(getFirebaseFirestore(), "pairs", pairId);
}

function attemptsColRef(pairId: string) {
  return collection(getFirebaseFirestore(), "pairs", pairId, "attempts");
}

export async function createOrGetPair(
  pairId: string,
  condition: Condition
): Promise<void> {
  const anonUid = await ensureAnonymousAuth();
  const ref = pairDocRef(pairId);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, {
    pairId,
    condition,
    status: "started",
    startedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    anonUid,
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
  });
}

export async function updatePairStatus(
  pairId: string,
  status: PairStatus
): Promise<void> {
  await updateDoc(pairDocRef(pairId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function writePreSurvey(
  pairId: string,
  preSurvey: PreSurveyAnswers,
  partAssignment: ChordPartAssignments,
  chordPitches: ChordPitches,
  isRootIncluded: boolean
): Promise<void> {
  await updateDoc(pairDocRef(pairId), {
    preSurvey,
    members: [preSurvey.memberA, preSurvey.memberB],
    partAssignment,
    chordPitches,
    isRootIncluded,
    updatedAt: serverTimestamp(),
  });
}

export async function writePostSurvey(
  pairId: string,
  postSurvey: PostSurveyAnswers,
  usabilitySurvey: UsabilitySurveyAnswers | null
): Promise<void> {
  await updateDoc(pairDocRef(pairId), {
    postSurvey,
    usabilitySurvey: usabilitySurvey ?? null,
    updatedAt: serverTimestamp(),
  });
}

export interface WrittenAttempt {
  id: string;
  phase: "test1" | "test2";
  chord: ChordKey;
  attempt: number;
}

export async function writeAttemptDoc(
  pairId: string,
  input: AttemptDocInput
): Promise<WrittenAttempt> {
  const colRef = attemptsColRef(pairId);
  const ref = await addDoc(colRef, {
    ...input,
    createdAt: Timestamp.now(),
  });
  return {
    id: ref.id,
    phase: input.phase,
    chord: input.chord,
    attempt: input.attempt,
  };
}

/**
 * 指定 chord / phase の attempt のうち、1 件だけを final:true にして
 * 他を final:false にするバッチ書き込み。
 */
export async function markAttemptFinal(
  pairId: string,
  phase: "test1" | "test2",
  chord: ChordKey,
  finalAttemptNumber: number
): Promise<void> {
  const colRef = attemptsColRef(pairId);
  const q = query(
    colRef,
    where("phase", "==", phase),
    where("chord", "==", chord)
  );
  const snap = await getDocs(q);
  const batch = writeBatch(getFirebaseFirestore());
  snap.forEach((d) => {
    batch.update(d.ref, {
      final: d.data().attempt === finalAttemptNumber,
    });
  });
  await batch.commit();
}
