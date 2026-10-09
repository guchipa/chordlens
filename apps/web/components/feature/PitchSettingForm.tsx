"use client";

import { useAtom, useSetAtom } from "jotai";
import { useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { SettingsSection, TAP_ROW } from "@/components/layout/SettingsSection";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PITCH_NAME_LIST, OCTAVE_NUM_LIST } from "@chordlens/core/constants";
import { FormSchema, type Pitch } from "@chordlens/core/types";
import { MicInputButton } from "@/components/feature/MicInputButton";
import { pitchListAtom, addOrUpdatePitchAtom } from "@/lib/store";

// フォーム入力型（zodスキーマの入力型を明示的に取得）
type PitchFormInput = z.input<typeof FormSchema>;

export function PitchSettingForm() {
  const [currentPitchList] = useAtom(pitchListAtom);
  const addOrUpdatePitch = useSetAtom(addOrUpdatePitchAtom);

  const form = useForm<PitchFormInput, unknown, Pitch>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      pitchName: "",
      octaveNum: 4,
      isRoot: false,
      enabled: true,
    },
  });

  // マイク入力で検出した音を即時追加するハンドラ
  const handleMicDetect = useCallback(
    (pitch: Pitch) => {
      addOrUpdatePitch({ ...pitch, isRoot: false, enabled: true });
    },
    [addOrUpdatePitch]
  );

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
    <SettingsSection title="評価する音の追加">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="pitchName"
            render={({ field }) => (
              <FormItem className="gap-1.5">
                <span id="pitch-name-label" className="text-sm font-medium">
                  音名
                </span>
                <div
                  role="group"
                  aria-labelledby="pitch-name-label"
                  className="grid grid-cols-6 gap-1"
                >
                  {PITCH_NAME_LIST.map((name) => {
                    const selected = field.value === name;
                    const isAccidental = name.length > 1;
                    return (
                      <button
                        key={name}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => field.onChange(name)}
                        className={cn(
                          "h-11 rounded-lg border text-base font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : isAccidental
                              ? "border-transparent bg-slate-200 text-slate-800 active:bg-slate-300"
                              : "bg-background active:bg-accent"
                        )}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="octaveNum"
            render={({ field }) => (
              <FormItem className="gap-1.5">
                <span id="octave-label" className="text-sm font-medium">
                  オクターブ
                </span>
                <div
                  role="group"
                  aria-labelledby="octave-label"
                  className="bg-background flex rounded-lg border p-0.5"
                >
                  {OCTAVE_NUM_LIST.map((num) => {
                    const selected = Number(field.value) === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => field.onChange(num)}
                        className={cn(
                          "h-11 min-w-0 flex-1 rounded-md text-base font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "active:bg-accent"
                        )}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-wrap items-center gap-3">
            <MicInputButton onDetect={handleMicDetect} />
            <span className="text-muted-foreground flex-1 text-sm">
              マイクで鳴っている音を検出して追加
            </span>
          </div>
          <div className="divide-y rounded-lg border bg-background px-3">
            <FormField
              control={form.control}
              name="isRoot"
              render={({ field }) => (
                <FormItem className="gap-0 py-1">
                  <label
                    htmlFor="is-root-checkbox"
                    className={cn(
                      TAP_ROW,
                      hasRoot && "cursor-not-allowed text-gray-500"
                    )}
                  >
                    <FormControl>
                      <Checkbox
                        touch
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                        disabled={hasRoot} // 根音が既にある場合は無効化
                        id="is-root-checkbox"
                        className="-mx-2"
                      />
                    </FormControl>
                    <span className="text-sm font-medium">根音として設定</span>
                  </label>
                  {hasRoot && (
                    <p className="text-xs text-gray-500 pb-2">
                      根音は既に設定されています。2つ目の根音は設定できません。
                    </p>
                  )}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="gap-0 py-1">
                  <label htmlFor="enabled-checkbox" className={TAP_ROW}>
                    <FormControl>
                      <Checkbox
                        touch
                        checked={field.value !== false} // undefined (default) or true -> checked
                        onCheckedChange={field.onChange}
                        id="enabled-checkbox"
                        className="-mx-2"
                      />
                    </FormControl>
                    <span className="text-sm font-medium">計測に含める</span>
                  </label>
                  <p className="text-xs text-gray-500 pb-2">
                    チェックを外すと、この音は解析の対象外となります（根音としての計算には使用されます）。
                  </p>
                </FormItem>
              )}
            />
          </div>
          {showRootWarning && (
            <p className="text-sm font-medium text-red-600">
              警告: 根音が設定されていません。解析には根音の指定が必要です。
            </p>
          )}
          <Button type="submit" className="h-11 w-full text-base" disabled={!isFormValid}>
            設定した音を追加
          </Button>
        </form>
      </Form>
    </SettingsSection>
  );
}
