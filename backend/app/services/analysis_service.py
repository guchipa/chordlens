import numpy as np
import base64
import io
import soundfile as sf  # 音声データをデコードするために必要
import matplotlib  # matplotlib.use を設定するために必要
from typing import List

# matplotlib のバックエンドを設定（サーバーサイドでは描画しないため）
# これは plt.specgram の実行に必要な場合がある
matplotlib.use("Agg")

# analysis_module から関数をインポート
# あなたの just_analyze.py や calc_justfreq.py に応じてインポートパスを調整
from app.analysis_module import just_analyze  # just_analyze.py 内の関数を想定
from app.analysis_module import calc_justfreq  # calc_justfreq.py 内の関数を想定


async def perform_audio_analysis(
    audio_base64: str, sample_rate: int, pitch_list: List[str]
):
    # Base64 データをバイナリ音声データにデコード
    audio_bytes = base64.b64decode(audio_base64)
    audio_io = io.BytesIO(audio_bytes)

    # soundfile を使って音声データを読み込む
    # librosa.load を使う場合は、librosa.load(audio_io, sr=sample_rate)
    # y: 音声データ (numpy.ndarray), sr: サンプリングレート
    y, sr_loaded = sf.read(audio_io, dtype="float32")

    if sr_loaded != sample_rate:
        # サンプリングレートが一致しない場合の処理（リサンプリングなど）
        # 簡単のため、ここではそのまま進めるかエラーとする
        print(
            f"Warning: Loaded sample rate {sr_loaded} differs from requested {sample_rate}"
        )

    # ここであなたの just_analyze.py の analyze 関数を呼び出す
    # analyze(y, sr, pitch_list) のシグネチャに合わせて調整
    # 例: eval を直接呼び出す場合は、y からスペクトログラムを生成する処理をここで行う

    # 既存の analyze 関数を呼び出す場合
    # just_analyze.py の analyze 関数が y, sr, pitch_list を引数に取る場合
    evaluation_result = just_analyze.analyze(y=y, sr=sample_rate, pitch_list=pitch_list)

    # eval 関数が eval(spec=spec, freq=freq, t=t, pitch_name_list=pitch_list) の場合
    # plt.specgram を呼び出して spec, freq, t を生成する必要がある
    # import matplotlib.pyplot as plt
    # spec, freq, t, im = plt.specgram(y, Fs=sample_rate, NFFT=65536)
    # evaluation_result = just_analyze.eval(spec=spec, freq=freq, t=t, pitch_name_list=pitch_list)

    return evaluation_result
