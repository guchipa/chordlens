---
name: add-platform-adapter
description: プラットフォーム依存機能(ブラウザ API・ネイティブ API)を追加・変更するときの手順。コアの非依存性を守りながら adapter インターフェースで抽象化する。モバイル移行対応の設計判断に使う。
---

# プラットフォーム adapter の追加手順

ChordLens は Web → モバイル移行を見据え、プラットフォーム依存コードを
adapter インターフェースの背後に隔離している(`docs/MOBILE_MIGRATION.md` 参照)。
ブラウザ API を使う新機能を実装するときは、以下の手順に従う。

## 判断フロー

1. **そのロジックは純粋 TypeScript で書けるか?**
   → Yes: `packages/core/src/` に置く(adapter 不要)
2. **ブラウザ API が必要だが、モバイルでも同種の機能が必要になるか?**
   → Yes: adapter インターフェースを定義する(以下の手順)
   → No(Web 限定機能: PWA 等): `apps/web/lib/` に直接書いてよい

## 手順

1. **インターフェース定義** — `packages/core/src/adapters/<name>.ts` に
   プラットフォーム非依存のインターフェースを定義する。
   - DOM 型(`Blob`, `MediaStream` 等)をシグネチャに含めない
   - 既存例: `storage.ts` (`KeyValueStorage`)、`audio.ts` (`SpectrumSource`)
   - JSDoc に「Web 実装」「React Native 実装(候補)」のマッピングを書く
2. **コアロジック** — インターフェースを引数で受け取る形(依存注入)で
   `packages/core/src/` に実装する。既存例: `presets/presetStore.ts` の
   `createPresetStore({ storage })`
3. **Web 実装** — `apps/web/lib/` にブラウザ API による実装を書き、注入する。
   既存例: `apps/web/lib/presets.ts` の localStorage アダプタ
4. **エクスポート** — `packages/core/src/index.ts` にインターフェースを追加
5. **ドキュメント** — `docs/MOBILE_MIGRATION.md` の
   「3. プラットフォーム依存ポイントの全リスト」の表に行を追加
6. **検証** — `pnpm typecheck` が通ること(core に DOM 依存が混入していれば失敗する)

## テスト

- コアロジック: `packages/core/__tests__/` にインメモリ実装
  (例: `createMemoryStorage()`)を注入してテスト
- Web バインディング: `apps/web/__tests__/` で jsdom + モックを使ってテスト
