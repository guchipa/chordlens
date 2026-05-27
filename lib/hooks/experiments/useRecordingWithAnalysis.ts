/**
 * テスト録音用フック。
 * - getUserMedia で 1 つの MediaStream を取得し、
 *   (a) AnalyserNode で解析（解析CSV用）
 *   (b) MediaRecorder で録音
 *   (c) Oscillator で根音再生（destination 経由でスピーカーから出力 → マイクに混入）
 *   の 3 経路を同じ AudioContext 上で動かす。
 * - 解析結果は 60fps で LogSession に蓄積し、停止時に CSV テキストを返す。
 */
import { useCallback, useRef, useState } from "react";
import { evaluateSpectrum } from "@/lib/audio_analysis/justAnalyze";
import { convertLogToCSV } from "@/lib/utils/exportLog";
import { pickSupportedMimeType } from "./useMediaRecorder";
import type { LogEntry, LogSession, Pitch } from "@/lib/types";

const FADE_MS = 80;

export interface UseRecordingWithAnalysisProps {
  pitchList: Pitch[];
  evalRangeCents: number;
  a4Freq: number;
  evalThreshold: number;
  fftSize: number;
  smoothingTimeConstant: number;
}

export interface RecordingResult {
  audioBlob: Blob;
  csvText: string;
  mimeType: string;
  durationMs: number;
}

export interface UseRecordingWithAnalysisReturn {
  /** マイクと AudioContext を準備。1度呼んでおく。 */
  prepare: () => Promise<boolean>;
  /** 後始末。stream / context を解放。 */
  release: () => void;
  /** 根音再生を開始（既に再生中なら何もしない）。 */
  startRoot: (frequencyHz: number, gain?: number) => void;
  /** 根音再生を停止。 */
  stopRoot: () => void;
  /** 録音 + 解析記録を開始。 */
  startRecording: () => boolean;
  /** 録音 + 解析記録を停止し、結果を返す。 */
  stopRecording: () => Promise<RecordingResult | null>;
  /** 準備済みかどうか。 */
  isReady: boolean;
  /** 録音中かどうか。 */
  isRecording: boolean;
}

interface InternalRefs {
  stream: MediaStream;
  audioContext: AudioContext;
  source: MediaStreamAudioSourceNode;
  analyser: AnalyserNode;
  silentGain: GainNode;
  spectrumBuf: Float32Array;
  freqBins: number[];
}

export function useRecordingWithAnalysis(
  props: UseRecordingWithAnalysisProps
): UseRecordingWithAnalysisReturn {
  const propsRef = useRef(props);
  propsRef.current = props;

  const refs = useRef<InternalRefs | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const oscGainRef = useRef<GainNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const sessionRef = useRef<LogSession | null>(null);
  const rafRef = useRef<number | null>(null);
  const recordStartedAtRef = useRef<number | null>(null);
  const stopResolveRef = useRef<((r: RecordingResult | null) => void) | null>(
    null
  );

  const [isReady, setIsReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const prepare = useCallback(async (): Promise<boolean> => {
    if (refs.current) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      const audioContext = new AudioContext();
      if (audioContext.state === "suspended") {
        try {
          await audioContext.resume();
        } catch {
          // ignore
        }
      }

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = propsRef.current.fftSize;
      analyser.smoothingTimeConstant = propsRef.current.smoothingTimeConstant;

      const silentGain = audioContext.createGain();
      silentGain.gain.value = 0;
      source.connect(analyser);
      analyser.connect(silentGain);
      silentGain.connect(audioContext.destination);

      const spectrumBuf = new Float32Array(analyser.frequencyBinCount);
      const sampleRate = audioContext.sampleRate;
      const binCount = analyser.frequencyBinCount;
      const freqBins = Array.from(
        { length: binCount },
        (_, i) => (sampleRate / 2) * (i / binCount)
      );

      refs.current = {
        stream,
        audioContext,
        source,
        analyser,
        silentGain,
        spectrumBuf,
        freqBins,
      };
      setIsReady(true);
      return true;
    } catch (err) {
      console.error("[useRecordingWithAnalysis] prepare failed:", err);
      return false;
    }
  }, []);

  const release = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const r = refs.current;
    if (r) {
      try {
        r.stream.getTracks().forEach((t) => t.stop());
      } catch {
        // ignore
      }
      try {
        r.source.disconnect();
        r.analyser.disconnect();
        r.silentGain.disconnect();
      } catch {
        // ignore
      }
      if (r.audioContext.state !== "closed") {
        r.audioContext.close().catch(() => undefined);
      }
    }
    refs.current = null;
    oscRef.current = null;
    oscGainRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    sessionRef.current = null;
    setIsReady(false);
    setIsRecording(false);
  }, []);

  const startRoot = useCallback((frequencyHz: number, gain = 0.18) => {
    const r = refs.current;
    if (!r || oscRef.current) return;
    const ctx = r.audioContext;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = frequencyHz;
    const g = ctx.createGain();
    g.gain.value = 0;
    osc.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + FADE_MS / 1000);
    osc.start(now);
    oscRef.current = osc;
    oscGainRef.current = g;
  }, []);

  const stopRoot = useCallback(() => {
    const osc = oscRef.current;
    const g = oscGainRef.current;
    const r = refs.current;
    if (!osc || !g || !r) return;
    const now = r.audioContext.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(0, now + FADE_MS / 1000);
    try {
      osc.stop(now + FADE_MS / 1000 + 0.01);
    } catch {
      // ignore
    }
    oscRef.current = null;
    oscGainRef.current = null;
  }, []);

  const recordFrame = useCallback(() => {
    const r = refs.current;
    const session = sessionRef.current;
    if (!r || !session) return;
    const props = propsRef.current;
    r.analyser.getFloatFrequencyData(r.spectrumBuf as Float32Array<ArrayBuffer>);
    const results = evaluateSpectrum(
      r.spectrumBuf,
      r.freqBins,
      props.pitchList,
      props.evalRangeCents,
      props.a4Freq,
      props.evalThreshold,
      { includeDebug: false }
    );
    const now = new Date();
    const startMs = new Date(session.startTime).getTime();
    const elapsedMs = now.getTime() - startMs;
    const entry: LogEntry = {
      timestamp: now.toISOString(),
      elapsedMs,
      sessionId: session.sessionId,
      pitchList: [...props.pitchList],
      analysisResult: results.map((rr) => rr.deviation),
      centDeviations: results.map((rr) => rr.centDeviation),
      centDeviationsRaw: results.map((rr) => rr.centDeviation),
      centDeviationsDisplay: null,
      isDetectedList: null,
      isHeldList: null,
      settings: {
        a4Freq: props.a4Freq,
        evalRangeCents: props.evalRangeCents,
        evalThreshold: props.evalThreshold,
        fftSize: props.fftSize,
        smoothingTimeConstant: props.smoothingTimeConstant,
      },
    };
    session.entries.push(entry);
    rafRef.current = requestAnimationFrame(recordFrame);
  }, []);

  const startRecording = useCallback((): boolean => {
    const r = refs.current;
    if (!r) {
      console.error("[useRecordingWithAnalysis] not prepared");
      return false;
    }
    if (recorderRef.current) return false;
    const mime = pickSupportedMimeType();
    if (!mime) {
      console.error("[useRecordingWithAnalysis] No supported MIME type");
      return false;
    }
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(r.stream, { mimeType: mime });
    } catch (err) {
      console.error("[useRecordingWithAnalysis] MediaRecorder error:", err);
      return false;
    }
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const audioBlob = new Blob(chunksRef.current, { type: mime });
      chunksRef.current = [];
      const durationMs =
        recordStartedAtRef.current !== null
          ? performance.now() - recordStartedAtRef.current
          : 0;
      recordStartedAtRef.current = null;
      const session = sessionRef.current;
      if (session) {
        session.endTime = new Date().toISOString();
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const csvText = session ? convertLogToCSV(session) : "";
      const resolve = stopResolveRef.current;
      stopResolveRef.current = null;
      sessionRef.current = null;
      recorderRef.current = null;
      setIsRecording(false);
      resolve?.({ audioBlob, csvText, mimeType: mime, durationMs });
    };
    recorder.onerror = (e) => {
      console.error("[useRecordingWithAnalysis] recorder error:", e);
    };

    const sessionId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    sessionRef.current = {
      sessionId,
      startTime: new Date().toISOString(),
      endTime: null,
      entries: [],
      metadata: {
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      },
    };

    recorderRef.current = recorder;
    recordStartedAtRef.current = performance.now();
    recorder.start();
    rafRef.current = requestAnimationFrame(recordFrame);
    setIsRecording(true);
    return true;
  }, [recordFrame]);

  const stopRecording = useCallback((): Promise<RecordingResult | null> => {
    const recorder = recorderRef.current;
    if (!recorder) return Promise.resolve(null);
    return new Promise<RecordingResult | null>((resolve) => {
      stopResolveRef.current = resolve;
      try {
        recorder.stop();
      } catch (err) {
        console.error("[useRecordingWithAnalysis] stop failed:", err);
        recorderRef.current = null;
        setIsRecording(false);
        resolve(null);
      }
    });
  }, []);

  return {
    prepare,
    release,
    startRoot,
    stopRoot,
    startRecording,
    stopRecording,
    isReady,
    isRecording,
  };
}
