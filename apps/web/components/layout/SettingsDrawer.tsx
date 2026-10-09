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
import { useBackButtonClose } from "@/lib/hooks/useBackButtonClose";
import { useSwipeDrawer } from "@/lib/hooks/useSwipeDrawer";
import { canUseEdgeSwipe } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import { createPortal } from "react-dom";

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

  // 戻る操作 (ブラウザ/Android の戻る) でドロワーを閉じる
  useBackButtonClose(isOpen, onClose);
  const edgeOpenEnabled = canUseEdgeSwipe();
  const swipe = useSwipeDrawer({
    isOpen,
    onClose,
    onOpen,
    edgeOpenEnabled,
  });

  return (
    <>
      {edgeOpenEnabled &&
        // ヘッダー (sticky + backdrop-blur) の外に出すため body へポータルする。
        // アプリバーと下部バーは避け、ドロワー表示中は操作を受けない
        createPortal(
          <div
            aria-hidden
            data-slot="edge-swipe-zone"
            {...swipe.edgeZoneProps}
            className={cn(
              "fixed left-0 z-30 w-[22px] top-[calc(3.5rem+env(safe-area-inset-top))] bottom-[calc(8.5rem+env(safe-area-inset-bottom))]",
              isOpen && "pointer-events-none",
            )}
          />,
          document.body,
        )}
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
      <SheetContent
        side="left"
        ref={swipe.ref}
        {...swipe.contentProps}
        className={cn(
          "w-full gap-0 overflow-hidden p-0 sm:max-w-sm",
          swipe.holdAnimation && "animate-none!",
        )}
        overlayClassName={swipe.holdAnimation ? "animate-none!" : undefined}
      >
        <SheetHeader className="bg-background border-b px-4 pt-[calc(env(safe-area-inset-top)+0.25rem)] pr-16 pb-1">
          <SheetTitle className="text-lg leading-11">設定</SheetTitle>
          <SheetDescription className="sr-only">
            設定した和音の純正律からのズレをリアルタイムで解析します。
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-5 overflow-y-auto px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div className="space-y-3">
            <PitchList />
            <PitchSettingForm />
          </div>
          <PresetManager />
          <ChordFollowToggle />
          <FeedbackTypeSelector />
          <SettingsForm />
          <AppFooter />
        </div>
      </SheetContent>
    </Sheet>
    </>
  );
}
