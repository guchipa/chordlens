/**
 * 録音 Blob + 解析 CSV を Cloud Storage にアップロードし、
 * Firestore の attempts サブコレクションに doc を作成する。
 */
import { ref as storageRef, uploadBytes } from "firebase/storage";
import { getFirebaseStorage } from "./client";
import { writeAttemptDoc, type WrittenAttempt } from "./session";
import type { ChordKey } from "@/lib/experiments/constants";

function extensionForMime(mimeType: string): string {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "bin";
}

export interface UploadAttemptInput {
  pairId: string;
  phase: "test1" | "test2";
  chord: ChordKey;
  attempt: number;
  final: boolean;
  audioBlob: Blob;
  csvBlob: Blob;
  mimeType: string;
  durationMs: number;
  rootFreqHz: number;
}

export async function uploadAttempt(
  input: UploadAttemptInput
): Promise<WrittenAttempt> {
  const ext = extensionForMime(input.mimeType);
  const base = `pairs/${input.pairId}/${input.phase}/attempt-${input.attempt}/chord-${input.chord}`;
  const audioPath = `${base}.${ext}`;
  const csvPath = `${base}.csv`;

  const storage = getFirebaseStorage();
  await uploadBytes(storageRef(storage, audioPath), input.audioBlob, {
    contentType: input.mimeType,
  });
  await uploadBytes(storageRef(storage, csvPath), input.csvBlob, {
    contentType: "text/csv;charset=utf-8",
  });

  return writeAttemptDoc(input.pairId, {
    phase: input.phase,
    chord: input.chord,
    attempt: input.attempt,
    final: input.final,
    audioPath,
    csvPath,
    mimeType: input.mimeType,
    durationMs: input.durationMs,
    rootFreqHz: input.rootFreqHz,
  });
}
