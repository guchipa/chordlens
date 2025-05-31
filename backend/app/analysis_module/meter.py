import tkinter as tk
import math


# メーターウィンドウを作成する
def create_meter_window(pitch_root_tuple):
    # 新しいウィンドウ（Toplevel）を作成
    meter_window = tk.Toplevel()
    meter_window.title(f"メーターウィンドウ - {pitch_root_tuple}")
    meter_window.geometry("600x400")  # ウィンドウのサイズを大きくする

    # メーターを作成
    canvas = tk.Canvas(
        meter_window, width=500, height=300, bg="white"
    )  # キャンバスのサイズを大きくする
    canvas.pack(pady=20)

    # pitch_nameを表示
    canvas.create_text(
        250, 50, text=pitch_root_tuple[0], font=("Helvetica", 24, "bold"), fill="black"
    )  # 位置とフォントサイズを調整

    # 円弧を描画
    canvas.create_arc(
        50, 100, 450, 400, start=30, extent=120, style=tk.ARC, width=3, outline="blue"
    )

    # メーターの示す数値を描画
    canvas.create_text(
        250, 250, text="0", font=("Helvetica", 16)
    )  # 位置とフォントサイズを調整
    canvas.create_text(
        100, 250, text="-50cents", font=("Helvetica", 16)
    )  # 位置とフォントサイズを調整
    canvas.create_text(
        400, 250, text="50cents", font=("Helvetica", 16)
    )  # 位置とフォントサイズを調整

    # 目盛りを追加
    for i in range(-10, 11):
        angle = 30 + (120 * (i + 10) / 20)
        radians = math.radians(angle)
        x_start = 250 + 200 * math.cos(radians)
        y_start = 300 - 200 * math.sin(radians)

        # 中心と端点の座標を計算
        if i in [-10, 0, 10]:
            x_end = 250 + 180 * math.cos(radians)
            y_end = 300 - 180 * math.sin(radians)
        else:
            x_end = 250 + 190 * math.cos(radians)
            y_end = 300 - 190 * math.sin(radians)
        canvas.create_line(x_start, y_start, x_end, y_end, width=2)

    # 初期の針の位置を描画
    needle = canvas.create_line(250, 300, 250, 150, width=4, fill="red")

    # 針の角度を計算 (-1 から 1 の範囲で指定)
    def update_needle(position):
        # 更新しない場合
        if position is None:
            return

        # 針の角度を計算
        angle = 90 - (position * 60)  # -1 から 1 の範囲を -60 から 60 度に変換
        radians = math.radians(angle)
        x = 250 + 150 * math.cos(radians)
        y = 300 - 150 * math.sin(radians)
        canvas.coords(needle, 250, 300, x, y)

    # 針の位置を更新する関数を返す
    return update_needle
