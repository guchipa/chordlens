"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const ALWAYS_SHOW_EXPERIMENT =
  process.env.NEXT_PUBLIC_SHOW_EXPERIMENT === "true";

export function MainHeader() {
  const router = useRouter();
  const [canAccessExperiment, setCanAccessExperiment] = useState(
    ALWAYS_SHOW_EXPERIMENT
  );

  useEffect(() => {
    if (ALWAYS_SHOW_EXPERIMENT) return;

    const readFlag = () => {
      try {
        const stored = localStorage.getItem("enableExperiment");
        setCanAccessExperiment(stored === "true");
      } catch (error) {
        console.warn(
          "[MainHeader] Failed to read enableExperiment flag",
          error
        );
        setCanAccessExperiment(false);
      }
    };

    readFlag();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "enableExperiment") {
        setCanAccessExperiment(event.newValue === "true");
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <div className="text-center">
      <h1 className="text-3xl font-extrabold text-gray-800 sm:text-4xl">
        和音チューナー
      </h1>
      <h2 className="mt-2 max-w-2xl text-base text-gray-600 sm:text-lg">
        マイクから音声を入力し、設定した和音の純正律からの音程のズレをリアルタイムで解析します。
      </h2>
      {canAccessExperiment && (
        <Button
          variant="link"
          className="mt-4 text-sm"
          onClick={() => router.push("/experiment")}
        >
          実験モードへ移動
        </Button>
      )}
    </div>
  );
}
