/**
 * cliArgs - 評価 CLI 共通の引数ヘルパー
 *
 * 値を取る引数 (--sample-rate など) は、欠落・非数値・範囲外をその場で
 * 弾く。検証しないと NaN が ffmpeg 呼び出しや解析パラメータまで伝播し、
 * 「なぜか結果が出ない」という分かりにくい失敗になる。
 */

/** 使い方を示して終了する */
export function failArg(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

export interface NumberArgOptions {
  /** 整数のみ許可する */
  integer?: boolean;
  /** この値より大きいことを要求する (既定: 0) */
  min?: number;
}

/**
 * 数値オプションの値を読む。
 * parseInt/parseFloat と違い "48000abc" のような部分一致は受け付けない
 */
export function requireNumberArg(
  raw: string | undefined,
  flag: string,
  options: NumberArgOptions = {}
): number {
  const { integer = false, min = 0 } = options;
  const value = raw === undefined || raw.trim() === "" ? NaN : Number(raw);
  if (!Number.isFinite(value)) {
    failArg(`${flag} には数値を指定すること (受け取った値: ${raw ?? "なし"})`);
  }
  if (integer && !Number.isInteger(value)) {
    failArg(`${flag} には整数を指定すること (受け取った値: ${raw})`);
  }
  if (value <= min) {
    failArg(`${flag} には ${min} より大きい値を指定すること (受け取った値: ${raw})`);
  }
  return value;
}

/** 値を取る文字列オプションを読む (値の欠落を弾く) */
export function requireStringArg(
  raw: string | undefined,
  flag: string
): string {
  if (raw === undefined || raw.trim() === "") {
    failArg(`${flag} には値を指定すること`);
  }
  return raw;
}

/**
 * カンマ区切りの ID リストを読み、既知の ID だけを許可する。
 * 未知の ID を黙って捨てると、タイプミス (--conditions no-subtraction) で
 * 空のレポートを出したまま正常終了してしまい気付けない
 */
export function requireIdListArg(
  raw: string | undefined,
  flag: string,
  allowed: readonly string[]
): string[] {
  const ids = requireStringArg(raw, flag)
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id !== "");
  if (ids.length === 0) {
    failArg(`${flag} には 1 つ以上の ID を指定すること`);
  }
  const unknown = ids.filter((id) => !allowed.includes(id));
  if (unknown.length > 0) {
    failArg(
      `${flag} に未知の ID を指定した: ${unknown.join(", ")}\n` +
        `  指定できる ID: ${allowed.join(", ")}`
    );
  }
  return ids;
}
