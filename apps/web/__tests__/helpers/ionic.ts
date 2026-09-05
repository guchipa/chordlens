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
 *
 * ## テスト上の制約 (jsdom + Ionic Web Components)
 *
 * - `disabled` の判定は `toHaveAttribute("disabled")` を使う
 *   (`toBeDisabled()` はカスタム要素に効かない)。
 * - Stencil のカスタム要素は非同期にアップグレードされる。`disabled` 等の属性反映を
 *   検証する前に `await customElements.whenDefined("ion-button")` (対象タグ名) を挟むこと。
 * - `IonModal` / `IonAlert` / `IonToast` 等のオーバーレイは `isOpen={true}` を jsdom で
 *   描画すると "framework delegate is missing" の未処理 Promise 拒否で vitest 全体が
 *   落ちる。オーバーレイの open/close 挙動は単体テストせず、既定で閉じた状態
 *   (`isOpen={false}` + 必要なら `keepContentsMounted`) の範囲で検証する。
 * - Ionic 要素を含む `toMatchSnapshot()` は禁止。pretty-format が Stencil 要素を
 *   シリアライズする際にメモリを食い尽くし OOM になる。
 * - `IonSelect` / `IonInput` の `label` prop はシャドウ DOM 内に描画され `getByText` では
 *   拾えない。可視ラベルを検証したいなら children で文言を渡すか、
 *   `await customElements.whenDefined(tag)` 後に `(el as unknown as { label: string }).label`
 *   を読む。
 * - `atomWithStorage` はテスト間で jsdom の `localStorage` を共有するため、
 *   `beforeEach(() => localStorage.clear())` を必ず入れる。
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
