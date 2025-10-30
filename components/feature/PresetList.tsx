"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PitchPreset } from "@/lib/schema";
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
      <div className="text-center py-8 text-muted-foreground">
        <Music className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>プリセットがありません</p>
        <p className="text-sm mt-2">
          構成音を登録して「プリセット保存」ボタンをクリックしてください
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {presets.map((preset) => (
          <Card key={preset.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{preset.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>{preset.pitchList.length}音</span>
                    <span>•</span>
                    <span>{getRelativeTimeString(preset.createdAt)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadClick(preset)}
                  >
                    読み込み
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(preset.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && handleDeleteCancel()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>プリセット削除</DialogTitle>
            <DialogDescription>
              このプリセットを削除しますか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDeleteCancel}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 読み込み確認ダイアログ */}
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
            <Button variant="outline" onClick={handleLoadCancel}>
              キャンセル
            </Button>
            <Button onClick={handleLoadConfirm}>読み込み</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
