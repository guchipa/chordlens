import { z } from "zod";

export const FormSchema = z.object({
  pitchName: z.string({ required_error: "音名を選択してください" }),
  octaveNum: z.coerce.number({
    required_error: "オクターブ番号を選択してください",
  }), // string->number変換
  isRoot: z.boolean().optional(),
});

export type formType = z.infer<typeof FormSchema>;
