"use client";

import { Suspense } from "react";
import { ExperimentSessionProvider } from "@/components/feature/experiments/ExperimentSessionProvider";

export default function ExperimentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <ExperimentSessionProvider>
        <div className="container mx-auto max-w-3xl p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </ExperimentSessionProvider>
    </Suspense>
  );
}
