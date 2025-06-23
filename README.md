# 和音チューナー Web版

<p>
  <a href="https://guchipa.github.io/chordlens/" target="_blank">
    <img src="https://img.shields.io/badge/Live_Demo-試してみる-brightgreen?style=for-the-badge&logo=githubpages" alt="Live Demo">
  </a>
</p>

(スクショを載せる)

## 概要 (Introduction)

**和音チューナー Web版**は、マイクから入力された音声をリアルタイムで解析し、設定した和音の構成音が**純正律**からどれだけズレているかを視覚的に表示するWebアプリケーションです。
東京理科大学 創域理工学研究科 情報計算科学専攻 大村研究室での研究 "和音演奏のための多重音チューニングシステム" のロジックを用いてWeb Audio APIで実装しました。

## ✨ 主な特徴 (Features)

* **リアルタイム音声解析:** Web Audio APIを利用し、遅延の少ないリアルタイムなフィードバックを実現。
* **複数音の同時評価:** 単音だけでなく、和音（コード）に含まれる複数の音を**同時に**評価できます。
* **自由な和音設定:** 評価したい音名とオクターブを自由に追加・削除し、独自の和音を構成できます。
* **純正律ベースのチューニング:** 平均律ではなく、美しく響き合う純正律の音程を基準にズレを算出します。
* **視覚的なチューニングメーター:** 直感的に音程のズレを把握できる、分かりやすいメーターUI。
* **モダンな技術スタック:** Next.jsとshadcn/uiによる、高速でメンテナンス性の高い開発。

## 🚀 技術スタック (Tech Stack)

このプロジェクトは、以下の技術を使用して構築されています。

| カテゴリ       | 技術                                                                                                                                                             |
| :------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework** | ![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)                                                          |
| **Language** | ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)                                                  |
| **UI** | ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white) ![shadcn/ui](https://img.shields.io/badge/shadcn/ui-000000?style=for-the-badge&logo=shadcn-ui&logoColor=white) |
| **Form** | ![React Hook Form](https://img.shields.io/badge/React_Hook_Form-EC5990?style=for-the-badge&logo=reacthookform&logoColor=white) ![Zod](https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white) |
| **Audio API** | ![Web Audio API](https://img.shields.io/badge/Web_Audio_API-E34F26?style=for-the-badge&logo=html5&logoColor=white)                                               |
| **Deployment** | ![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-222222?style=for-the-badge&logo=github&logoColor=white)                                                 |

## 🗺️ 今後の展望 (Future Plans)

* [ ] 検出された周波数から最も近い音名を自動でサジェストする機能
* [ ] 特定のコード（例: C Major 7th）をプリセットから選択できる機能
* [ ] 解析結果の録音・再生機能
* [ ] UI/UXのさらなる改善（ダークモード対応など）
