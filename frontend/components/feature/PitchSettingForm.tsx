"use client";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { UseFormReturn } from "react-hook-form";
import { PITCH_NAME_LIST, OCTAVE_NUM_LIST } from "@/lib/constants";
import { formType } from "@/lib/schema";
import { useMemo } from "react";

interface PitchSettingFormProps {
  form: UseFormReturn<formType>;
  onSubmit: (data: formType) => void;
  currentPitchList: formType[];
}

export const PitchSettingForm: React.FC<PitchSettingFormProps> = ({
  form,
  onSubmit,
  currentPitchList,
}) => {
  const isRootChecked = form.watch("isRoot");
  const hasRoot = useMemo(() => currentPitchList?.some((p) => p.isRoot) ?? false, [
    currentPitchList,
  ]);

  const showRootWarning = useMemo(() => {
    // 根音がなく、かつ isRoot がチェックされていなければ警告
    return !hasRoot && !isRootChecked;
  }, [hasRoot, isRootChecked]);

  return (
    <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-md">
      <h3 className="mb-4 text-xl font-semibold text-gray-700 sm:text-2xl">
        評価する音の追加
      </h3>
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
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="音名を選んでください" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PITCH_NAME_LIST.map((pitchName) => (
                      <SelectItem key={pitchName} value={pitchName}>
                        {pitchName}
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
                <Select
                  onValueChange={(val) => field.onChange(Number(val))}
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="オクターブ番号を選んでください" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {OCTAVE_NUM_LIST.map((octaveNum) => (
                      <SelectItem
                        key={octaveNum}
                        value={octaveNum.toString()}
                      >
                        {octaveNum}
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
                    className={`cursor-pointer ${
                      hasRoot ? "cursor-not-allowed text-gray-500" : ""
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
          {showRootWarning && (
            <p className="text-sm font-medium text-red-600">
              警告: 根音が設定されていません。解析には根音の指定が必要です。
            </p>
          )}
          <Button type="submit" className="w-full">
            設定した音を追加
          </Button>
        </form>
      </Form>
    </div>
  );
};