"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  frequencyHz: number;
  label?: string;
}

const FADE_MS = 80;

/**
 * 練習ページ用の根音再生トグル。AudioContext は内部に閉じる。
 * デフォルトは OFF。
 */
export function RootPlaybackToggle({ frequencyHz, label }: Props) {
  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const stop = () => {
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
      // ignore
    }
    oscRef.current = null;
    gainRef.current = null;
    setIsPlaying(false);
  };

  const start = () => {
    if (oscRef.current) return;
    const ctx = ctxRef.current ?? new AudioContext();
    ctxRef.current = ctx;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => undefined);
    }
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = frequencyHz;
    const g = ctx.createGain();
    g.gain.value = 0;
    osc.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.18, now + FADE_MS / 1000);
    osc.start(now);
    oscRef.current = osc;
    gainRef.current = g;
    setIsPlaying(true);
  };

  // 周波数が変わったら、再生中なら反映
  useEffect(() => {
    const ctx = ctxRef.current;
    const osc = oscRef.current;
    if (ctx && osc) {
      osc.frequency.setValueAtTime(frequencyHz, ctx.currentTime);
    }
  }, [frequencyHz]);

  // アンマウント時停止
  useEffect(() => {
    return () => {
      stop();
      const ctx = ctxRef.current;
      if (ctx && ctx.state !== "closed") {
        ctx.close().catch(() => undefined);
      }
      ctxRef.current = null;
    };
  }, []);

  return (
    <Button
      type="button"
      variant={isPlaying ? "secondary" : "outline"}
      onClick={isPlaying ? stop : start}
      size="sm"
    >
      {label ?? `根音 ${frequencyHz.toFixed(1)}Hz`} {isPlaying ? "■ 停止" : "▶ 再生"}
    </Button>
  );
}
