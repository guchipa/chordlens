import { useState } from "react";
import {
  EVAL_RANGE_CENTS,
  A4_FREQ,
  EVAL_THRESHOLD,
  FFT_SIZE,
  SMOOTHING_TIME_CONSTANT,
} from "@/lib/constants";

export function useAudioSettings() {
  const [evalRangeCents, setEvalRangeCents] = useState(EVAL_RANGE_CENTS);
  const [a4Freq, setA4Freq] = useState(A4_FREQ);
  const [evalThreshold, setEvalThreshold] = useState(EVAL_THRESHOLD);
  const [fftSize, setFftSize] = useState(FFT_SIZE);
  const [smoothingTimeConstant, setSmoothingTimeConstant] = useState(
    SMOOTHING_TIME_CONSTANT
  );

  return {
    evalRangeCents,
    setEvalRangeCents,
    a4Freq,
    setA4Freq,
    evalThreshold,
    setEvalThreshold,
    fftSize,
    setFftSize,
    smoothingTimeConstant,
    setSmoothingTimeConstant,
  };
}
