import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { ExperimentSessionProvider } from "@/components/feature/experiments/ExperimentSessionProvider";

export function ExperimentsLayout() {
  return (
    <Suspense fallback={null}>
      <ExperimentSessionProvider>
        <div className="container mx-auto max-w-3xl p-4 sm:p-6 md:p-8">
          <Outlet />
        </div>
      </ExperimentSessionProvider>
    </Suspense>
  );
}
