import { UseFormReturn } from "react-hook-form";
import { PitchSettingForm } from "@/components/feature/PitchSettingForm";
import { PitchList } from "@/components/feature/PitchList";
import { SettingsForm } from "@/components/feature/SettingsForm";
import { PresetManager } from "@/components/feature/PresetManager";
import { FeedbackTypeSelector } from "@/components/feature/FeedbackTypeSelector";
import type { Pitch, FeedbackType } from "@/lib/types";

interface SettingsDrawerProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  form: UseFormReturn<Pitch>;
  onSubmit: (data: Pitch) => void;
  currentPitchList: Pitch[];
  setCurrentPitchList: React.Dispatch<React.SetStateAction<Pitch[]>>;
  removePitch: (index: number) => void;
  clearPitchList: () => void;
  handleLoadPreset: (pitchList: Pitch[]) => void;
  feedbackType: FeedbackType;
  handleFeedbackTypeChange: (type: FeedbackType) => void;
  setEvalRangeCents: (value: number) => void;
  setA4Freq: (value: number) => void;
  setEvalThreshold: (value: number) => void;
  setFftSize: (value: number) => void;
  setSmoothingTimeConstant: (value: number) => void;
  onExperimentModeChange?: (enabled: boolean) => void;
}

export function SettingsDrawer({
  isOpen,
  onOpen,
  onClose,
  form,
  onSubmit,
  currentPitchList,
  setCurrentPitchList,
  removePitch,
  clearPitchList,
  handleLoadPreset,
  feedbackType,
  handleFeedbackTypeChange,
  setEvalRangeCents,
  setA4Freq,
  setEvalThreshold,
  setFftSize,
  setSmoothingTimeConstant,
  onExperimentModeChange,
}: SettingsDrawerProps) {
  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={onOpen}
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-white/50 backdrop-blur-sm hover:bg-gray-200"
        aria-label="設定を開く"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Settings Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-full max-w-sm bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-xl font-bold">設定</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-200"
            aria-label="設定を閉じる"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto h-[calc(100vh-65px)] space-y-8">
          <PitchSettingForm
            form={form}
            onSubmit={onSubmit}
            currentPitchList={currentPitchList}
          />
          <PitchList
            currentPitchList={currentPitchList}
            removePitch={removePitch}
            clearPitchList={clearPitchList}
            setCurrentPitchList={setCurrentPitchList}
          />
          <PresetManager
            pitchList={currentPitchList}
            onLoadPreset={handleLoadPreset}
          />
          <FeedbackTypeSelector
            value={feedbackType}
            onChange={handleFeedbackTypeChange}
          />
          <SettingsForm
            onEvalRangeChange={setEvalRangeCents}
            onA4FreqChange={setA4Freq}
            onEvalThresholdChange={setEvalThreshold}
            onFftSizeChange={setFftSize}
            onSmoothingTimeConstantChange={setSmoothingTimeConstant}
            onExperimentModeChange={onExperimentModeChange}
          />
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose}></div>
      )}
    </>
  );
}
