"use client";

import { PitchSettingForm } from "@/components/feature/PitchSettingForm";
import { PitchList } from "@/components/feature/PitchList";
import { SettingsForm } from "@/components/feature/SettingsForm";
import { PresetManager } from "@/components/feature/PresetManager";
import { FeedbackTypeSelector } from "@/components/feature/FeedbackTypeSelector";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";

interface SettingsDrawerProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export function SettingsDrawer({
  isOpen,
  onOpen,
  onClose,
}: SettingsDrawerProps) {
  const handleOpenChange = (open: boolean) => {
    if (open) {
      onOpen();
    } else {
      onClose();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 bg-background/50 backdrop-blur-sm hover:bg-accent"
          aria-label="設定を開く"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full max-w-sm overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">設定</SheetTitle>
        </SheetHeader>
        <div className="space-y-8 py-4">
          <PitchSettingForm />
          <PitchList />
          <PresetManager />
          <FeedbackTypeSelector />
          <SettingsForm />
        </div>
      </SheetContent>
    </Sheet>
  );
}
