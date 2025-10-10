"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formType } from "@/lib/schema";
import { getEqualJustDiff } from "@/lib/audio_analysis/calcJustFreq";

import { PITCH_COLOR_MAP } from "@/lib/constants";

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
                {equalJustDiff[index] !== undefined
                  ? `${equalJustDiff[index].toFixed(CENT_DIGIT_NUM)} cents`
                  : "---"}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
