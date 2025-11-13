"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formType } from "@/lib/schema";
import { getEqualJustDiff } from "@/lib/audio_analysis/calcJustFreq";
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
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
