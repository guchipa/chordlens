"use client";

import { ChordFollowToggle } from "@/components/feature/ChordFollowToggle";
import { PitchSettingForm } from "@/components/feature/PitchSettingForm";
import { PitchList } from "@/components/feature/PitchList";
import { SettingsForm } from "@/components/feature/SettingsForm";
import { PresetManager } from "@/components/feature/PresetManager";
import { FeedbackTypeSelector } from "@/components/feature/FeedbackTypeSelector";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
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
          className="size-11 shrink-0"
          aria-label="設定を開く"
        >
          <Menu className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full max-w-sm overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">設定</SheetTitle>
          <SheetDescription>
            設定した和音の純正律からのズレをリアルタイムで解析します。
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-8 py-4">
          <ChordFollowToggle />
          <PitchSettingForm />
          <PitchList />
          <PresetManager />
          <FeedbackTypeSelector />
          <SettingsForm />
        </div>
        <AppFooter />
      </SheetContent>
    </Sheet>
  );
}
