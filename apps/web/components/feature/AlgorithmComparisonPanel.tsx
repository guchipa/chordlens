"use client";

import type { AlgorithmComparisonEntry } from "@chordlens/core/types";

function centColor(value: number | null): string {
    if (value === null) return "text-muted-foreground";
    const abs = Math.abs(value);
    if (abs < 5)  return "text-green-600 font-semibold";
    if (abs < 15) return "text-yellow-600 font-semibold";
    return "text-red-600 font-semibold";
}

function formatCent(value: number | null): string {
    if (value === null) return "—";
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}`;
}

interface AlgorithmComparisonPanelProps {
    entries: AlgorithmComparisonEntry[];
}

export function AlgorithmComparisonPanel({ entries }: AlgorithmComparisonPanelProps) {
    return (
        <div className="w-full max-w-2xl rounded-lg border border-border bg-background overflow-hidden">
            <div className="px-4 py-3 bg-muted/50 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">アルゴリズム比較（セント偏差）</h3>
                <p className="text-xs text-muted-foreground mt-0.5">実験モード中は FFT・SWIPE&#39;・位相ボコーダを並列実行します</p>
            </div>
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs">
                        <th className="px-4 py-2 text-left font-medium">音名</th>
                        <th className="px-4 py-2 text-right font-medium">FFT (cents)</th>
                        <th className="px-4 py-2 text-right font-medium">SWIPE&#39; (cents)</th>
                        <th className="px-4 py-2 text-right font-medium">位相 (cents)</th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map((entry, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                            <td className="px-4 py-2 font-mono font-medium text-foreground">
                                {entry.pitch.pitchName}{entry.pitch.octaveNum}
                            </td>
                            <td className={`px-4 py-2 text-right font-mono ${centColor(entry.fftCentDeviation)}`}>
                                {formatCent(entry.fftCentDeviation)}
                            </td>
                            <td className={`px-4 py-2 text-right font-mono ${centColor(entry.swipeCentDeviation)}`}>
                                {formatCent(entry.swipeCentDeviation)}
                            </td>
                            <td className={`px-4 py-2 text-right font-mono ${centColor(entry.phaseVocoderCentDeviation)}`}>
                                {formatCent(entry.phaseVocoderCentDeviation)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
