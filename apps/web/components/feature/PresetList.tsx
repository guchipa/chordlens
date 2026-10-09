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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PitchPreset } from "@chordlens/core/types";
import { deletePreset, getRelativeTimeString } from "@/lib/presets";
import { Trash2, Music } from "lucide-react";

interface PresetListProps {
  presets: PitchPreset[];
  onLoad: (preset: PitchPreset) => void;
  onDelete: () => void;
}

export const PresetList: React.FC<PresetListProps> = ({
  presets,
  onLoad,
  onDelete,
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [loadConfirmPreset, setLoadConfirmPreset] =
    useState<PitchPreset | null>(null);

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmId) {
      const success = deletePreset(deleteConfirmId);
      if (success) {
        onDelete();
      }
      setDeleteConfirmId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
  };

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
              onClick={() => handleDeleteClick(preset.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>

      {/* 削除確認ダイアログ - AlertDialogを使用 */}
      <AlertDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && handleDeleteCancel()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>プリセット削除</AlertDialogTitle>
            <AlertDialogDescription>
              このプリセットを削除しますか？この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11" onClick={handleDeleteCancel}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction className="h-11" variant="destructive" onClick={handleDeleteConfirm}>
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
