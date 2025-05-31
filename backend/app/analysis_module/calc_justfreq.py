import math
import json

import sol_path


# 純正律の周波数を計算
def get_freqs(pitch_root_tuple):
    # 定数の読み込み
    with open(sol_path.resolve("config/constants.json"), "r", encoding="utf-8") as f:
        constants = json.load(f)
        name_list = constants["name_list"]
        freq_list = constants["freq_list"]

    root_name = ""
    est_freqs = []

    # 根音を探す
    for pitch, is_root in pitch_root_tuple:
        # 根音の場合
        if is_root and root_name == "":
            root_name = pitch
            continue
        elif is_root and root_name != "":
            raise ValueError("根音が複数設定されています")

    # 根音が設定されていない場合
    if root_name == "":
        raise ValueError("根音が設定されていません")

    # 根音を基準に純正律の周波数を計算
    root_idx = name_list.index(root_name)

    # pitchname_list.index(pitch) - root_idx で根音から何半音離れているか計算
    for pitch, _ in pitch_root_tuple:
        # 12半音周期で根音に純正律の比率をかける
        semitone_distance = name_list.index(pitch) - root_idx

        # 12半音周期を超える場合は2の何乗かを計算
        if semitone_distance > 0:
            est_freqs.append(
                freq_list[name_list.index(root_name)]
                * just_ratios[semitone_distance % 12]
                * (2 ** (semitone_distance // 12))
            )
        else:
            est_freqs.append(
                freq_list[name_list.index(root_name)]
                * (just_ratios[semitone_distance % 12])
                * (2 ** math.ceil(semitone_distance // 12))
            )

    return est_freqs


# 純正律をつくる比率
just_ratios = [
    1,
    16 / 15,
    9 / 8,
    6 / 5,
    5 / 4,
    4 / 3,
    45 / 32,
    3 / 2,
    8 / 5,
    5 / 3,
    16 / 9,
    15 / 8,
]
