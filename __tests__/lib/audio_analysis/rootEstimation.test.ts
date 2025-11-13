import { estimateRoot } from "@/lib/audio_analysis/rootEstimation";
import type { formType } from "@/lib/schema";

describe("rootEstimation", () => {
  describe("estimateRoot", () => {
    it("Cメジャーコード(C-E-G)から根音Cを推定する", () => {
      const pitchList: formType[] = [
        { pitchName: "C", octaveNum: 4, isRoot: false },
        { pitchName: "E", octaveNum: 4, isRoot: false },
        { pitchName: "G", octaveNum: 4, isRoot: false },
      ];

      const mockSetPitchList = jest.fn();
      estimateRoot(pitchList, mockSetPitchList);

      expect(mockSetPitchList).toHaveBeenCalledTimes(1);
      const result = mockSetPitchList.mock.calls[0][0];

      // Cが根音としてマークされる
      expect(result[0].isRoot).toBe(true);
      expect(result[1].isRoot).toBe(false);
      expect(result[2].isRoot).toBe(false);
    });

    it("Dマイナーコード(D-F-A)から根音Dを推定する", () => {
      const pitchList: formType[] = [
        { pitchName: "D", octaveNum: 4, isRoot: false },
        { pitchName: "F", octaveNum: 4, isRoot: false },
        { pitchName: "A", octaveNum: 4, isRoot: false },
      ];

      const mockSetPitchList = jest.fn();
      estimateRoot(pitchList, mockSetPitchList);

      expect(mockSetPitchList).toHaveBeenCalledTimes(1);
      const result = mockSetPitchList.mock.calls[0][0];

      // Dが根音としてマークされる
      expect(result[0].isRoot).toBe(true);
      expect(result[1].isRoot).toBe(false);
      expect(result[2].isRoot).toBe(false);
    });

    it("G7コード(G-B-D-F)から根音Gを推定する", () => {
      const pitchList: formType[] = [
        { pitchName: "G", octaveNum: 3, isRoot: false },
        { pitchName: "B", octaveNum: 3, isRoot: false },
        { pitchName: "D", octaveNum: 4, isRoot: false },
        { pitchName: "F", octaveNum: 4, isRoot: false },
      ];

      const mockSetPitchList = jest.fn();
      estimateRoot(pitchList, mockSetPitchList);

      expect(mockSetPitchList).toHaveBeenCalledTimes(1);
      const result = mockSetPitchList.mock.calls[0][0];

      // Gが根音としてマークされる
      expect(result[0].isRoot).toBe(true);
    });

    it("音が2つ未満の場合は何もしない", () => {
      const pitchList: formType[] = [
        { pitchName: "C", octaveNum: 4, isRoot: false },
      ];

      const mockSetPitchList = jest.fn();
      estimateRoot(pitchList, mockSetPitchList);

      expect(mockSetPitchList).not.toHaveBeenCalled();
    });

    it("空配列の場合は何もしない", () => {
      const pitchList: formType[] = [];

      const mockSetPitchList = jest.fn();
      estimateRoot(pitchList, mockSetPitchList);

      expect(mockSetPitchList).not.toHaveBeenCalled();
    });

    it("同じ音名が複数オクターブにまたがっても正しく推定する", () => {
      const pitchList: formType[] = [
        { pitchName: "C", octaveNum: 3, isRoot: false },
        { pitchName: "E", octaveNum: 4, isRoot: false },
        { pitchName: "G", octaveNum: 4, isRoot: false },
        { pitchName: "C", octaveNum: 5, isRoot: false },
      ];

      const mockSetPitchList = jest.fn();
      estimateRoot(pitchList, mockSetPitchList);

      expect(mockSetPitchList).toHaveBeenCalledTimes(1);
      const result = mockSetPitchList.mock.calls[0][0];

      // 両方のCが根音としてマークされる
      expect(result[0].isRoot).toBe(true);
      expect(result[1].isRoot).toBe(false);
      expect(result[2].isRoot).toBe(false);
      expect(result[3].isRoot).toBe(true);
    });

    it("転回形でも正しく根音を推定する（第1転回形：E-G-C）", () => {
      const pitchList: formType[] = [
        { pitchName: "E", octaveNum: 4, isRoot: false },
        { pitchName: "G", octaveNum: 4, isRoot: false },
        { pitchName: "C", octaveNum: 5, isRoot: false },
      ];

      const mockSetPitchList = jest.fn();
      estimateRoot(pitchList, mockSetPitchList);

      expect(mockSetPitchList).toHaveBeenCalledTimes(1);
      const result = mockSetPitchList.mock.calls[0][0];

      // Cが根音としてマークされる（音の順序に関わらず）
      expect(result[0].isRoot).toBe(false);
      expect(result[1].isRoot).toBe(false);
      expect(result[2].isRoot).toBe(true);
    });

    it("Am7コード(A-C-E-G)から根音Aを推定する", () => {
      const pitchList: formType[] = [
        { pitchName: "A", octaveNum: 3, isRoot: false },
        { pitchName: "C", octaveNum: 4, isRoot: false },
        { pitchName: "E", octaveNum: 4, isRoot: false },
        { pitchName: "G", octaveNum: 4, isRoot: false },
      ];

      const mockSetPitchList = jest.fn();
      estimateRoot(pitchList, mockSetPitchList);

      expect(mockSetPitchList).toHaveBeenCalledTimes(1);
      const result = mockSetPitchList.mock.calls[0][0];

      // Aが根音としてマークされる
      expect(result[0].isRoot).toBe(true);
    });
  });
});
