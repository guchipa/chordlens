"use client";

import React from "react";
import { Label } from "@/components/ui/label";
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
} from "@/lib/constants";
import type { FeedbackType } from "@/lib/constants";

interface FeedbackTypeSelectorProps {
  value: FeedbackType;
  onChange: (value: FeedbackType) => void;
}

export const FeedbackTypeSelector: React.FC<FeedbackTypeSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="feedback-type">フィードバック形式</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="feedback-type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FEEDBACK_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {FEEDBACK_TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <p className="text-xs text-muted-foreground">
        {FEEDBACK_TYPE_DESCRIPTIONS[value]}
      </p>
    </div>
  );
};
