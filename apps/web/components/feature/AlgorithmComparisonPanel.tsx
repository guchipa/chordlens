import type { AlgorithmComparisonEntry } from "@chordlens/core/types";

import styles from "./AlgorithmComparisonPanel.module.css";

function centColor(value: number | null): string {
    if (value === null) return styles.muted;
    const abs = Math.abs(value);
    if (abs < 5) return styles.ok;
    if (abs < 15) return styles.close;
    return styles.off;
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
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>アルゴリズム比較（セント偏差）</h3>
                <p className={styles.subtitle}>実験モード中は FFT・SWIPE&#39;・位相ボコーダを並列実行します</p>
            </div>
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr className={styles.headerRow}>
                            <th className={styles.th}>音名</th>
                            <th className={styles.thRight}>FFT (cents)</th>
                            <th className={styles.thRight}>SWIPE&#39; (cents)</th>
                            <th className={styles.thRight}>位相 (cents)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((entry, i) => (
                            <tr key={i} className={styles.row}>
                                <td className={styles.pitchCell}>
                                    {entry.pitch.pitchName}{entry.pitch.octaveNum}
                                </td>
                                <td className={`${styles.valueCell} ${centColor(entry.fftCentDeviation)}`}>
                                    {formatCent(entry.fftCentDeviation)}
                                </td>
                                <td className={`${styles.valueCell} ${centColor(entry.swipeCentDeviation)}`}>
                                    {formatCent(entry.swipeCentDeviation)}
                                </td>
                                <td className={`${styles.valueCell} ${centColor(entry.phaseVocoderCentDeviation)}`}>
                                    {formatCent(entry.phaseVocoderCentDeviation)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
