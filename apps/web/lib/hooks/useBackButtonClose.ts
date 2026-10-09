import { useEffect, useRef } from "react";

const MARKER = "chordlensBackClose";

/**
 * オーバーレイ (ドロワー・ダイアログ) が開いている間、戻る操作 (ブラウザの戻る・
 * Android の戻るジェスチャ) で閉じられるようにする。
 *
 * - 開いた時に履歴エントリを 1 つ積む (react-router の idx/key は引き継ぐ)
 * - 戻る操作 (popstate) で onClose を呼ぶ。エントリは既に消費済みなので back() しない
 * - UI 操作 (ボタン・オーバーレイ・Esc・スワイプ) で閉じた場合は、積んだエントリを
 *   history.back() で取り除き、履歴を汚さない (popstate リスナーは先に外すためループしない)
 */
export function useBackButtonClose(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    let owned = true;
    window.history.pushState({ ...window.history.state, [MARKER]: true }, "");

    const onPopState = () => {
      // 戻る操作でエントリは消費された
      owned = false;
      onCloseRef.current();
    };
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
      // 自分が積んだエントリが現在位置のままなら取り除く
      if (owned && window.history.state?.[MARKER]) {
        window.history.back();
      }
    };
  }, [isOpen]);
}
