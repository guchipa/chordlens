"use client";

import { useAtom, useSetAtom } from "jotai";
import { useMemo, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PITCH_NAME_LIST, OCTAVE_NUM_LIST } from "@/lib/constants";
import { FormSchema, type Pitch } from "@/lib/types";
import { MicInputButton } from "@/components/feature/MicInputButton";
import { PitchConfirmDialog } from "@/components/feature/PitchConfirmDialog";
import type { PitchCandidate } from "@/lib/audio_analysis/pitchDetection";
import { pitchListAtom, addOrUpdatePitchAtom, a4FreqAtom } from "@/lib/store";

// フォーム入力型（zodスキーマの入力型を明示的に取得）
type PitchFormInput = z.input<typeof FormSchema>;

export function PitchSettingForm() {
  const [currentPitchList] = useAtom(pitchListAtom);
  const addOrUpdatePitch = useSetAtom(addOrUpdatePitchAtom);
  const [a4Freq] = useAtom(a4FreqAtom);

  const form = useForm<PitchFormInput, unknown, Pitch>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      pitchName: "",
      octaveNum: 4,
      isRoot: false,
      enabled: true,
    },
  });

  // マイク入力による音名推定の状態
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [detectedCandidates, setDetectedCandidates] = useState<
    PitchCandidate[]
  >([]);

  // マイク入力による検出完了時のハンドラ
  const handleDetectionComplete = useCallback(
    (candidates: PitchCandidate[]) => {
      if (candidates.length > 0) {
        setDetectedCandidates(candidates);
        setIsDialogOpen(true);
      }
    },
    []
  );

  // 検出した音を追加するハンドラ
  const handleConfirmPitch = useCallback(
    (selected: PitchCandidate) => {
      addOrUpdatePitch({
        pitchName: selected.pitchName,
        octaveNum: selected.octaveNum,
        isRoot: false,
        enabled: true,
      });
      // ダイアログを閉じてリセット
      setIsDialogOpen(false);
      setDetectedCandidates([]);
    },
    [addOrUpdatePitch]
  );

  // キャンセル時のハンドラ
  const handleCancelPitch = useCallback(() => {
    setIsDialogOpen(false);
    setDetectedCandidates([]);
  }, []);

  const isRootChecked = form.watch("isRoot");
  const hasRoot = useMemo(
    () => currentPitchList?.some((p) => p.isRoot) ?? false,
    [currentPitchList]
  );

  const showRootWarning = useMemo(() => {
    // 根音がなく、かつ isRoot がチェックされていなければ警告
    return !hasRoot && !isRootChecked;
  }, [hasRoot, isRootChecked]);

  const pitchName = form.watch("pitchName");
  const octaveNum = form.watch("octaveNum");

  const isFormValid = useMemo(() => {
    return (
      pitchName !== undefined &&
      pitchName !== "" &&
      PITCH_NAME_LIST.includes(pitchName) &&
      octaveNum !== undefined &&
      !isNaN(octaveNum)
    );
  }, [pitchName, octaveNum]);

  const onSubmit = useCallback(
    (data: Pitch) => {
      addOrUpdatePitch(data);
      form.reset({
        pitchName: undefined,
        octaveNum: 4,
        isRoot: false,
        enabled: true,
      });
    },
    [addOrUpdatePitch, form]
  );

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>評価する音の追加</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="pitchName"
              render={({ field }) => (
                <FormItem className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                  <FormLabel className="mb-1 whitespace-nowrap sm:mb-0 sm:w-24">
                    音名
                  </FormLabel>
                  <Select
                    key={`pitchName-${field.value || "empty"}`}
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="音名を選んでください" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PITCH_NAME_LIST.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="sm:ml-28" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="octaveNum"
              render={({ field }) => (
                <FormItem className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                  <FormLabel className="mb-1 whitespace-nowrap sm:mb-0 sm:w-24">
                    オクターブ
                  </FormLabel>
                  <div className="flex items-center gap-2 flex-1">
                    <Select
                      onValueChange={(val) => field.onChange(Number(val))}
                      value={field.value ? field.value.toString() : undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="オクターブ番号を選んでください" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OCTAVE_NUM_LIST.map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <MicInputButton
                      onDetectionComplete={handleDetectionComplete}
                      a4Freq={a4Freq}
                    />
                  </div>
                  <FormMessage className="sm:ml-28" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isRoot"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={!!field.value}
                      onCheckedChange={field.onChange}
                      disabled={hasRoot} // 根音が既にある場合は無効化
                      id="is-root-checkbox"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel
                      htmlFor="is-root-checkbox"
                      className={`cursor-pointer ${hasRoot ? "cursor-not-allowed text-gray-500" : ""
                        }`}
                    >
                      根音として設定
                    </FormLabel>
                    {hasRoot && (
                      <p className="text-xs text-gray-500">
                        根音は既に設定されています。2つ目の根音は設定できません。
                      </p>
                    )}
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value !== false} // undefined (default) or true -> checked
                      onCheckedChange={field.onChange}
                      id="enabled-checkbox"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel
                      htmlFor="enabled-checkbox"
                      className="cursor-pointer"
                    >
                      計測に含める
                    </FormLabel>
                    <p className="text-xs text-gray-500">
                      チェックを外すと、この音は解析の対象外となります（根音としての計算には使用されます）。
                    </p>
                  </div>
                </FormItem>
              )}
            />
            {showRootWarning && (
              <p className="text-sm font-medium text-red-600">
                警告: 根音が設定されていません。解析には根音の指定が必要です。
              </p>
            )}
            <Button type="submit" className="w-full" disabled={!isFormValid}>
              設定した音を追加
            </Button>
          </form>
        </Form>
      </CardContent>
      {/* マイク入力による音名検出の確認ダイアログ */}
      <PitchConfirmDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        candidates={detectedCandidates}
        onConfirm={handleConfirmPitch}
        onCancel={handleCancelPitch}
      />
    </Card>
  );
}