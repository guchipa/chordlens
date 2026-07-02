"use client";

import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const FIVE_LABELS: Record<number, string> = {
  1: "1: まったくそう思わない",
  2: "2: あまりそう思わない",
  3: "3: どちらともいえない",
  4: "4: ややそう思う",
  5: "5: とてもそう思う",
};

export function FivePointField({
  name,
  label,
}: {
  name: string;
  label: string;
}) {
  const form = useFormContext();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select
            onValueChange={(v) => field.onChange(Number(v))}
            value={field.value ? String(field.value) : ""}
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
  );
}

export function FreeTextField({
  name,
  label,
}: {
  name: string;
  label: string;
}) {
  const form = useFormContext();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="text"
              value={(field.value as string | undefined) ?? ""}
              onChange={(e) => field.onChange(e.target.value)}
              placeholder="任意"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
