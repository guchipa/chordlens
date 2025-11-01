import { useState, useCallback } from "react";
import { UseFormReturn } from "react-hook-form";
import { DEFAULT_INITIAL_PITCH_LIST } from "@/lib/constants";
import type { Pitch } from "@/lib/types";

export function usePitchList(form: UseFormReturn<Pitch>) {
  const [currentPitchList, setCurrentPitchList] = useState<Pitch[]>(
    DEFAULT_INITIAL_PITCH_LIST
  );

  const onSubmit = useCallback(
    (data: Pitch) => {
      setCurrentPitchList((prevList) => {
        // 同じ音名とオクターブの組み合わせが既に存在するかチェック
        const existingIndex = prevList.findIndex(
          (item) =>
            item.pitchName === data.pitchName &&
            item.octaveNum === data.octaveNum
        );
        if (existingIndex !== -1) {
          // 既存の要素を更新
          const newList = [...prevList];
          newList[existingIndex] = data;
          return newList;
        }
        // 新規追加
        return [...prevList, data];
      });
      form.reset({
        pitchName: undefined,
        octaveNum: 4,
        isRoot: false,
      });
    },
    [form]
  );

  const removePitch = useCallback((indexToRemove: number) => {
    setCurrentPitchList((prevList) =>
      prevList.filter((_, index) => index !== indexToRemove)
    );
  }, []);

  const clearPitchList = useCallback(() => {
    setCurrentPitchList([]);
  }, []);

  const handleLoadPreset = useCallback((pitchList: Pitch[]) => {
    setCurrentPitchList(pitchList);
  }, []);

  return {
    currentPitchList,
    setCurrentPitchList,
    onSubmit,
    removePitch,
    clearPitchList,
    handleLoadPreset,
  };
}
