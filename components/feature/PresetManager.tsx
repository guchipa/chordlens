"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PresetSaveDialog } from "@/components/feature/PresetSaveDialog";
import { PresetList } from "@/components/feature/PresetList";
import { PitchPreset, formType } from "@/lib/schema";
import { getPresets, isLocalStorageAvailable } from "@/lib/presets";
import { Save } from "lucide-react";

interface PresetManagerProps {
  pitchList: formType[];
  onLoadPreset: (pitchList: formType[]) => void;
}

export const PresetManager: React.FC<PresetManagerProps> = ({
  pitchList,
  onLoadPreset,
}) => {
  const [presets, setPresets] = useState<PitchPreset[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [localStorageAvailable, setLocalStorageAvailable] = useState(true);

  // プリセット一覧を読み込み
  const loadPresets = () => {
    setPresets(getPresets());
  };

  useEffect(() => {
    // localStorageの可用性チェック
    setLocalStorageAvailable(isLocalStorageAvailable());

    // 初回読み込み
    loadPresets();
  }, []);

  const handleSaveClick = () => {
    if (pitchList.length === 0) {
      return;
    }
    setSaveDialogOpen(true);
  };

  const handleSaveSuccess = () => {
    loadPresets();
  };

  const handleLoadPreset = (preset: PitchPreset) => {
    onLoadPreset(preset.pitchList);
  };

  const handleDeletePreset = () => {
    loadPresets();
  };

  if (!localStorageAvailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>プリセット機能</CardTitle>
          <CardDescription>
            localStorageが利用できないため、プリセット機能は使用できません。
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>プリセット</CardTitle>
              <CardDescription>
                構成音リストを保存・読み込みできます
              </CardDescription>
            </div>
            <Button
              onClick={handleSaveClick}
              disabled={pitchList.length === 0}
              size="sm"
            >
              <Save className="mr-2 h-4 w-4" />
              保存
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <PresetList
            presets={presets}
            onLoad={handleLoadPreset}
            onDelete={handleDeletePreset}
          />
        </CardContent>
      </Card>

      <PresetSaveDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        pitchList={pitchList}
        onSaveSuccess={handleSaveSuccess}
      />
    </>
  );
};
