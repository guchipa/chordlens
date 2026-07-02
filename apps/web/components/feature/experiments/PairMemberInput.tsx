"use client";

import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  INSTRUMENT_KEYS,
  INSTRUMENT_LABELS,
} from "@/lib/experiments/instrumentChordMap";
import {
  JUST_INTONATION_FAMILIARITY_LABELS,
  type PreSurveyInput,
} from "@/lib/experiments/surveySchemas";

const FIVE_LABELS: Record<number, string> = {
  1: "1: まったくそう思わない",
  2: "2: あまりそう思わない",
  3: "3: どちらともいえない",
  4: "4: ややそう思う",
  5: "5: とてもそう思う",
};

interface Props {
  /** memberA / memberB */
  member: "memberA" | "memberB";
  title: string;
}

export function PairMemberInput({ member, title }: Props) {
  const form = useFormContext<PreSurveyInput>();

  return (
    <fieldset className="space-y-4 rounded-lg border p-4">
      <legend className="px-2 font-semibold">{title}</legend>

      <FormField
        control={form.control}
        name={`${member}.instrument` as const}
        render={({ field }) => (
          <FormItem>
            <FormLabel>担当楽器</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={(field.value as string) ?? ""}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="楽器を選択" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {INSTRUMENT_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {INSTRUMENT_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`${member}.experienceYears` as const}
        render={({ field }) => (
          <FormItem>
            <FormLabel>演奏歴 (年)</FormLabel>
            <FormControl>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={80}
                value={(field.value as number | undefined) ?? ""}
                onChange={(e) => field.onChange(e.target.value)}
              />
            </FormControl>
            <p className="text-xs text-muted-foreground">
              1 年未満の場合は実験対象外となります。
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`${member}.pitchMatchingSkill` as const}
        render={({ field }) => (
          <FormItem>
            <FormLabel>音程（ピッチ）を耳で合わせるのは得意だと思う</FormLabel>
            <Select
              onValueChange={(v) => field.onChange(Number(v))}
              value={field.value ? String(field.value) : undefined}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="5段階で選択" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {FIVE_LABELS[n]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`${member}.chordEvaluationSkill` as const}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              和音を聞いて「合っている / 濁っている」が分かる
            </FormLabel>
            <Select
              onValueChange={(v) => field.onChange(Number(v))}
              value={field.value ? String(field.value) : undefined}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="5段階で選択" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {FIVE_LABELS[n]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`${member}.justIntonationFamiliarity` as const}
        render={({ field }) => (
          <FormItem>
            <FormLabel>純正律という概念を知っている</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={(field.value as string) ?? ""}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="最も近いものを選択" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {(
                  Object.keys(
                    JUST_INTONATION_FAMILIARITY_LABELS
                  ) as (keyof typeof JUST_INTONATION_FAMILIARITY_LABELS)[]
                ).map((key) => (
                  <SelectItem key={key} value={key}>
                    {JUST_INTONATION_FAMILIARITY_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </fieldset>
  );
}
