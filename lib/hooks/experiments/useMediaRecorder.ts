/**
 * MediaRecorder ラッパー。
 * - WebM/Opus 優先、iOS Safari など非対応環境では mp4/aac にフォールバック。
 * - 外部から MediaStream を受け取り、stop 時に Blob を返す。
 */
import { useCallback, useEffect, useRef, useState } from "react";

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
] as const;

export function pickSupportedMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const type of PREFERRED_MIME_TYPES) {
    try {
      if (MediaRecorder.isTypeSupported(type)) return type;
    } catch {
      // ignore
    }
  }
  return null;
}

export interface UseMediaRecorderReturn {
  /** 開始（成功なら true）。stream は呼び出し時に渡す。 */
  start: (stream: MediaStream) => boolean;
  /** 停止して Blob を返す。 */
  stop: () => Promise<{ blob: Blob; mimeType: string; durationMs: number } | null>;
  /** 録音中フラグ。 */
  isRecording: boolean;
  /** 検出された MIME。null は MediaRecorder 非対応。 */
  detectedMimeType: string | null;
}

export function useMediaRecorder(): UseMediaRecorderReturn {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const stopResolveRef = useRef<
    ((value: { blob: Blob; mimeType: string; durationMs: number } | null) => void)
    | null
  >(null);

  const [isRecording, setIsRecording] = useState(false);
  const [detectedMimeType, setDetectedMimeType] = useState<string | null>(null);

  useEffect(() => {
    setDetectedMimeType(pickSupportedMimeType());
  }, []);

  const start = useCallback((stream: MediaStream): boolean => {
    if (recorderRef.current) return false;
    const mime = pickSupportedMimeType();
    if (!mime) {
      console.error("[useMediaRecorder] No supported MIME type for MediaRecorder");
      return false;
    }
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: mime });
    } catch (err) {
      console.error("[useMediaRecorder] Failed to create MediaRecorder:", err);
      return false;
    }

    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      chunksRef.current = [];
      const durationMs =
        startedAtRef.current !== null
          ? performance.now() - startedAtRef.current
          : 0;
      startedAtRef.current = null;
      const resolve = stopResolveRef.current;
      stopResolveRef.current = null;
      recorderRef.current = null;
      setIsRecording(false);
      resolve?.({ blob, mimeType: mime, durationMs });
    };
    recorder.onerror = (event) => {
      console.error("[useMediaRecorder] error:", event);
    };

    recorderRef.current = recorder;
    startedAtRef.current = performance.now();
    setDetectedMimeType(mime);
    setIsRecording(true);
    recorder.start();
    return true;
  }, []);

  const stop = useCallback((): Promise<{
    blob: Blob;
    mimeType: string;
    durationMs: number;
  } | null> => {
    const recorder = recorderRef.current;
    if (!recorder) return Promise.resolve(null);
    return new Promise((resolve) => {
      stopResolveRef.current = resolve;
      try {
        recorder.stop();
      } catch (err) {
        console.error("[useMediaRecorder] stop() failed:", err);
        recorderRef.current = null;
        setIsRecording(false);
        resolve(null);
      }
    });
  }, []);

  return { start, stop, isRecording, detectedMimeType };
}
