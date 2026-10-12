"use client";

import React, { useCallback, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2, Square } from "lucide-react";
import type { Pitch } from "@chordlens/core/types";
import { getEqualJustDiff, getEqualFrequencies, getJustFrequencies } from "@chordlens/core/audio_analysis/calcJustFreq";
import { PITCH_NAME_LIST } from "@chordlens/core/constants";
import { INTERVAL_LABELS } from "@chordlens/core/feedback/chordRoles";

// 表示するcentの小数点以下桁数
const CENT_DIGIT_NUM = 2;

interface CentDisplayProps {
  pitchList: Pitch[];
  a4Freq: number;
  title?: string;
  /**
   * 最低この行数ぶんの高さを確保する (既定 0 = 確保しない)。
   * 自動追従で構成音の数が変わるたびに高さが変わると、下までスクロールして
   * いるときにスクロール位置が補正されて画面全体が跳ぶため、メイン画面で使う
   */
  minRows?: number;
}

/**
 * 根音からの半音数を計算
 */
const calculateInterval = (pitchList: Pitch[], index: number): number => {
  const rootPitch = pitchList.find((p) => p.isRoot);
  if (!rootPitch) return 0;

  const rootIndex = PITCH_NAME_LIST.indexOf(rootPitch.pitchName);
  const currentIndex = PITCH_NAME_LIST.indexOf(pitchList[index].pitchName);

  // オクターブを考慮した半音数の計算
  const rootTotalSemitones = rootIndex + rootPitch.octaveNum * 12;
  const currentTotalSemitones = currentIndex + pitchList[index].octaveNum * 12;

  const semitoneDistance = currentTotalSemitones - rootTotalSemitones;

  // 0-11の範囲に正規化（オクターブをまたぐ場合）
  return ((semitoneDistance % 12) + 12) % 12;
};

export const CentDisplay: React.FC<CentDisplayProps> = ({
  pitchList,
  a4Freq,
  title,
  minRows = 0,
}) => {
  const equalJustDiff = getEqualJustDiff(pitchList, a4Freq);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<Map<string, { oscillator: OscillatorNode; gainNode: GainNode }>>(new Map());
  const [playingState, setPlayingState] = useState<Map<string, boolean>>(new Map());

  // AudioContextの初期化
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  // 音を停止する関数
  const stopTone = useCallback((key: string) => {
    const nodes = oscillatorsRef.current.get(key);
    if (nodes) {
      const audioContext = getAudioContext();
      const now = audioContext.currentTime;

      // フェードアウト
      nodes.gainNode.gain.cancelScheduledValues(now);
      nodes.gainNode.gain.setValueAtTime(nodes.gainNode.gain.value, now);
      nodes.gainNode.gain.linearRampToValueAtTime(0, now + 0.05);

      nodes.oscillator.stop(now + 0.05);
      oscillatorsRef.current.delete(key);

      setPlayingState(prev => {
        const next = new Map(prev);
        next.set(key, false);
        return next;
      });
    }
  }, [getAudioContext]);

  // 音を再生する関数（連続再生用）
  const playToneContinuous = useCallback((frequency: number, key: string) => {
    // すでに再生中の場合は停止
    if (oscillatorsRef.current.has(key)) {
      stopTone(key);
      return;
    }

    const audioContext = getAudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = "sine";

    // フェードイン
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);

    oscillator.start(now);

    oscillatorsRef.current.set(key, { oscillator, gainNode });

    setPlayingState(prev => {
      const next = new Map(prev);
      next.set(key, true);
      return next;
    });
  }, [getAudioContext, stopTone]);

  // 平均律の音を再生/停止
  const toggleEqual = useCallback((index: number) => {
    const equalFreqs = getEqualFrequencies(pitchList, a4Freq);
    if (equalFreqs[index]) {
      const key = `equal-${index}`;
      playToneContinuous(equalFreqs[index], key);
    }
  }, [pitchList, a4Freq, playToneContinuous]);

  // 純正律の音を再生/停止
  const toggleJust = useCallback((index: number) => {
    const justFreqs = getJustFrequencies(pitchList, a4Freq);
    if (justFreqs[index]) {
      const key = `just-${index}`;
      playToneContinuous(justFreqs[index], key);
    }
  }, [pitchList, a4Freq, playToneContinuous]);

  const renderToggle = (index: number, kind: "equal" | "just") => {
    const playing = playingState.get(`${kind}-${index}`) === true;
    const label = kind === "equal" ? "平均律" : "純正律";
    const onClick = kind === "equal" ? toggleEqual : toggleJust;
    return (
      <Button
        type="button"
        variant={playing ? "default" : "outline"}
        aria-pressed={playing}
        aria-label={`${pitchList[index].pitchName}${pitchList[index].octaveNum} ${label}を${playing ? "停止" : "再生"}`}
        onClick={() => onClick(index)}
        className="h-11 flex-1 gap-2 text-base"
      >
        {playing ? <Square className="size-4 fill-current" /> : <Volume2 className="size-4" />}
        {label}
      </Button>
    );
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="px-4 pt-3 pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-1 pt-1">
        <ul className="divide-y">
          {pitchList.map((pitch, index) => {
            const interval = calculateInterval(pitchList, index);
            const intervalName = INTERVAL_LABELS[interval] || "?";
            const centValue = equalJustDiff[index];

            return (
              <li
                key={`${pitch.pitchName}-${pitch.octaveNum}-${index}`}
                className="flex flex-col gap-2 py-3"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold tabular-nums">
                      {pitch.pitchName}
                      {pitch.octaveNum}
                    </span>
                    <span className="text-sm text-muted-foreground">{intervalName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">平均律との差 </span>
                    <span className="text-base font-semibold tabular-nums">
                      {centValue !== undefined
                        ? `${centValue >= 0 ? "+" : ""}${centValue.toFixed(CENT_DIGIT_NUM)}`
                        : "---"}
                    </span>
                    <span className="text-xs text-muted-foreground"> ¢</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {renderToggle(index, "equal")}
                  {renderToggle(index, "just")}
                </div>
              </li>
            );
          })}
          {/* 高さ確保用の見えない行 (実際の行と同じ構造で高さを揃える) */}
          {Array.from({ length: Math.max(0, minRows - pitchList.length) }, (_, i) => (
            <li
              key={`placeholder-${i}`}
              aria-hidden="true"
              data-testid="cent-display-placeholder"
              className="invisible flex flex-col gap-2 py-3"
            >
              <span className="text-xl font-bold">C4</span>
              <span className="h-11" />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
