/**
 * Ionic React のテストヘルパー。
 *
 * @ionic/react のコンポーネントラッパー (node_modules/@ionic/react/dist/index.js の
 * createComponent / syncEvent) は `onIonChange` / `onIonInput` などの React props を
 * 対応する DOM カスタムイベント名 (`ionChange` / `ionInput` など) の
 * `addEventListener` として登録する。jsdom は Ionic の Web Components 本体
 * (Stencil ランタイム) をロードしないため、実際の UI 操作 (クリックでのトグル等) では
 * このイベントは発火しない。そのため、対象の DOM 要素に対して
 * `new CustomEvent(name, { detail, bubbles: true })` を直接 dispatch して
 * ユーザー操作をシミュレートする。
 */

function dispatchIonEvent(
  el: Element,
  eventName: string,
  detail: Record<string, unknown>,
) {
  el.dispatchEvent(
    new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true,
    }),
  );
}

/**
 * IonSelect / IonToggle / IonCheckbox / IonRange などの `onIonChange` を発火する。
 * detail は各コンポーネントに応じて `{ value }` や `{ checked }` を渡す。
 */
export function fireIonChange(el: Element, detail: Record<string, unknown>) {
  dispatchIonEvent(el, "ionChange", detail);
}

/**
 * IonInput / IonTextarea / IonSearchbar などの `onIonInput` を発火する。
 */
export function fireIonInput(el: Element, value: string) {
  dispatchIonEvent(el, "ionInput", { value });
}

/**
 * IonInput 等の `onIonBlur` を発火する。
 */
export function fireIonBlur(el: Element, detail: Record<string, unknown> = {}) {
  dispatchIonEvent(el, "ionBlur", detail);
}

/**
 * IonInput 等の `onIonFocus` を発火する。
 */
export function fireIonFocus(el: Element, detail: Record<string, unknown> = {}) {
  dispatchIonEvent(el, "ionFocus", detail);
}
