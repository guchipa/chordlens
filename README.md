# ChordLens Web

<p align="center">
  <a href="https://chordlens.vercel.app/" target="_blank">
    <img src="https://img.shields.io/badge/🎵_Live_Demo-試してみる-brightgreen?style=for-the-badge" alt="Live Demo">
  </a>
  <a href="https://github.com/guchipa/chordlens/actions">
    <img src="https://img.shields.io/github/actions/workflow/status/guchipa/chordlens/test.yml?style=for-the-badge&label=Tests" alt="Tests">
  </a>
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js 15">
  <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React 19">
</p>

![和音チューナー-1](https://github.com/user-attachments/assets/0cee1272-e894-4c44-939f-73d724940ecb)
![和音チューナー-2](https://github.com/user-attachments/assets/fe90613a-9d9c-420b-aaa3-67470fc0c82a)

## 📖 概要 (Introduction)

**ChordLens Web**は、マイクから入力された音声をリアルタイムで解析し、設定した和音の構成音が**純正律**からどれだけズレているかを視覚的に表示するWebアプリケーションです。

東京理科大学 創域理工学研究科 情報計算科学専攻 大村研究室での研究「和音演奏のための多重音チューニングシステム」で提案した手法を、Web Audio APIを用いて完全にブラウザ上で実装しました。サーバー不要のフロントエンドのみの構成により、高速で安全なリアルタイム音声処理を実現しています。

## ✨ 主な特徴 (Features)

* 🎤 **リアルタイム音声解析:** Web Audio APIによる低レイテンシーなフィードバック（100ms以下）
* 🎵 **複数音の同時評価:** 和音（コード）に含まれる複数の音を同時に評価可能
* ⚙️ **柔軟な設定:** 音名・オクターブの自由な追加/削除、FFTサイズ・平滑化定数などの詳細設定
* 🎯 **純正律ベース:** 平均律ではなく、美しく響き合う純正律を基準に評価
* 🤖 **根音自動推定:** 入力された構成音から和音の根音を自動推定する機能
* 📊 **視覚的フィードバック:** 直感的なメーターUIとセント表示による正確なチューニング支援
* 🚀 **完全フロントエンド:** サーバー不要、ブラウザ内で完結する音声処理
* 💾 **設定の永続化:** localStorageによる設定値の自動保存
* 📱 **レスポンシブ対応:** スマートフォン・タブレット・デスクトップに最適化

## �️ 技術スタック (Tech Stack)

| カテゴリ             | 技術                                                                                                                                                                                                                             |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**        | ![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=next.js&logoColor=white)                                                                                                                      |
| **Language**         | ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)                                                                                                                |
| **UI Library**       | ![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)                                                                                                                           |
| **Styling**          | ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)                                                                                                        |
| **UI Components**    | ![shadcn/ui](https://img.shields.io/badge/shadcn/ui-000000?style=for-the-badge&logo=shadcnui&logoColor=white) ![Radix UI](https://img.shields.io/badge/Radix_UI-161618?style=for-the-badge&logo=radixui&logoColor=white)         |
| **Form Management**  | ![React Hook Form](https://img.shields.io/badge/React_Hook_Form-EC5990?style=for-the-badge&logo=reacthookform&logoColor=white) ![Zod](https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white)      |
| **Audio Processing** | ![Web Audio API](https://img.shields.io/badge/Web_Audio_API-E34F26?style=for-the-badge&logo=html5&logoColor=white)                                                                                                               |
| **Testing**          | ![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white) ![Testing Library](https://img.shields.io/badge/Testing_Library-E33332?style=for-the-badge&logo=testing-library&logoColor=white) |
| **Deployment**       | [![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)                                                                                                     |
| **Package Manager**  | ![npm](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)                                                                                                                                     |

## 📂 プロジェクト構造 (Project Structure)

```
ChordLens-web/
├── app/                      # Next.js App Router
│   ├── page.tsx             # メインページ（音声解析統合）
│   ├── layout.tsx           # 全体レイアウト
│   └── globals.css          # グローバルスタイル
├── components/              # Reactコンポーネント
│   ├── feature/             # 機能コンポーネント
│   │   ├── PitchSettingForm.tsx    # 構成音入力フォーム
│   │   ├── PitchList.tsx           # 構成音リスト表示
│   │   ├── AnalysisControl.tsx     # 解析開始/停止制御
│   │   ├── AnalysisResult.tsx      # 解析結果表示
│   │   └── SettingsForm.tsx        # 設定パネル
│   ├── TunerMeter.tsx       # メーター表示（視覚フィードバック）
│   ├── CentDisplay.tsx      # セント表示
│   ├── AppFooter.tsx        # フッター
│   └── ui/                  # shadcn/ui プリミティブ
├── lib/                     # ユーティリティ・ロジック
│   ├── audio_analysis/      # 音声解析ロジック
│   │   ├── calcJustFreq.ts         # 純正律周波数計算
│   │   ├── justAnalyze.ts          # スペクトル解析・評価
│   │   └── rootEstimation.ts       # 根音推定アルゴリズム
│   ├── constants.ts         # 定数定義
│   ├── schema.ts            # Zodスキーマ定義
│   └── utils.ts             # ユーティリティ関数
├── __tests__/               # Jestテスト
├── public/                  # 静的ファイル
└── .github/                 # GitHub設定・CI/CD
```

## 🚀 セットアップ (Getting Started)

### 必要な環境

- **Node.js**: v18以上
- **npm**: v9以上

### インストールと起動

```bash
# リポジトリのクローン
git clone https://github.com/guchipa/chordlens.git
cd chordlens

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

### その他のコマンド

```bash
npm run build       # プロダクションビルド
npm run start       # プロダクションサーバー起動
npm run lint        # ESLint実行
npm test            # Jestテスト実行
npm run test:watch  # Jestウォッチモード
```

## 🎵 使い方 (Usage)

1. **構成音の追加**
   - 音名とオクターブ番号を選択
   - 根音にする場合は「根音」チェックボックスをオン
   - 「追加」ボタンで構成音リストに追加

2. **根音の推定**（オプション）
   - 構成音リストから「根音を推定」ボタンをクリック
   - システムが自動的に最適な根音を推定

3. **解析開始**
   - 「解析開始」ボタンをクリック
   - マイクアクセスを許可
   - 楽器を演奏すると、リアルタイムでメーターが反応

4. **チューニング**
   - メーターの針が中央に来るように楽器を調整
   - 「平均律からの差」でセント単位の正確な値を確認

5. **設定の調整**（オプション）
   - 「設定」パネルから詳細パラメータを調整可能
   - FFTサイズ、平滑化定数、評価範囲などをカスタマイズ

## 🧪 テスト (Testing)

このプロジェクトはJestとReact Testing Libraryを使用してテストされています。

```bash
# すべてのテストを実行
npm test

# ウォッチモードで実行
npm run test:watch

# カバレッジレポート生成
npm test -- --coverage
```

**テストカバレッジ:**
- ✅ UIコンポーネント（スナップショットテスト）
- ✅ フォームバリデーション
- ✅ ユーザーインタラクション
- ✅ 音声解析ロジック（モック使用）

## 📚 ドキュメント (Documentation)

- **[仕様書](./仕様書.md)**: システム全体の詳細仕様
- **[Copilot Instructions](./.github/copilot-instructions.md)**: AI開発支援用プロジェクトガイド
- **[技術ブログ記事](#)**: 開発の裏側と技術的詳細（準備中）

## 🌐 対応ブラウザ (Browser Support)

| ブラウザ      | バージョン | 対応状況 |
| :------------ | :--------- | :------- |
| Chrome        | 最新版     | ✅        |
| Edge          | 最新版     | ✅        |
| Safari        | 最新版     | ✅        |
| Firefox       | 最新版     | ✅        |
| iOS Safari    | 最新版     | ✅        |
| Chrome Mobile | 最新版     | ✅        |

**注意事項:**
- HTTPS接続またはlocalhostでの使用が必須（getUserMedia APIの制約）
- Web Audio APIをサポートするブラウザが必要

## 📄 ライセンス (License)

このプロジェクトは[MITライセンス](LICENSE)の下で公開されています。

## 🙏 謝辞 (Acknowledgments)

- 東京理科大学 大村研究室での研究成果を基に開発
- shadcn/uiコミュニティによる素晴らしいUIコンポーネント
- Web Audio APIコミュニティによる技術情報

## 🗺️ 今後の展望 (Roadmap)

- [ ] 構成音リストのメモリー機能（プリセット保存）
- [ ] PWA化（オフライン動作対応）
- [ ] 多言語対応（英語UI）
- [ ] 音声録音・再生機能
- [ ] スペクトラムビジュアライザー
- [ ] ダークモード対応
- [ ] コードプリセット機能（Major 7th, Minor 7thなど）
- [ ] チューニング履歴の記録と分析

