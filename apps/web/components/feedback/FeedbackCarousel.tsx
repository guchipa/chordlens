"use client";

import React, { useState } from "react";
import { useAtom } from "jotai";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  FEEDBACK_TYPES,
  FEEDBACK_TYPE_LABELS,
  type FeedbackType,
} from "@chordlens/core/constants";
import { stepItem } from "@chordlens/core/gestures/swipeIntent";
import { Button } from "@/components/ui/button";
import { useSwipeNav } from "@/lib/hooks/useSwipeNav";
import { feedbackTypeAtom } from "@/lib/store";
import { cn } from "@/lib/utils";
import { FeedbackSlide, type FeedbackSlideProps } from "./FeedbackSlide";

/** 端の形式で更に引っ張ったときの追従率 (ゴムのような抵抗) */
const EDGE_RESISTANCE = 0.25;

export type FeedbackCarouselProps = Omit<FeedbackSlideProps, "feedbackType"> & {
  /** カルーセルの上 (形式ナビの上) に固定表示する内容。和音名ヘッダ用 */
  header?: React.ReactNode;
};

/**
 * メイン画面のフィードバック表示。形式をカルーセルで並べ、横スワイプで
 * 前後の形式へ移る (タブは置かない)。カードは指に追従し、距離またはフリングで
 * 確定すると次の形式が左右からスライドインする。
 *
 * スワイプできない環境 (マウス・キーボード・支援技術) 向けに、前後ボタンと
 * 現在位置のドットを形式名と一緒に出す。形式は feedbackTypeAtom
 * (設定ドロワーのセレクタと共有) に保存する。
 */
export const FeedbackCarousel: React.FC<FeedbackCarouselProps> = ({
  header,
  ...slideProps
}) => {
  const { transitioning = false } = slideProps;
  const [feedbackType, setFeedbackType] = useAtom(feedbackTypeAtom);
  const index = Math.max(0, FEEDBACK_TYPES.indexOf(feedbackType));
  const current: FeedbackType = FEEDBACK_TYPES[index];
  const prevType = stepItem(FEEDBACK_TYPES, current, -1);
  const nextType = stepItem(FEEDBACK_TYPES, current, 1);

  // 切替方向 (どちらからスライドインするか)。形式が変わった描画中に算出する
  const [shownType, setShownType] = useState(current);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  if (shownType !== current) {
    setShownType(current);
    setDirection(index >= FEEDBACK_TYPES.indexOf(shownType) ? "next" : "prev");
  }

  const [dragX, setDragX] = useState<number | null>(null);

  const go = (step: 1 | -1) => {
    const next = step === 1 ? nextType : prevType;
    if (next) setFeedbackType(next);
  };
  const swipe = useSwipeNav({
    onNext: () => go(1),
    onPrev: () => go(-1),
    onDrag: (dx) => {
      if (dx === null) {
        setDragX(null);
        return;
      }
      const blocked = (dx > 0 && !prevType) || (dx < 0 && !nextType);
      setDragX(blocked ? dx * EDGE_RESISTANCE : dx);
    },
  });

  const label = FEEDBACK_TYPE_LABELS[current];

  return (
    <section
      data-slot="feedback-swipe-area"
      aria-roledescription="carousel"
      aria-label="フィードバック表示"
      className="mx-auto flex w-full max-w-md flex-col gap-2"
      {...swipe}
    >
      {header}

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label={prevType ? `前の形式: ${FEEDBACK_TYPE_LABELS[prevType]}` : "前の形式"}
          disabled={!prevType}
          onClick={() => go(-1)}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <div className="flex flex-col items-center gap-1">
          <span aria-live="polite" className="text-sm font-medium text-gray-700">
            {label}
          </span>
          <div aria-hidden="true" className="flex gap-1.5">
            {FEEDBACK_TYPES.map((type) => (
              <span
                key={type}
                data-testid="carousel-dot"
                data-active={type === current}
                className={cn(
                  "size-1.5 rounded-full transition-colors",
                  type === current ? "bg-gray-700" : "bg-gray-300",
                )}
              />
            ))}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label={nextType ? `次の形式: ${FEEDBACK_TYPE_LABELS[nextType]}` : "次の形式"}
          disabled={!nextType}
          onClick={() => go(1)}
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>

      {/* 引っ張ったカードが画面外にはみ出しても横スクロールを生まないよう切り取る */}
      <div className="-mx-1 overflow-x-clip px-1 pb-1">
        <div
          className={cn(
            "will-change-transform",
            dragX === null && "transition-transform duration-200 motion-reduce:transition-none",
          )}
          style={{ transform: dragX === null ? undefined : `translateX(${dragX}px)` }}
        >
          <div
            key={current}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} / ${FEEDBACK_TYPES.length}: ${label}`}
            className={cn(
              "relative animate-in fade-in duration-200 motion-reduce:animate-none",
              direction === "next" ? "slide-in-from-right-6" : "slide-in-from-left-6",
            )}
          >
            {/* 切替中は旧和音基準の偏差なので、灰色に落として誤った赤表示を見せない */}
            <div
              data-testid="feedback-slide-body"
              data-transitioning={transitioning}
              className={cn(
                "transition-[opacity,filter] duration-150",
                transitioning && "opacity-40 grayscale",
              )}
            >
              <FeedbackSlide feedbackType={current} {...slideProps} />
            </div>
            {transitioning && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <span className="rounded-full bg-gray-900/80 px-4 py-1.5 text-sm font-medium text-white">
                  和音を判定中…
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
