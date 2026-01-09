"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle>フィードバック形式</CardTitle>
        <CardDescription>{FEEDBACK_TYPE_DESCRIPTIONS[value]}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor="feedback-type" className="sr-only">
          フィードバック形式
        </Label>
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
      </CardContent>
    </Card>
  );
};
