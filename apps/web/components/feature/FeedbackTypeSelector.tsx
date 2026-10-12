"use client";

import { useAtom } from "jotai";
import { Label } from "@/components/ui/label";
import {
  SettingsSection,
  SELECT_TOUCH,
} from "@/components/layout/SettingsSection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CIRCLE_LAYOUTS,
  CIRCLE_LAYOUT_LABELS,
  FEEDBACK_TYPES,
  FEEDBACK_TYPE_LABELS,
  FEEDBACK_TYPE_DESCRIPTIONS,
} from "@chordlens/core/constants";
import type { CircleLayout, FeedbackType } from "@chordlens/core/constants";
import { circleLayoutAtom, feedbackTypeAtom } from "@/lib/store";

export function FeedbackTypeSelector() {
  const [feedbackType, setFeedbackType] = useAtom(feedbackTypeAtom);
  const [circleLayout, setCircleLayout] = useAtom(circleLayoutAtom);

  return (
    <SettingsSection title="フィードバック形式">
      <div className="space-y-2">
        <Label htmlFor="feedback-type" className="sr-only">
          フィードバック形式
        </Label>
        <Select
          value={feedbackType}
          onValueChange={(value) => setFeedbackType(value as FeedbackType)}
        >
          <SelectTrigger id="feedback-type" className={SELECT_TOUCH}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FEEDBACK_TYPES.map((type) => (
              <SelectItem key={type} value={type} className="min-h-11 text-base">
                {FEEDBACK_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          {FEEDBACK_TYPE_DESCRIPTIONS[feedbackType]}
        </p>
        <div className="space-y-1 pt-2">
          <Label htmlFor="circle-layout" className="text-sm">
            サークルの並び順
          </Label>
          <Select
            value={circleLayout}
            onValueChange={(value) => setCircleLayout(value as CircleLayout)}
          >
            <SelectTrigger id="circle-layout" className={SELECT_TOUCH}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CIRCLE_LAYOUTS.map((layout) => (
                <SelectItem key={layout} value={layout} className="min-h-11 text-base">
                  {CIRCLE_LAYOUT_LABELS[layout]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            5度圏では長三和音・短三和音がそれぞれ一定の形になり、和音が変わっても形で見分けられます
          </p>
        </div>
      </div>
    </SettingsSection>
  );
}
