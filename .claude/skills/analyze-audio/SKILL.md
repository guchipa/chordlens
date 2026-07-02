---
name: analyze-audio
description: 録音済み音声ファイルをオフライン解析して純正律偏差の CSV を生成し、解析パイプライン(evaluateSpectrum)の挙動をデバッグ・検証する。音声解析アルゴリズムの変更後の回帰確認にも使う。
---

# 音声ファイルのオフライン解析

ブラウザの `AnalyserNode` と同等の処理(Blackman 窓・指数平滑化・dB 変換)を
エミュレートし、`packages/core/src/audio_analysis/justAnalyze.ts` の
`evaluateSpectrum()` をそのまま使ってフレーム解析する。
マイクなしで解析ロジックの挙動を再現できる。

## 使い方

構成音はファイル名の末尾ブロックで指定する(`-` 区切り、先頭がルート音)。

```bash
# 基本: 同ディレクトリに <入力名>.csv を出力
pnpm analyze:file -- path/to/song_C4-E4-G4.wav

# 出力先とサンプルレートの指定
pnpm analyze:file -- path/to/Cmaj7_C4-E4-G4-B4.m4a ./out.csv --sample-rate 44100
```

ffmpeg は `ffmpeg-static` から自動解決される(追加インストール不要)。
実装は `packages/core/scripts/analyze-audio-file.ts`。

## 出力 CSV の読み方

実験モードのログと同一形式。1 フレーム(60fps)× 構成音ごとに 1 行。

- `centDeviation` — 期待周波数(純正律)からのズレ(セント)。**主に見る列**
- `deviation` — centDeviation を ±evalRangeCents で正規化した -1〜1 の値
- `isDetected` — そのフレームで音を検出できたか
- 空欄 — ピーク未検出(閾値 `evalThreshold` 未満)

## デバッグでの典型的な使い方

1. アルゴリズム変更前に既知の音源で CSV を生成して退避
2. 変更後に同じ音源で再生成し、`centDeviation` の分布を比較
   (平均・標準偏差が大きく動いていたら回帰を疑う)
3. 定数(A4=442Hz、FFT サイズ等)は `packages/core/src/constants.ts` の
   デフォルトが使われることに注意
