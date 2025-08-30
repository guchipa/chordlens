"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formType } from "@/lib/schema";
import { getEqualJustDiff } from "@/lib/audio_analysis/calcJustFreq";

// 各音名に対応する色のマップ
const PITCH_COLOR_MAP: { [key: string]: string } = {
  "C": "#ff6b6b",
  "C#": "#ff8e53",
  "D": "#ffc107",
  "E♭": "#fde047",
  "E": "#a8e063",
  "F": "#56ab2f",
  "F#": "#26de81",
  "G": "#2bcbba",
  "G#": "#45aaf2",
  "A": "#0fb9b1",
  "B♭": "#4a90e2",
  "B": "#8e44ad",
};

// 表示するcentの小数点以下桁数
const CENT_DIGIT_NUM = 2;

interface CentDisplayProps {
  pitchList: formType[];
  a4Freq: number;
  title?: string;
}

export const CentDisplay: React.FC<CentDisplayProps> = ({ pitchList, a4Freq, title }) => {
  const equalJustDiff = getEqualJustDiff(pitchList, a4Freq);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap justify-start gap-x-4 gap-y-2 mt-4">
          {pitchList.map(({ pitchName, octaveNum }, index) => (
            <div
              key={`${pitchName}-${octaveNum}-${index}`}
              className="flex items-center gap-2 text-sm"
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: PITCH_COLOR_MAP[pitchName] || "#888",
                }}
              />
              <span className="font-semibold">
                {pitchName}
                {octaveNum}
              </span>
              <span>
                {equalJustDiff[index].toFixed(CENT_DIGIT_NUM)} cents
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
