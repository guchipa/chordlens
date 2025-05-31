from tkinter import ttk
import sounddevice as sd
import numpy as np
import json
import logging

import input_pitchname
import just_analyze
from meter import create_meter_window
import sol_path


# グローバル変数の定義
gauge_windows = []
update_gauges = []
stream = None
_pitch_list = []
print_message = None

# ロガーの取得
logger = logging.getLogger(__name__)

logging.basicConfig(
    filename=sol_path.resolve("logs/app.log"),
    level=logging.INFO,
    format="%(asctime)s, %(message)s",
    encoding="utf-8",
)


# 音声入力ストリームの起動
def start_audio_stream():
    # サンプリングレートとバッファサイズを読み込む
    with open(sol_path.resolve("config/constants.json"), "r", encoding="utf-8") as f:
        constants = json.load(f)
        SAMPLE_RATE = int(constants["sample_rate"])
        STREAM_BUFFER_SIZE = int(constants["stream_buffer_size"])

    global stream
    stream = None

    print("Audio stream started")
    print_message("リアルタイム解析を開始しました。")
    logger.info("Audio stream started")
    logger.info(f"name_list: {_pitch_list}")

    # 音声入力のコールバック関数
    def audio_callback(indata, frames, time, status):
        # エラーが発生した場合はエラーメッセージを表示
        if status:
            print(f"Error: {status}", flush=True)
            print_message(f"Error: {status}")
            stop_audio_stream()

        samples = np.squeeze(indata)

        # 音声入力を解析
        try:
            evallist = just_analyze.analyze(samples, SAMPLE_RATE, _pitch_list)
            logger.info(f"Evaluated deviation: {evallist}")

            # 各メーターを更新
            for i, deviation in enumerate(evallist):
                if i < len(update_gauges):
                    update_gauges[i](deviation)

        except Exception as e:
            print(f"Error analyzing pitch: {e}")
            print_message(f"Error : {e}")
            logger.error(f"Error analyzing pitch: {e}")
            stop_audio_stream()

    # 音声入力ストリームの作成
    stream = sd.InputStream(
        callback=audio_callback,
        channels=1,
        samplerate=SAMPLE_RATE,
        blocksize=STREAM_BUFFER_SIZE,
    )
    stream.start()


# 音声入力ストリームの停止
def stop_audio_stream():
    global stream
    if stream is not None:
        stream.stop()
        stream.close()
        print("Audio stream stopped.")
        print_message("リアルタイム解析を停止しました。")


# リアルタイム入力タブのビルド
def build(parent, pitch_list, update_message_window):
    global _pitch_list
    _pitch_list = pitch_list

    global print_message
    print_message = update_message_window

    # 演奏音入力部分の作成
    input_pitchname.build_with_title(parent, pitch_list, update_message_window)

    # メーターウィンドウを作成するボタン
    meter_button = ttk.Button(
        parent, text="メーターを表示", command=lambda: start_meter(pitch_list)
    )
    meter_button.pack(pady=10)

    # リアルタイム音声解析を開始するボタン
    start_button = ttk.Button(
        parent,
        text="リアルタイム解析開始",
        command=start_audio_stream,
    )
    start_button.pack(pady=10)

    # リアルタイム音声解析を停止するボタン
    stop_button = ttk.Button(parent, text="解析停止", command=stop_audio_stream)
    stop_button.pack(pady=10)


# メーターを起動
def start_meter(pitch_list):
    global gauge_windows, update_gauges
    gauge_windows.clear()
    update_gauges.clear()

    # ピッチリストの数だけメーターウィンドウを作成
    for pitch_name in pitch_list:
        update_gauge = create_meter_window(pitch_name)
        update_gauges.append(update_gauge)
