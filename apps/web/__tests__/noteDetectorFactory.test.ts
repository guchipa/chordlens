import { createNoteDetector } from "@/lib/audio/noteDetectorFactory";
import { BasicPitchNoteDetector } from "@/lib/audio/basicPitchNoteDetector";
import { PitchPleaseNoteDetector } from "@chordlens/core/audio_analysis/pitchPleaseNoteDetection";
import { CHORD_DETECTION_ALGORITHMS } from "@chordlens/core/constants";

describe("noteDetectorFactory", () => {
    it("basicpitch は BasicPitchNoteDetector を生成する", () => {
        const detector = createNoteDetector("basicpitch");
        expect(detector).toBeInstanceOf(BasicPitchNoteDetector);
    });

    it("pitchplease は PitchPleaseNoteDetector を生成し a4Freq を反映する", () => {
        const detector = createNoteDetector("pitchplease", { a4Freq: 440 });
        expect(detector).toBeInstanceOf(PitchPleaseNoteDetector);
        expect(detector.requiredSampleRate).toBe(22050);
    });

    it("定義済みの全アルゴリズムを生成できる", () => {
        for (const algorithm of CHORD_DETECTION_ALGORITHMS) {
            const detector = createNoteDetector(algorithm);
            expect(detector.requiredSampleRate).toBeGreaterThan(0);
            expect(typeof detector.detectNotes).toBe("function");
        }
    });
});
