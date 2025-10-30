import { z } from "zod";
import { PITCH_NAME_LIST } from "@/lib/constants";

export const FormSchema = z.object({
  pitchName: z
    .string()
    .refine((val) => PITCH_NAME_LIST.includes(val), {
      message: "音名を選択してください",
    }),
  octaveNum: z.coerce.number({
    required_error: "オクターブ番号を選択してください",
  }),
  isRoot: z.boolean().optional(),
});

export type formType = z.infer<typeof FormSchema>;

// プリセット関連の型定義
export interface PitchPreset {
  id: string; // UUID v4
  name: string; // ユーザー指定の名前（1～30文字）
  pitchList: formType[]; // 構成音リスト
  createdAt: number; // Unix timestamp (ミリ秒)
}

export interface PresetsData {
  version: number; // スキーマバージョン（現在: 1）
  presets: PitchPreset[]; // プリセット配列
}
