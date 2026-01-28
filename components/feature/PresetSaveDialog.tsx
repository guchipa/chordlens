"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { savePreset, isDuplicatePresetName } from "@/lib/presets";
import type { Pitch } from "@/lib/types";

interface PresetSaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pitchList: Pitch[];
  onSaveSuccess: () => void;
}

export const PresetSaveDialog: React.FC<PresetSaveDialogProps> = ({
  open,
  onOpenChange,
  pitchList,
  onSaveSuccess,
}) => {
  const [presetName, setPresetName] = useState("");
  const [error, setError] = useState("");
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  const handleSave = () => {
    setError("");

    // バリデーション
    if (!presetName.trim()) {
      setError("プリセット名を入力してください");
      return;
    }

    if (presetName.length > 30) {
      setError("プリセット名は30文字以内で入力してください");
      return;
    }

    // 重複チェック
    if (isDuplicatePresetName(presetName) && !showOverwriteConfirm) {
      setShowOverwriteConfirm(true);
      return;
    }

    // 保存実行
    const result = savePreset(presetName, pitchList);

    if (result.success) {
      // 成功
      setPresetName("");
      setShowOverwriteConfirm(false);
      onOpenChange(false);
      onSaveSuccess();
    } else {
      // エラー
      setError(result.error);
      setShowOverwriteConfirm(false);
    }
  };

  const handleCancel = () => {
    setPresetName("");
    setError("");
    setShowOverwriteConfirm(false);
    onOpenChange(false);
  };

  const handleCancelOverwrite = () => {
    setShowOverwriteConfirm(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {!showOverwriteConfirm ? (
          <>
            <DialogHeader>
              <DialogTitle>プリセット保存</DialogTitle>
              <DialogDescription>
                現在の構成音リストをプリセットとして保存します。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="preset-name">プリセット名</Label>
                <Input
                  id="preset-name"
                  placeholder="例: Cメジャートライアド"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  maxLength={30}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSave();
                    }
                  }}
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
                <p className="text-sm text-muted-foreground">
                  {presetName.length} / 30 文字
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancel}>
                キャンセル
              </Button>
              <Button onClick={handleSave} disabled={pitchList.length === 0}>
                保存
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>上書き確認</DialogTitle>
              <DialogDescription>
                「{presetName}」は既に存在します。上書きしますか？
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelOverwrite}>
                キャンセル
              </Button>
              <Button onClick={handleSave}>上書き保存</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
