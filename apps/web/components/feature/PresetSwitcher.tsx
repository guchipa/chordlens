"use client";

import { useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { BookmarkPlus } from "lucide-react";
import type { Pitch } from "@chordlens/core/types";
import { pitchListEquals } from "@chordlens/core/presets/pitchListEquals";
import { cn } from "@/lib/utils";
import {
  loadPresetWithUndoAtom,
  pitchListAtom,
  presetsAtom,
  refreshPresetsAtom,
} from "@/lib/store";

interface PresetSwitcherProps {
  /** プリセットが 1 件もないときのヒントから設定ドロワーを開く */
  onOpenSettings: () => void;
  className?: string;
}

/** 有効な構成音を並べる。根音は太字 */
function ChordNotes({ pitchList }: { pitchList: Pitch[] }) {
  const notes = pitchList.filter((p) => p.enabled);
  return (
    <span className="block max-w-full truncate text-xs opacity-75">
      {notes.map((p, i) => (
        <span key={`${p.pitchName}${p.octaveNum}-${i}`} className={cn(p.isRoot && "font-bold")}>
          {i > 0 && " "}
          {p.pitchName}
          {p.octaveNum}
        </span>
      ))}
    </span>
  );
}

/**
 * メイン画面のプリセット切替チップ列。
 * 演奏中に素早く和音を替えられるよう、タップで確認なしに即読み込む。
 * 現在の構成音リストと一致するプリセットを強調する。
 */
export function PresetSwitcher({ onOpenSettings, className }: PresetSwitcherProps) {
  const presets = useAtomValue(presetsAtom);
  const pitchList = useAtomValue(pitchListAtom);
  const refreshPresets = useSetAtom(refreshPresetsAtom);
  const loadPreset = useSetAtom(loadPresetWithUndoAtom);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    refreshPresets();
  }, [refreshPresets]);

  const activeId = presets.find((p) => pitchListEquals(p.pitchList, pitchList))?.id;

  // 選択中のチップが画面外なら見える位置までスクロールする
  useEffect(() => {
    activeRef.current?.scrollIntoView?.({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
  }, [activeId]);

  if (presets.length === 0) {
    return (
      <button
        type="button"
        onClick={onOpenSettings}
        className={cn(
          "text-muted-foreground flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 text-sm hover:bg-gray-100",
          className,
        )}
      >
        <BookmarkPlus className="size-4 shrink-0" />
        プリセットを保存すると、ここで切り替えられます
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="プリセットで和音を切り替え"
      data-slot="preset-switcher"
      // 横スクロールは行の中だけで完結させる。右端は次のチップがあることを示すフェード
      className={cn(
        "-mx-3 flex snap-x snap-proximity gap-2 overflow-x-auto overscroll-x-contain scroll-px-3 px-3 pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "[mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)]",
        className,
      )}
    >
      {presets.map((preset) => {
        const active = preset.id === activeId;
        return (
          <button
            key={preset.id}
            ref={active ? activeRef : undefined}
            type="button"
            aria-pressed={active}
            onClick={() => loadPreset(preset)}
            className={cn(
              "flex h-11 min-w-20 max-w-48 shrink-0 snap-start flex-col items-start justify-center rounded-lg border px-3 text-left leading-tight transition-colors",
              active
                ? "border-gray-800 bg-gray-800 text-white"
                : "bg-white text-gray-800 hover:bg-gray-100 active:bg-gray-200",
            )}
          >
            <span className="block max-w-full truncate text-sm font-semibold">
              {preset.name}
            </span>
            <ChordNotes pitchList={preset.pitchList} />
          </button>
        );
      })}
    </div>
  );
}
