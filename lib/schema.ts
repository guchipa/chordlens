import { z } from "zod";
import { PITCH_NAME_LIST } from "@/lib/constants";

export const FormSchema = z.object({
  pitchName: z.string().refine(
    (val) => PITCH_NAME_LIST.includes(val),
    { message: "音名を選択してください" }
  ),
  octaveNum: z.coerce.number({
    required_error: "オクターブ番号を選択してください",
  }),
  isRoot: z.boolean().optional(),
});

export type formType = z.infer<typeof FormSchema>;
