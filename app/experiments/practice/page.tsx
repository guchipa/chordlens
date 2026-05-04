"use client";

import { useEffect } from "react";
import { useExperimentSession } from "@/lib/hooks/experiments/useExperimentSession";
import { PracticeWithTuner } from "@/components/feature/experiments/PracticeWithTuner";
import { PracticeWithoutTuner } from "@/components/feature/experiments/PracticeWithoutTuner";

export default function ExperimentPracticePage() {
  const { session, setPhase } = useExperimentSession();
  useEffect(() => {
    setPhase("practice");
  }, [setPhase]);

  if (!session) return null;

  return (
    <main className="space-y-4">
      {session.condition === "with" ? (
        <PracticeWithTuner />
      ) : (
        <PracticeWithoutTuner />
      )}
    </main>
  );
}
