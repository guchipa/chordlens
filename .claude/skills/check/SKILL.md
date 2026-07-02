---
name: check
description: ChordLens の品質ゲートを一括実行する(テスト・型チェック・lint・ビルド)。コミット前・PR 作成前・リファクタ後の検証に使う。
---

# 品質ゲート一括チェック

以下をリポジトリルートで順番に実行し、すべて成功することを確認する。

```bash
pnpm test        # 全 workspace のテスト (core: Node / web: jsdom)
pnpm typecheck   # 型チェック (packages/core の DOM 非依存もここで検証される)
pnpm lint        # ESLint (warning は許容、error は不可)
pnpm build       # 本番ビルド
```

## 判断基準

- **テスト数の目安**: core 93 + web 71 = 164 テスト(2026-07 時点)。大きく減っていたら
  テストが実行されていない可能性を疑う。
- **core の typecheck 失敗で `Cannot find name 'window'` 等が出た場合**:
  ブラウザ API がコアに混入している。修正方法は「コードを web に移す」か
  「`packages/core/src/adapters/` にインターフェースを定義して注入する」のどちらか。
  tsconfig に DOM lib を足して解決してはならない(設計上の意図的な制約)。
- **lint の警告**: 既存の警告 (react-refresh / exhaustive-deps 等) は 13 件程度が既知。
  自分の変更で新しい警告を増やさない。

## 失敗時の切り分け

- web テストで `Cannot find package 'xxx'` → pnpm の厳密な node_modules が原因。
  root package.json の `pnpm.packageExtensions` で peer 依存を補う(過去例: `@hookform/resolvers` に zod)。
- スナップショット差分 → 意図した UI 変更なら `pnpm --filter @chordlens/web test -- -u` で更新。
