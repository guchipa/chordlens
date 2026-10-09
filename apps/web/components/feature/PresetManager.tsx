"use client";

import { useAtom, useSetAtom } from "jotai";
import { useState, useEffect } from "react";
import { SettingsSection } from "@/components/layout/SettingsSection";
import { Button } from "@/components/ui/button";
import { PresetSaveDialog } from "@/components/feature/PresetSaveDialog";
import { PresetList } from "@/components/feature/PresetList";
import type { PitchPreset } from "@chordlens/core/types";
import { getPresets, isLocalStorageAvailable } from "@/lib/presets";
import { Save } from "lucide-react";
import { pitchListAtom, loadPresetAtom } from "@/lib/store";

export function PresetManager() {
  const [pitchList] = useAtom(pitchListAtom);
  const loadPreset = useSetAtom(loadPresetAtom);
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
    loadPreset(preset.pitchList);
  };

  const handleDeletePreset = () => {
    loadPresets();
  };

  if (!localStorageAvailable) {
    return (
      <SettingsSection
        title="プリセット機能"
        description="localStorageが利用できないため、プリセット機能は使用できません。"
      >
        <p className="text-muted-foreground text-sm">
          この環境では保存・読み込みができません。
        </p>
      </SettingsSection>
    );
  }

  return (
    <>
      <SettingsSection
        title="プリセット"
        description="構成音リストを保存・読み込みできます"
      >
        <div className="space-y-3">
          <Button
            onClick={handleSaveClick}
            disabled={pitchList.length === 0}
            variant="outline"
            className="h-11 w-full bg-background"
          >
            <Save className="mr-2 h-4 w-4" />
            現在の構成音を保存
          </Button>
          <PresetList
            presets={presets}
            onLoad={handleLoadPreset}
            onDelete={handleDeletePreset}
          />
        </div>
      </SettingsSection>

      <PresetSaveDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        pitchList={pitchList}
        onSaveSuccess={handleSaveSuccess}
      />
    </>
  );
}
