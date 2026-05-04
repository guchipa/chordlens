/**
 * 根音再生フック。
 * 注入された AudioContext 上に Oscillator + Gain を構築し、
 * フェードイン/アウト付きで指定周波数を再生する。
 */
import { useCallback, useEffect, useRef, useState } from "react";

const FADE_MS = 80;

export interface UseRootPlaybackOptions {
  /** 何 Hz を鳴らすか。 */
  frequencyHz: number;
  /** 出力音量 (0〜1)。 */
  gain?: number;
}

export interface UseRootPlaybackReturn {
  isPlaying: boolean;
  /** 再生開始。AudioContext を渡す。 */
  start: (audioContext: AudioContext) => void;
  /** 停止。フェードアウト後に oscillator を解放。 */
  stop: () => void;
}

export function useRootPlayback(
  options: UseRootPlaybackOptions
): UseRootPlaybackReturn {
  const { frequencyHz, gain = 0.15 } = options;

  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const stopInternal = useCallback(() => {
    const ctx = ctxRef.current;
    const osc = oscRef.current;
    const g = gainRef.current;
    if (!ctx || !osc || !g) {
      setIsPlaying(false);
      return;
    }
    const now = ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(0, now + FADE_MS / 1000);
    try {
      osc.stop(now + FADE_MS / 1000 + 0.01);
    } catch {
      // already stopped
    }
    oscRef.current = null;
    gainRef.current = null;
    ctxRef.current = null;
    setIsPlaying(false);
  }, []);

  const start = useCallback(
    (audioContext: AudioContext) => {
      if (oscRef.current) return;
      ctxRef.current = audioContext;
      const osc = audioContext.createOscillator();
      osc.type = "sine";
      osc.frequency.value = frequencyHz;
      const g = audioContext.createGain();
      g.gain.value = 0;
      osc.connect(g);
      g.connect(audioContext.destination);

      const now = audioContext.currentTime;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(gain, now + FADE_MS / 1000);
      osc.start(now);

      oscRef.current = osc;
      gainRef.current = g;
      setIsPlaying(true);
    },
    [frequencyHz, gain]
  );

  // 周波数の動的変更：再生中なら反映する
  useEffect(() => {
    if (oscRef.current && ctxRef.current) {
      oscRef.current.frequency.setValueAtTime(
        frequencyHz,
        ctxRef.current.currentTime
      );
    }
  }, [frequencyHz]);

  // アンマウント時に停止
  useEffect(() => stopInternal, [stopInternal]);

  return { isPlaying, start, stop: stopInternal };
}
