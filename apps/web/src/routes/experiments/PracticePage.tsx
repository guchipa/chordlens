import { useEffect } from "react";
import { useExperimentSession } from "@/lib/hooks/experiments/useExperimentSession";
import { PracticeWithTuner } from "@/components/feature/experiments/PracticeWithTuner";
import { PracticeWithoutTuner } from "@/components/feature/experiments/PracticeWithoutTuner";

import styles from "./PracticePage.module.css";

export function PracticePage() {
  const { session, setPhase } = useExperimentSession();
  useEffect(() => {
    setPhase("practice");
  }, [setPhase]);

  if (!session) return null;

  return (
    <main className={styles.page}>
      {session.condition === "with" ? (
        <PracticeWithTuner />
      ) : (
        <PracticeWithoutTuner />
      )}
    </main>
  );
}
