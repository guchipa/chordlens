"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  title: string;
  description?: ReactNode;
  /** 見出し右側のアクション (保存ボタンなど) */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * 設定ドロワー用の軽量セクション。
 * 小さな見出しと、iOS のグループリスト風の淡い背景のかたまりで構成する。
 */
export function SettingsSection({
  title,
  description,
  action,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section className={cn("space-y-1.5", className)}>
      <div className="flex min-h-6 items-center justify-between gap-2 px-1">
        <h3 className="text-muted-foreground text-xs font-medium">{title}</h3>
        {action}
      </div>
      {description && (
        <p className="text-muted-foreground px-1 text-xs">{description}</p>
      )}
      <div className="bg-muted/50 rounded-xl p-3">{children}</div>
    </section>
  );
}

/** タップ行の共通クラス: 44px 以上、行全体を label でタップ可能にする */
export const TAP_ROW =
  "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg";

/** 入力欄の共通クラス: 44px 高 + 16px フォント (iOS のフォーカスズーム回避) */
export const FIELD_TOUCH = "h-11 text-base md:text-base";
export const SELECT_TOUCH = "h-11 w-full text-base data-[size=default]:h-11";
