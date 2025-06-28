"use client";

import { Button } from "@/components/ui/button";

interface AnalysisControlProps {
  isProcessing: boolean;
  startProcessing: () => void;
  stopProcessing: () => void;
  isPitchListEmpty: boolean;
}

export const AnalysisControl: React.FC<AnalysisControlProps> = ({ isProcessing, startProcessing, stopProcessing, isPitchListEmpty }) => {
  return (
    <div className="mt-6 flex w-full max-w-lg justify-center">
      <Button
        onClick={isProcessing ? stopProcessing : startProcessing}
        variant={isProcessing ? "destructive" : "default"}
        size="lg"
        className="w-full sm:w-auto sm:min-w-[240px]"
        disabled={isPitchListEmpty && !isProcessing}
      >
        {isProcessing ? "解析停止" : "解析開始"}
      </Button>
    </div>
  );
};
