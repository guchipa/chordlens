import { getJustFrequencies, getEqualJustDiff } from "@/lib/audio_analysis/calcJustFreq";
import type { Pitch } from "@/lib/types";

describe("calcJustFreq", () => {
  const A4_FREQ = 440;

  describe("getJustFrequencies", () => {
    it("Cメジャーコード(C-E-G)の純正律周波数を正しく計算する", () => {
      const pitchList: Pitch[] = [
        { pitchName: "C", octaveNum: 4, isRoot: true },
        { pitchName: "E", octaveNum: 4, isRoot: false },
        { pitchName: "G", octaveNum: 4, isRoot: false },
      ];

      const result = getJustFrequencies(pitchList, A4_FREQ);

      expect(result).toHaveLength(3);
      
      // C4は根音なので平均律と同じ周波数
      const c4Equal = 440 * Math.pow(2, -9 / 12); // 261.63 Hz
      expect(result[0]).toBeCloseTo(c4Equal, 2);

      // E4は純正律の長3度（5/4倍）
      expect(result[1]).toBeCloseTo(c4Equal * 5 / 4, 2);

      // G4は純正律の完全5度（3/2倍）
      expect(result[2]).toBeCloseTo(c4Equal * 3 / 2, 2);
    });

    it("根音が設定されていない場合は空配列を返す", () => {
      const pitchList: Pitch[] = [
        { pitchName: "C", octaveNum: 4, isRoot: false },
        { pitchName: "E", octaveNum: 4, isRoot: false },
      ];

      const result = getJustFrequencies(pitchList, A4_FREQ);

      expect(result).toEqual([]);
    });

    it("根音が複数設定されている場合は空配列を返す", () => {
      const pitchList: Pitch[] = [
        { pitchName: "C", octaveNum: 4, isRoot: true },
        { pitchName: "E", octaveNum: 4, isRoot: true },
      ];

      const result = getJustFrequencies(pitchList, A4_FREQ);

      expect(result).toEqual([]);
    });

    it("オクターブをまたぐ音でも正しく計算する", () => {
      const pitchList: Pitch[] = [
        { pitchName: "C", octaveNum: 4, isRoot: true },
        { pitchName: "E", octaveNum: 5, isRoot: false }, // 1オクターブ上
      ];

      const result = getJustFrequencies(pitchList, A4_FREQ);

      const c4Equal = 440 * Math.pow(2, -9 / 12);
      // E5は1オクターブ上の長3度なので 5/4 * 2
      expect(result[1]).toBeCloseTo(c4Equal * 5 / 4 * 2, 2);
    });

    it("異なるA4基準周波数でも正しく計算する", () => {
      const pitchList: Pitch[] = [
        { pitchName: "A", octaveNum: 4, isRoot: true },
        { pitchName: "C#", octaveNum: 5, isRoot: false },
      ];

      const customA4 = 442; // 442Hz基準
      const result = getJustFrequencies(pitchList, customA4);

      expect(result[0]).toBeCloseTo(customA4, 2);
      // C#5はA4から長3度上（5/4倍）
      expect(result[1]).toBeCloseTo(customA4 * 5 / 4, 2);
    });
  });

  describe("getEqualJustDiff", () => {
    it("Cメジャーコードの平均律と純正律の差をセント値で返す", () => {
      const pitchList: Pitch[] = [
        { pitchName: "C", octaveNum: 4, isRoot: true },
        { pitchName: "E", octaveNum: 4, isRoot: false },
        { pitchName: "G", octaveNum: 4, isRoot: false },
      ];

      const result = getEqualJustDiff(pitchList, A4_FREQ);

      expect(result).toHaveLength(3);

      // C4は根音なので差は0
      expect(result[0]).toBeCloseTo(0, 2);

      // E4の長3度は平均律より約14セント低い
      expect(result[1]).toBeCloseTo(-13.686, 1);

      // G4の完全5度は平均律より約2セント高い
      expect(result[2]).toBeCloseTo(1.955, 1);
    });

    it("根音が設定されていない場合は空配列を返す", () => {
      const pitchList: Pitch[] = [
        { pitchName: "C", octaveNum: 4, isRoot: false },
      ];

      const result = getEqualJustDiff(pitchList, A4_FREQ);

      expect(result).toEqual([]);
    });

    it("完全1度（同じ音）は差が0セント", () => {
      const pitchList: Pitch[] = [
        { pitchName: "D", octaveNum: 4, isRoot: true },
        { pitchName: "D", octaveNum: 5, isRoot: false }, // オクターブ上も純正
      ];

      const result = getEqualJustDiff(pitchList, A4_FREQ);

      expect(result[0]).toBeCloseTo(0, 2);
      expect(result[1]).toBeCloseTo(0, 2);
    });

    it("マイナーコード(Cm)でも正しく計算する", () => {
      const pitchList: Pitch[] = [
        { pitchName: "C", octaveNum: 4, isRoot: true },
        { pitchName: "D#", octaveNum: 4, isRoot: false }, // 短3度
        { pitchName: "G", octaveNum: 4, isRoot: false },
      ];

      const result = getEqualJustDiff(pitchList, A4_FREQ);

      // 短3度は平均律より約12セント低い（純正短3度は6/5）
      expect(result[1]).toBeCloseTo(-11.731, 1);
    });
  });
});
