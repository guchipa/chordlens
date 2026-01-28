"use client";

import { useAtom } from "jotai";
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
import { feedbackTypeAtom } from "@/lib/store";

export function FeedbackTypeSelector() {
  const [feedbackType, setFeedbackType] = useAtom(feedbackTypeAtom);

  return (
    <Card>
      <CardHeader>
        <CardTitle>フィードバック形式</CardTitle>
        <CardDescription>
          {FEEDBACK_TYPE_DESCRIPTIONS[feedbackType]}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor="feedback-type" className="sr-only">
          フィードバック形式
        </Label>
        <Select
          value={feedbackType}
          onValueChange={(value) => setFeedbackType(value as FeedbackType)}
        >
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
}
