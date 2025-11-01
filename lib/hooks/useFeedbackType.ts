import { useState, useEffect } from "react";
import { FEEDBACK_TYPES, type FeedbackType } from "@/lib/constants";

export function useFeedbackType() {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("meter");

  const handleFeedbackTypeChange = (type: FeedbackType) => {
    setFeedbackType(type);
    localStorage.setItem("feedbackType", type);
  };

  useEffect(() => {
    const savedFeedbackType = localStorage.getItem("feedbackType");
    if (
      savedFeedbackType &&
      FEEDBACK_TYPES.includes(savedFeedbackType as FeedbackType)
    ) {
      setFeedbackType(savedFeedbackType as FeedbackType);
    }
  }, []);

  return {
    feedbackType,
    handleFeedbackTypeChange,
  };
}
