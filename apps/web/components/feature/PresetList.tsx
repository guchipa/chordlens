"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PitchPreset } from "@chordlens/core/types";
import { useSetAtom } from "jotai";
import { getRelativeTimeString } from "@/lib/presets";
import { deletePresetWithUndoAtom } from "@/lib/store";
import { Trash2, Music } from "lucide-react";

interface PresetListProps {
  presets: PitchPreset[];
  onLoad: (preset: PitchPreset) => void;
}

export const PresetList: React.FC<PresetListProps> = ({
  presets,
  onLoad,
}) => {
  const [loadConfirmPreset, setLoadConfirmPreset] =
    useState<PitchPreset | null>(null);
  // 削除は確認なしで実行し、トーストの「元に戻す」で取り消せる
  const deletePreset = useSetAtom(deletePresetWithUndoAtom);

  const handleLoadClick = (preset: PitchPreset) => {
    setLoadConfirmPreset(preset);
  };

  const handleLoadConfirm = () => {
    if (loadConfirmPreset) {
      onLoad(loadConfirmPreset);
      setLoadConfirmPreset(null);
    }
  };

  const handleLoadCancel = () => {
    setLoadConfirmPreset(null);
  };

  if (presets.length === 0) {
    return (
      <div className="text-center py-3 text-muted-foreground">
        <Music className="mx-auto h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">プリセットがありません</p>
        <p className="text-xs mt-1">
          構成音を登録して「現在の構成音を保存」を押してください
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="bg-background divide-y rounded-lg border">
        {presets.map((preset) => (
          <li key={preset.id} className="flex items-center gap-1 py-1 pr-1 pl-3">
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-semibold">{preset.name}</h4>
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <span>{preset.pitchList.length}音</span>
                <span>•</span>
                <span>{getRelativeTimeString(preset.createdAt)}</span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => handleLoadClick(preset)}
              className="h-11 px-4"
            >
              読み込み
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label={`${preset.name} を削除`}
              onClick={() => deletePreset(preset)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>

      {/* 読み込み確認ダイアログ - 通常のDialogを維持 */}
      <Dialog
        open={loadConfirmPreset !== null}
        onOpenChange={(open) => !open && handleLoadCancel()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>プリセット読み込み</DialogTitle>
            <DialogDescription>
              「{loadConfirmPreset?.name}」を読み込みます。
              <br />
              現在の構成音リストは上書きされます。よろしいですか？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="h-11" onClick={handleLoadCancel}>
              キャンセル
            </Button>
            <Button className="h-11" onClick={handleLoadConfirm}>読み込み</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
