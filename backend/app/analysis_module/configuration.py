import tkinter as tk
from tkinter import ttk
import sounddevice as sd
import json
import yaml

import make_freq_list
import sol_path

print_message = None


def validate_numeric_input(P):
    if P.isdigit() or P == "":
        return True
    else:
        return False


def fetch_input_device():
    devices = sd.query_devices()
    device_names = [device["name"] for device in devices]
    return device_names


def load_settings():
    with open(sol_path.resolve("config/settings.yaml"), "r", encoding="utf-8") as f:
        settings = yaml.load(f, Loader=yaml.FullLoader)
    return settings


def load_constants():
    with open(sol_path.resolve("config/constants.json"), "r", encoding="utf-8") as f:
        constants = json.load(f)
    return constants


def save_settings(take_log, a4_freq, sample_rate, buffer_size, input_device):
    # 入力デバイスの設定を保存
    # 現在の設定を取得
    settings = load_settings()
    constants = load_constants()

    # 設定を保存
    with open(sol_path.resolve("config/settings.yaml"), "w", encoding="utf-8") as f:
        settings["take_log"] = take_log
        settings["input_device"] = input_device
        yaml.dump(settings, f, indent=4, allow_unicode=True)

    with open(sol_path.resolve("config/constants.json"), "w", encoding="utf-8") as f:
        constants["a4_freq"] = int(a4_freq)
        constants["sample_rate"] = int(sample_rate)
        constants["stream_buffer_size"] = int(buffer_size)
        json.dump(constants, f, indent=4, ensure_ascii=False)

    # a4_freq をもとに freq_list を再生成
    make_freq_list.make_freq_list()

    # 入力デバイスのインデックスを取得
    idx = 0
    for device in fetch_input_device():
        if input_device == device:
            sd.default.device = [idx, sd.default.device[1]]
            break
        else:
            idx += 1

    print("Settings saved")
    print_message("設定を保存しました。")


# 設定タブの実装
def build(parent, update_message_window):
    global print_message
    print_message = update_message_window

    # 設定を読み込む
    settings = load_settings()
    constants = load_constants()

    # ログファイルを残すか
    frame_log_toggle = ttk.Frame(parent)
    frame_log_toggle.pack(side=tk.TOP, padx=30, pady=10)

    label_log = tk.Label(frame_log_toggle, text="ログを保存")
    label_log.pack(side=tk.LEFT, fill=tk.X)

    take_log = tk.BooleanVar()
    take_log.set(settings["take_log"])

    checkbox_log = tk.Checkbutton(frame_log_toggle, text="", variable=take_log)
    checkbox_log.pack(side=tk.RIGHT, fill=tk.X)

    # A4 の周波数定義
    frame_a4_freq = ttk.Frame(parent)
    frame_a4_freq.pack(side=tk.TOP, padx=30, pady=10)

    label_a4_freq = tk.Label(frame_a4_freq, text="A4の周波数 (Hz)")
    label_a4_freq.pack(side=tk.LEFT, fill=tk.X)

    a4_freq = tk.StringVar()
    a4_freq.set(constants["a4_freq"])

    validate_cmd = parent.register(validate_numeric_input)
    entry_a4_freq = tk.Entry(
        frame_a4_freq,
        textvariable=a4_freq,
        validate="key",
        validatecommand=(validate_cmd, "%P"),
    )
    entry_a4_freq.pack(side=tk.RIGHT, fill=tk.X)

    # サンプリング周波数の設定
    frame_sample_rate = ttk.Frame(parent)
    frame_sample_rate.pack(side=tk.TOP, padx=30, pady=10)

    label_sample_rate = tk.Label(frame_sample_rate, text="サンプリング周波数 (Hz)")
    label_sample_rate.pack(side=tk.LEFT, fill=tk.X)

    sample_rate = tk.StringVar()
    sample_rate.set(constants["sample_rate"])

    validate_cmd = parent.register(validate_numeric_input)
    entry_sample_rate = tk.Entry(
        frame_sample_rate,
        textvariable=sample_rate,
        validate="key",
        validatecommand=(validate_cmd, "%P"),
    )
    entry_sample_rate.pack(side=tk.RIGHT, fill=tk.X)

    # リアルタイム入力のバッファサイズ設定
    frame_buffer_size = ttk.Frame(parent)
    frame_buffer_size.pack(side=tk.TOP, padx=30, pady=10)

    label_buffer_size = tk.Label(frame_buffer_size, text="FFTデータサイズ")
    label_buffer_size.pack(side=tk.LEFT, fill=tk.X)

    buffer_size = tk.StringVar()
    buffer_size.set(constants["stream_buffer_size"])

    validate_cmd = parent.register(validate_numeric_input)
    entry_buffer_size = tk.Entry(
        frame_buffer_size,
        textvariable=buffer_size,
        validate="key",
        validatecommand=(validate_cmd, "%P"),
    )
    entry_buffer_size.pack(side=tk.RIGHT, fill=tk.X)

    # リアルタイム入力に使用する入力デバイスの選択
    frame_input_device = ttk.Frame(parent)
    frame_input_device.pack(side=tk.TOP, padx=30, pady=10)

    label_input_device = tk.Label(frame_input_device, text="入力デバイス")
    label_input_device.pack(side=tk.LEFT, fill=tk.X)

    input_device_list = fetch_input_device()  # Fetch the list of input devices
    input_device_var = (
        tk.StringVar()
    )  # Create a StringVar object# Set the default value
    input_device = ttk.Combobox(
        frame_input_device,
        values=input_device_list,
        textvariable=input_device_var,
        state="readonly",
        width=50,  # Set the width to 50
    )
    input_device.set(settings["input_device"])
    input_device.pack(side=tk.RIGHT, fill=tk.X)

    # 設定を保存するボタン
    save_button = ttk.Button(
        parent,
        text="設定を保存",
        command=lambda: save_settings(
            take_log.get(),
            a4_freq.get(),
            sample_rate.get(),
            buffer_size.get(),
            input_device.get(),
        ),
    )
    save_button.pack(pady=10)
