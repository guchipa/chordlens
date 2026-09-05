import { useLayoutEffect, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IonToast } from "@ionic/react";
import { useExperimentSession } from "@/lib/hooks/experiments/useExperimentSession";
import {
  CONDITIONS,
  type Condition,
} from "@/lib/experiments/constants";
import {
  ensureAnonymousAuth,
  isFirebaseConfigured,
} from "@/lib/firebase/client";
import { createOrGetPair } from "@/lib/firebase/session";

interface Props {
  children: React.ReactNode;
}

export function ExperimentSessionProvider({ children }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session, initialize, reset } = useExperimentSession();
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const cond = searchParams.get("cond");
  const pairId = searchParams.get("pairId");

  // セッション初期化を useLayoutEffect で実施（レンダリング前に同期実行）
  useLayoutEffect(() => {
    console.log("[ExperimentSessionProvider] useLayoutEffect triggered", {
      cond,
      pairId,
      sessionExists: !!session,
      isCondValid: cond ? CONDITIONS.includes(cond as Condition) : false,
    });

    if (!cond || !pairId) {
      console.warn("[ExperimentSessionProvider] Missing params, redirecting to /invalid", {
        cond,
        pairId,
      });
      navigate("/experiments/invalid/", { replace: true });
      return;
    }
    if (!CONDITIONS.includes(cond as Condition)) {
      console.warn("[ExperimentSessionProvider] Invalid condition", {
        cond,
        validConditions: CONDITIONS,
      });
      navigate("/experiments/invalid/", { replace: true });
      return;
    }
    // 既存セッションが別 pairId / cond だったらリセットする
    if (
      session &&
      (session.pairId !== pairId || session.condition !== cond)
    ) {
      console.log("[ExperimentSessionProvider] Session mismatch, resetting", {
        existingPairId: session.pairId,
        newPairId: pairId,
        existingCond: session.condition,
        newCond: cond,
      });
      reset();
    }
    console.log("[ExperimentSessionProvider] Initializing session", {
      pairId,
      cond,
    });
    initialize(pairId, cond as Condition);
  }, [cond, pairId, navigate, session, initialize, reset]);

  useEffect(() => {
    if (!cond || !pairId) return;
    if (!isFirebaseConfigured()) {
      setAuthError(
        "Firebase 設定が見つかりません (.env.local の VITE_FIREBASE_* を確認してください)。"
      );
      return;
    }
    let cancelled = false;
    ensureAnonymousAuth()
      .then(async () => {
        await createOrGetPair(pairId, cond as Condition);
        if (!cancelled) setAuthReady(true);
      })
      .catch((err) => {
        console.error("[ExperimentSessionProvider] auth/init failed:", err);
        if (!cancelled) {
          setAuthError(
            err instanceof Error ? err.message : "Firebase 接続に失敗しました"
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cond, pairId]);

  if (!cond || !pairId) {
    return null;
  }

  return (
    <>
      <IonToast
        isOpen={!!authError}
        position="top"
        color="warning"
        message={`⚠ ${authError ?? ""} ローカルでの動作確認のみ可能です。`}
      />
      <IonToast
        isOpen={!authReady && !authError}
        position="top"
        color="tertiary"
        message="実験サーバーに接続中…"
      />
      {children}
    </>
  );
}
