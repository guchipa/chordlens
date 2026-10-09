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
  FEEDBACK_TYPES,
  FEEDBACK_TYPE_LABELS,
  FEEDBACK_TYPE_DESCRIPTIONS,
} from "@chordlens/core/constants";
import type { FeedbackType } from "@chordlens/core/constants";
import { feedbackTypeAtom } from "@/lib/store";

export function FeedbackTypeSelector() {
  const [feedbackType, setFeedbackType] = useAtom(feedbackTypeAtom);

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
      </div>
    </SettingsSection>
  );
}
