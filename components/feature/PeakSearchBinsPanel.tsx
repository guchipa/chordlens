"use client";

import React, { useMemo, useState } from "react";
import type { PeakSearchDebug } from "@/lib/types";
import { Card } from "@/components/ui/card";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

function clamp01(v: number) {
    return Math.max(0, Math.min(1, v));
}

function formatHz(hz: number) {
    if (!Number.isFinite(hz)) return "-";
    if (hz >= 1000) return `${(hz / 1000).toFixed(2)} kHz`;
    return `${hz.toFixed(1)} Hz`;
}

type BinGraphProps = {
    debug: PeakSearchDebug;
    evalThresholdDb?: number;
    width?: number;
    height?: number;
};

const BinGraph: React.FC<BinGraphProps> = ({ debug, evalThresholdDb, width = 560, height = 140 }) => {
    const padding = 10;

    const { points, minDb, maxDb, minHz, maxHz } = useMemo(() => {
        // dB軸は常に固定レンジで表示して比較しやすくする
        const fixedMinDb = -120;
        const fixedMaxDb = 0;

        const bins = debug.bins;
        if (bins.length === 0) {
            return {
                points: "",
                minDb: fixedMinDb,
                maxDb: fixedMaxDb,
                minHz: 0,
                maxHz: 1,
            };
        }

        let minHzLocal = Number.POSITIVE_INFINITY;
        let maxHzLocal = Number.NEGATIVE_INFINITY;

        for (const b of bins) {
            if (Number.isFinite(b.freqHz)) {
                minHzLocal = Math.min(minHzLocal, b.freqHz);
                maxHzLocal = Math.max(maxHzLocal, b.freqHz);
            }
        }
        if (!Number.isFinite(minHzLocal) || !Number.isFinite(maxHzLocal) || minHzLocal === maxHzLocal) {
            minHzLocal = debug.range.minFreqHz;
            maxHzLocal = debug.range.maxFreqHz;
            if (minHzLocal === maxHzLocal) {
                minHzLocal = 0;
                maxHzLocal = 1;
            }
        }

        const w = width - padding * 2;
        const h = height - padding * 2;

        const pts = bins
            .map((b) => {
                const x = padding + ((b.freqHz - minHzLocal) / (maxHzLocal - minHzLocal)) * w;
                const yNorm = (b.db - fixedMinDb) / (fixedMaxDb - fixedMinDb);
                const y = padding + (1 - clamp01(yNorm)) * h;
                return `${x.toFixed(2)},${y.toFixed(2)}`;
            })
            .join(" ");

        return {
            points: pts,
            minDb: fixedMinDb,
            maxDb: fixedMaxDb,
            minHz: minHzLocal,
            maxHz: maxHzLocal,
        };
    }, [debug, height, width]);

    const estX = useMemo(() => {
        const w = width - padding * 2;
        if (maxHz === minHz) return padding;
        return padding + ((debug.estFreqHz - minHz) / (maxHz - minHz)) * w;
    }, [debug.estFreqHz, maxHz, minHz, width]);

    const peakX = useMemo(() => {
        const w = width - padding * 2;
        if (maxHz === minHz) return padding;
        return padding + ((debug.peak.freqHz - minHz) / (maxHz - minHz)) * w;
    }, [debug.peak.freqHz, maxHz, minHz, width]);

    const thresholdY = useMemo(() => {
        if (evalThresholdDb === undefined || !Number.isFinite(evalThresholdDb)) return null;
        const h = height - padding * 2;
        const yNorm = (evalThresholdDb - minDb) / (maxDb - minDb);
        return padding + (1 - clamp01(yNorm)) * h;
    }, [evalThresholdDb, height, maxDb, minDb]);

    return (
        <div className="w-full overflow-x-auto">
            <svg
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                className="rounded-md bg-white border"
                role="img"
                aria-label="ピーク探索範囲スペクトル"
            >
                {/* grid */}
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" />
                <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e5e7eb" />

                {/* estimated freq line */}
                <line x1={estX} y1={padding} x2={estX} y2={height - padding} stroke="#0ea5e9" strokeDasharray="4 3" />

                {/* peak freq line */}
                <line x1={peakX} y1={padding} x2={peakX} y2={height - padding} stroke="#f97316" strokeDasharray="2 2" />

                {/* threshold line (dB) */}
                {thresholdY !== null && evalThresholdDb !== undefined && Number.isFinite(evalThresholdDb) && (
                    <>
                        <line
                            x1={padding}
                            y1={thresholdY}
                            x2={width - padding}
                            y2={thresholdY}
                            stroke="#9ca3af"
                            strokeDasharray="3 3"
                        />
                        <text
                            x={padding + 2}
                            y={Math.max(padding + 10, thresholdY - 2)}
                            fontSize={10}
                            fill="#6b7280"
                        >
                            th {evalThresholdDb.toFixed(1)} dB
                        </text>
                    </>
                )}

                {/* spectrum polyline */}
                <polyline
                    points={points}
                    fill="none"
                    stroke="#111827"
                    strokeWidth={1.5}
                />

                {/* labels */}
                <text x={padding} y={height - 2} fontSize={10} fill="#6b7280">
                    {formatHz(minHz)}
                </text>
                <text x={width - padding} y={height - 2} fontSize={10} fill="#6b7280" textAnchor="end">
                    {formatHz(maxHz)}
                </text>
                <text x={width - padding} y={padding + 10} fontSize={10} fill="#6b7280" textAnchor="end">
                    {maxDb.toFixed(1)} dB
                </text>
                <text x={width - padding} y={height - padding - 4} fontSize={10} fill="#6b7280" textAnchor="end">
                    {minDb.toFixed(1)} dB
                </text>
            </svg>
        </div>
    );
};

export const PeakSearchBinsPanel: React.FC<{
    peakSearchDebug: PeakSearchDebug[] | null;
    isProcessing: boolean;
    evalThresholdDb?: number;
}> = ({ peakSearchDebug, isProcessing, evalThresholdDb }) => {
    const [open, setOpen] = useState<string | undefined>("bins");

    return (
        <Card className="w-full max-w-4xl p-4">
            <Accordion
                type="single"
                collapsible
                value={open}
                onValueChange={(v) => setOpen(v || undefined)}
            >
                <AccordionItem value="bins">
                    <AccordionTrigger>
                        ピーク探索範囲（ビン列）の可視化
                    </AccordionTrigger>
                    <AccordionContent>
                        {!isProcessing && (
                            <div className="text-sm text-muted-foreground">
                                解析開始後に、各構成音の探索範囲スペクトルを表示します。
                            </div>
                        )}

                        {isProcessing && (!peakSearchDebug || peakSearchDebug.length === 0) && (
                            <div className="text-sm text-muted-foreground">
                                デバッグ情報を準備中…（root未設定/構成音なしの場合は表示されません）
                            </div>
                        )}

                        {peakSearchDebug && peakSearchDebug.length > 0 && (
                            <div className="flex flex-col gap-4">
                                <div className="text-xs text-muted-foreground">
                                    青: 期待周波数 / 橙: 推定ピーク（補間後） / 灰: 音量しきい値
                                </div>

                                {peakSearchDebug.map((d) => {
                                    const key = `${d.pitch.pitchName}${d.pitch.octaveNum}`;
                                    const title = `${d.pitch.pitchName}${d.pitch.octaveNum}`;
                                    return (
                                        <div key={key} className="space-y-2">
                                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                                <div className="font-medium">{title}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    bins: {d.bins.length} / range: {formatHz(d.range.minFreqHz)} – {formatHz(d.range.maxFreqHz)} / peak: {formatHz(d.peak.freqHz)} ({d.peak.db.toFixed(1)} dB)
                                                </div>
                                            </div>
                                            <BinGraph debug={d} evalThresholdDb={evalThresholdDb} />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </Card>
    );
};
