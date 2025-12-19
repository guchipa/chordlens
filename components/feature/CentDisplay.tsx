"use client";

import React, { useCallback, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formType } from "@/lib/schema";
import { getEqualJustDiff, getEqualFrequencies, getJustFrequencies } from "@/lib/audio_analysis/calcJustFreq";
import { PITCH_NAME_LIST } from "@/lib/constants";

// 表示するcentの小数点以下桁数
const CENT_DIGIT_NUM = 2;

// 半音数から音程名へのマッピング
const INTERVAL_NAMES: { [key: number]: string } = {
  0: "根音", // Root (完全1度)
  1: "短2度", // Minor 2nd (短2度)
  2: "長2度", // Major 2nd (長2度)
  3: "短3度", // Minor 3rd (短3度)
  4: "長3度", // Major 3rd (長3度)
  5: "完全4度", // Perfect 4th (完全4度)
  6: "増4度/減5度", // Tritone (増4度/減5度)
  7: "完全5度", // Perfect 5th (完全5度)
  8: "短6度", // Minor 6th (短6度)
  9: "長6度", // Major 6th (長6度)
  10: "短7度", // Minor 7th (短7度)
  11: "長7度", // Major 7th (長7度)
};

interface CentDisplayProps {
  pitchList: formType[];
  a4Freq: number;
  title?: string;
}

/**
 * 根音からの半音数を計算
 */
const calculateInterval = (pitchList: formType[], index: number): number => {
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

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>音名</TableHead>
              <TableHead>音程</TableHead>
              <TableHead className="text-right">セント差</TableHead>
              <TableHead className="text-center">再生</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pitchList.map((pitch, index) => {
              const interval = calculateInterval(pitchList, index);
              const intervalName = INTERVAL_NAMES[interval] || "?";
              const centValue = equalJustDiff[index];

              return (
                <TableRow key={`${pitch.pitchName}-${pitch.octaveNum}-${index}`}>
                  <TableCell className="font-medium">
                    {pitch.pitchName}
                    {pitch.octaveNum}
                  </TableCell>
                  <TableCell>{intervalName}</TableCell>
                  <TableCell className="text-right">
                    {centValue !== undefined
                      ? `${centValue >= 0 ? "+" : ""}${centValue.toFixed(CENT_DIGIT_NUM)}`
                      : "---"}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex gap-1 justify-center">
                      <Button
                        size="sm"
                        variant={playingState.get(`equal-${index}`) ? "default" : "outline"}
                        onClick={() => toggleEqual(index)}
                        title="平均律を再生/停止"
                      >
                        平
                      </Button>
                      <Button
                        size="sm"
                        variant={playingState.get(`just-${index}`) ? "default" : "outline"}
                        onClick={() => toggleJust(index)}
                        title="純正律を再生/停止"
                      >
                        純
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
