import {
  midiNoteToPitch,
  noteEventsToPitchList,
} from "../../src/audio_analysis/chordToneEstimation";
import type { DetectedNoteEvent } from "../../src/adapters/noteDetection";

/** テスト用ノートイベントの生成ヘルパー */
function note(
  midiNote: number,
  durationSeconds = 1.0,
  amplitude = 0.8,
  startTimeSeconds = 0
): DetectedNoteEvent {
  return { midiNote, startTimeSeconds, durationSeconds, amplitude };
}

describe("chordToneEstimation", () => {
  describe("midiNoteToPitch", () => {
    it("A4 = 69 を変換する", () => {
      expect(midiNoteToPitch(69)).toEqual({ pitchName: "A", octaveNum: 4 });
    });

    it("C4 = 60 を変換する", () => {
      expect(midiNoteToPitch(60)).toEqual({ pitchName: "C", octaveNum: 4 });
    });

    it("黒鍵は PITCH_NAME_LIST の表記 (C#, Eb, F#, G#, Bb) に従う", () => {
      expect(midiNoteToPitch(61).pitchName).toBe("C#");
      expect(midiNoteToPitch(63).pitchName).toBe("Eb");
      expect(midiNoteToPitch(66).pitchName).toBe("F#");
      expect(midiNoteToPitch(68).pitchName).toBe("G#");
      expect(midiNoteToPitch(70).pitchName).toBe("Bb");
    });

    it("小数の MIDI ノート番号は四捨五入する", () => {
      expect(midiNoteToPitch(60.4)).toEqual({ pitchName: "C", octaveNum: 4 });
      expect(midiNoteToPitch(60.6)).toEqual({ pitchName: "C#", octaveNum: 4 });
    });
  });

  describe("noteEventsToPitchList", () => {
    it("Cメジャーコード(C4-E4-G4)を構成音リストに変換し、根音Cを推定する", () => {
      const events = [note(60), note(64), note(67)];

      const result = noteEventsToPitchList(events);

      expect(result).toHaveLength(3);
      expect(result.map((p) => `${p.pitchName}${p.octaveNum}`)).toEqual([
        "C4",
        "E4",
        "G4",
      ]);
      expect(result[0].isRoot).toBe(true);
      expect(result[1].isRoot).toBe(false);
      expect(result[2].isRoot).toBe(false);
      expect(result.every((p) => p.enabled)).toBe(true);
    });

    it("転回形(E3-G3-C4)でも根音Cを正しく推定する", () => {
      const events = [note(52), note(55), note(60)];

      const result = noteEventsToPitchList(events);

      expect(result.map((p) => `${p.pitchName}${p.octaveNum}`)).toEqual([
        "E3",
        "G3",
        "C4",
      ]);
      expect(result.find((p) => p.isRoot)?.pitchName).toBe("C");
      expect(result.filter((p) => p.isRoot)).toHaveLength(1);
    });

    it("コード照合で根音が確定しない場合は最低音をルートとする", () => {
      // トライトーンのダイアド (C4, F#4) はコード定義に一致しない
      const events = [note(60), note(66)];

      const result = noteEventsToPitchList(events);

      expect(result).toHaveLength(2);
      expect(result[0].isRoot).toBe(true);
      expect(result[1].isRoot).toBe(false);
    });

    it("単音の場合はその音をルートとする", () => {
      const result = noteEventsToPitchList([note(69)]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        pitchName: "A",
        octaveNum: 4,
        isRoot: true,
        enabled: true,
      });
    });

    it("空のイベント列からは空リストを返す", () => {
      expect(noteEventsToPitchList([])).toEqual([]);
    });

    it("発音時間が短すぎるノートを除外する", () => {
      const events = [note(60), note(64), note(75, 0.05)];

      const result = noteEventsToPitchList(events, {
        minTotalDurationSeconds: 0.15,
      });

      expect(result.map((p) => p.pitchName)).toEqual(["C", "E"]);
    });

    it("振幅が小さすぎるノートを除外する", () => {
      const events = [note(60), note(64), note(75, 1.0, 0.05)];

      const result = noteEventsToPitchList(events, { minAmplitude: 0.1 });

      expect(result.map((p) => p.pitchName)).toEqual(["C", "E"]);
    });

    it("相対スコアが低いノート(かすかな倍音など)を除外する", () => {
      // C4-E4-G4 は強く長い。C7 は閾値は超えるがスコア比で除外される
      const events = [
        note(60, 2.0, 0.9),
        note(64, 2.0, 0.9),
        note(67, 2.0, 0.9),
        note(96, 0.2, 0.15),
      ];

      const result = noteEventsToPitchList(events, {
        relativeScoreThreshold: 0.15,
      });

      expect(result.map((p) => p.pitchName)).toEqual(["C", "E", "G"]);
    });

    it("同じ MIDI ノートの複数イベントは発音時間を合算して集約する", () => {
      // C4 が 0.1 秒 × 3 回 → 合計 0.3 秒で閾値 (0.15) を超える
      const events = [
        note(60, 0.1, 0.8, 0),
        note(60, 0.1, 0.8, 0.5),
        note(60, 0.1, 0.8, 1.0),
        note(64, 1.0),
        note(67, 1.0),
      ];

      const result = noteEventsToPitchList(events);

      expect(result.map((p) => p.pitchName)).toEqual(["C", "E", "G"]);
    });

    it("maxNotes を超える場合はスコア上位のみ採用する", () => {
      const events = [
        note(48, 2.0, 0.9),
        note(52, 2.0, 0.9),
        note(55, 2.0, 0.9),
        note(60, 1.5, 0.8),
        note(64, 1.5, 0.8),
      ];

      const result = noteEventsToPitchList(events, { maxNotes: 3 });

      expect(result).toHaveLength(3);
      expect(result.map((p) => `${p.pitchName}${p.octaveNum}`)).toEqual([
        "C3",
        "E3",
        "G3",
      ]);
    });

    it("オクターブ範囲(1〜6)外のノートを除外する", () => {
      // C0 = 12, C8 = 108 は範囲外
      const events = [note(12), note(60), note(64), note(67), note(108)];

      const result = noteEventsToPitchList(events);

      expect(result.map((p) => `${p.pitchName}${p.octaveNum}`)).toEqual([
        "C4",
        "E4",
        "G4",
      ]);
    });

    it("全ノートが閾値未満の場合は空リストを返す", () => {
      const events = [note(60, 0.01, 0.01)];

      expect(noteEventsToPitchList(events)).toEqual([]);
    });

    it("オクターブ下よりスコアが大幅に低い音を倍音の残滓として除外する", () => {
      // C3 は長く強い。C4 は一部フレームにだけ現れた第2倍音
      // (スコア比 0.06/1.8 ≈ 0.03 < 0.35)。ただし相対スコア閾値は
      // かからないよう relativeScoreThreshold を下げて分離検証する
      const events = [
        note(48, 2.0, 0.9),
        note(52, 2.0, 0.9),
        note(55, 2.0, 0.9),
        note(60, 0.2, 0.3),
      ];

      const result = noteEventsToPitchList(events, {
        relativeScoreThreshold: 0,
        harmonicSuppressionScoreRatio: 0.35,
      });

      expect(result.map((p) => `${p.pitchName}${p.octaveNum}`)).toEqual([
        "C3",
        "E3",
        "G3",
      ]);
    });

    it("12度下 (3倍音位置) よりスコアが大幅に低い音も除外する", () => {
      // G4 (=3×C3 の位置) が一部フレームにだけ現れた第3倍音
      const events = [
        note(48, 2.0, 0.9),
        note(52, 2.0, 0.9),
        note(67, 0.2, 0.3),
      ];

      const result = noteEventsToPitchList(events, {
        relativeScoreThreshold: 0,
        harmonicSuppressionScoreRatio: 0.35,
      });

      expect(result.map((p) => `${p.pitchName}${p.octaveNum}`)).toEqual([
        "C3",
        "E3",
      ]);
    });

    it("スコアが同程度のオクターブ重ねは残す", () => {
      const events = [note(48, 2.0, 0.9), note(60, 1.8, 0.8)];

      const result = noteEventsToPitchList(events, {
        harmonicSuppressionScoreRatio: 0.35,
      });

      expect(result.map((p) => `${p.pitchName}${p.octaveNum}`)).toEqual([
        "C3",
        "C4",
      ]);
    });

    it("harmonicSuppressionScoreRatio: 0 で倍音抑制を無効にできる", () => {
      const events = [
        note(48, 2.0, 0.9),
        note(52, 2.0, 0.9),
        note(55, 2.0, 0.9),
        note(60, 0.2, 0.3),
      ];

      const result = noteEventsToPitchList(events, {
        relativeScoreThreshold: 0,
        harmonicSuppressionScoreRatio: 0,
      });

      expect(result.map((p) => `${p.pitchName}${p.octaveNum}`)).toContain("C4");
    });

    describe("scoreMode: medianSalience", () => {
      /** frames の各フレームで note を鳴らすイベント列を作る (frames は 0.25 秒刻みの index) */
      function framedNotes(
        entries: { midiNote: number; amplitude: number; frames: number[] }[]
      ): DetectedNoteEvent[] {
        return entries.flatMap(({ midiNote, amplitude, frames }) =>
          frames.map((i) => ({
            midiNote,
            startTimeSeconds: i * 0.25,
            durationSeconds: 0.25,
            amplitude,
          }))
        );
      }

      it("80% のフレームで持続する音は採用され、30% しか鳴らない散発音は除外される", () => {
        // アクティブフレームは 0〜9 の 10 枚。持続音 (C4) は 8 枚 (80%)、
        // 散発音 (E4) は 3 枚 (30%、うち 1 枚は持続音と重なる)
        const events = framedNotes([
          {
            midiNote: 60,
            amplitude: 0.3,
            frames: [0, 1, 2, 3, 4, 5, 6, 7],
          },
          { midiNote: 64, amplitude: 0.9, frames: [3, 8, 9] },
        ]);

        const result = noteEventsToPitchList(events, {
          scoreMode: "medianSalience",
        });

        expect(result.map((p) => `${p.pitchName}${p.octaveNum}`)).toEqual([
          "C4",
        ]);
      });

      it("provisional イベントも中央値の標本として数える", () => {
        const events: DetectedNoteEvent[] = Array.from(
          { length: 10 },
          (_, i) => ({
            midiNote: 60,
            startTimeSeconds: i * 0.25,
            durationSeconds: 0.25,
            amplitude: 0.4,
            provisional: true,
          })
        );

        const result = noteEventsToPitchList(events, {
          scoreMode: "medianSalience",
        });

        expect(result.map((p) => `${p.pitchName}${p.octaveNum}`)).toEqual([
          "C4",
        ]);
      });

      it("鳴っていないフレームは 0 として埋められ、中央値を下げる", () => {
        // ケース1: アクティブフレームが 5 枚で、対象音は全枚 (5/5) に鳴る
        // → 中央値はそのまま振幅 (0.5)
        const denseEvents = framedNotes([
          { midiNote: 60, amplitude: 0.5, frames: [0, 1, 2, 3, 4] },
        ]);
        const dense = noteEventsToPitchList(denseEvents, {
          scoreMode: "medianSalience",
          minMedianSalience: 0.3,
        });
        expect(dense.map((p) => `${p.pitchName}${p.octaveNum}`)).toEqual([
          "C4",
        ]);

        // ケース2: 別の音 (E4) がフレーム 5〜9 を追加するため、
        // アクティブフレームが 10 枚に増える。対象音 (C4) は同じ 5 枚のままで
        // 残り 5 枚がゼロ埋めされ、中央値が 0.5 → 0.25 に下がって閾値を割る
        const sparseEvents = framedNotes([
          { midiNote: 60, amplitude: 0.5, frames: [0, 1, 2, 3, 4] },
          { midiNote: 64, amplitude: 0.5, frames: [5, 6, 7, 8, 9] },
        ]);
        const sparse = noteEventsToPitchList(sparseEvents, {
          scoreMode: "medianSalience",
          minMedianSalience: 0.3,
        });
        expect(
          sparse.map((p) => `${p.pitchName}${p.octaveNum}`)
        ).not.toContain("C4");
      });
    });

    it("durationAmplitude モードの結果は既定 (省略時) と scoreMode 明示指定で一致する (回帰)", () => {
      const events = [
        note(60, 0.3, 0.8),
        note(64, 0.5, 0.6),
        note(67, 1.0, 0.9),
        note(72, 0.05, 0.3), // minTotalDurationSeconds 未満で除外されるはず
      ];

      const implicit = noteEventsToPitchList(events);
      const explicit = noteEventsToPitchList(events, {
        scoreMode: "durationAmplitude",
      });

      expect(explicit).toEqual(implicit);
      expect(implicit.map((p) => `${p.pitchName}${p.octaveNum}`)).toEqual([
        "C4",
        "E4",
        "G4",
      ]);
    });

    it("durationAmplitude (legacy) モードは provisional イベントを集約前に除外する", () => {
      const events: DetectedNoteEvent[] = [
        note(60, 1.0, 0.8),
        { ...note(67, 1.0, 0.9), provisional: true },
      ];

      const result = noteEventsToPitchList(events);

      expect(result.map((p) => `${p.pitchName}${p.octaveNum}`)).toEqual([
        "C4",
      ]);
    });
  });
});
