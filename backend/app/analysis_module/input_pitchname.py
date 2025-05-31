import tkinter as tk
from tkinter import ttk

import json
import sol_path

print_message = None


# 演奏音リストに音を追加する
def addbutton_handler(pitch_list, pitch_name, is_root):
    pitch_list.append((pitch_name, is_root))
    print(f"add: {(pitch_name, is_root)}")
    print(f"now: {pitch_list}")
    print_message(f"構成音を追加しました: {pitch_name}" + ("(根音)" if is_root else ""))
    print_message(f"現在の構成音: {[pitch[0] for pitch in pitch_list]}")


# 演奏音リストをクリアする
def clearbutton_handler(pitch_list):
    pitch_list.clear()
    print("clear", f"now: {pitch_list}")
    print_message("構成音をクリアしました")


def build(parent, pitch_list, update_message_window):
    global print_message
    print_message = update_message_window

    # 定数の読み込み
    with open(sol_path.resolve("config/constants.json"), "r", encoding="utf-8") as f:
        constants = json.load(f)
        name_list = constants["name_list"]

    # 演奏音を選択するコンボボックス（プルダウンメニュー）を作成
    pitchname = tk.StringVar()
    combo_pitchname = ttk.Combobox(
        parent, values=name_list, textvariable=pitchname, state="readonly"
    )
    combo_pitchname.pack(side=tk.LEFT)

    # コンボボックスで選択した音が根音であるかを決めるチェックボックスを作成
    is_root = tk.BooleanVar()
    is_root.set(False)
    check_isroot = tk.Checkbutton(parent, text="root", variable=is_root)
    check_isroot.pack(side=tk.LEFT)

    # 追加ボタンとクリアボタンを作成
    addbutton = tk.Button(parent, text="追加")
    addbutton.pack(side=tk.LEFT)
    addbutton.bind(
        "<Button-1>",
        lambda e: addbutton_handler(pitch_list, pitchname.get(), is_root.get()),
    )

    clearbutton = tk.Button(parent, text="クリア")
    clearbutton.pack(side=tk.LEFT)
    clearbutton.bind("<Button-1>", lambda _: clearbutton_handler(pitch_list))


# 演奏音入力部分の作成
def build_with_title(parent, pitch_list, update_message_window):
    frame_inputchord = ttk.Frame(parent)
    frame_inputchord.pack(side=tk.TOP, pady=10)

    inputchord_title = tk.Label(frame_inputchord, text="演奏音入力")
    inputchord_title.pack(side=tk.LEFT, fill=tk.X)

    frame_inputpitchname = ttk.Frame(frame_inputchord)
    frame_inputpitchname.pack(side=tk.LEFT, fill=tk.X)

    build(frame_inputpitchname, pitch_list, update_message_window)
