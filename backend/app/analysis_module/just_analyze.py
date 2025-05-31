# import librosa
import matplotlib.pyplot as plt
import numpy as np

# import json

import calc_justfreq

# import sol_path


# 演奏された音の評価
def eval(spec, freq, t, pitch_name_list, EVAL_RANGE=50):
    # FFT に対する評価
    # spec: 各周波数に対するスペクトル（強さ）
    # freq: 周波数ビン（sr = 22050, NFFT = 65536 で 0.336Hz 刻み  sr / NFFT で計算できる）
    # pitch_name_list: 演奏される音の音名と根音の情報 (pitch, is_root) のタプル

    # 前処理
    # 複数セグメントある場合に足し合わせる
    if len(t) > 1:
        spec = np.sum(spec, axis=1)

    # calc_justfreq より音名から 周波数 を取得
    est_freqs = calc_justfreq.get_freqs(pitch_name_list)

    if est_freqs == "":
        return

    # 各演奏ピッチに対して評価
    # eval_list: 演奏音が評価範囲のどこに位置するかを格納
    eval_list = []
    for est_f in est_freqs:
        target_freq = 1e10
        target_idx = -1

        # 周波数ビンの中から最も近いものを探索
        for idx, f in enumerate(freq):
            if abs(est_f - f) < abs(est_f - target_freq):
                target_freq = f
                target_idx = idx
            else:
                break

        # 近傍の周波数のスペクトルを評価
        # ±50cents に最も近いスペクトルを取得
        min_freq = est_f * (2 ** (-EVAL_RANGE / 1200))
        max_freq = est_f * (2 ** (EVAL_RANGE / 1200))

        eval_range_min = max(
            0, target_idx - int((target_freq - min_freq) / (freq[1] - freq[0]))
        )
        eval_range_max = min(
            len(spec),
            target_idx + int((max_freq - target_freq) / (freq[1] - freq[0])) + 1,
        )

        center = (eval_range_max - eval_range_min) // 2
        eval_spec = spec[eval_range_min:eval_range_max]
        print(np.squeeze(eval_spec))

        # np.argmax で最も強いスペクトルをもつもののindex を取得
        spec_max = np.argmax(eval_spec)

        # spec_max が閾値以下の場合は None を返す
        if eval_spec[spec_max] < 1e-7:
            eval_list.append(None)
        else:
            # spec_max が center と等しい場合は 0 を返す
            if spec_max == center:
                eval_list.append(0)
            else:
                # (-1, 1) に丸めてリストに追加
                eval_list.append(round((spec_max - center) / center, 2))

    return eval_list


# ファイル入力での解析
# def analyze(file_path, pitch_list, show=False):
#     # 定数の読み込み
#     with open(sol_path.resolve("config/constants.json"), "r", encoding="utf-8") as f:
#         constants = json.load(f)
#         sr = constants["sample_rate"]

#     y, sr = librosa.load(file_path, sr=sr)
#     spec, freq, t, im = plt.specgram(y, Fs=sr, NFFT=65536)

#     print(eval(spec=spec, freq=freq, t=t, pitch_name_list=pitch_list))

#     if show is True:
#         plt.show()
#         print(f"spec = {spec}\nfreq = {freq}\nt = {t}\nim = {im}")


# 音声入力を受け取って解析
def analyze(y, sr, pitch_list, show=False):
    spec, freq, t, im = plt.specgram(y, Fs=sr, NFFT=65536)

    return eval(spec=spec, freq=freq, t=t, pitch_name_list=pitch_list)

    if show is True:
        plt.show()
        print(f"spec = {spec}\nfreq = {freq}\nt = {t}\nim = {im}")
