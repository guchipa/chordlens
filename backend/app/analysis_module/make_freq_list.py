import json

import sol_path


def make_freq_list():
    with open(sol_path.resolve("config/constants.json"), "r", encoding="utf-8") as f:
        constants = json.load(f)
        A4_FREQ = constants["a4_freq"]

    freq_list = []
    for i in range(1, 7):
        for j in range(1, 13):
            base = A4_FREQ * (2 ** (i - 4))
            freq = base * (2 ** ((j - 10) / 12))
            freq_list.append(freq)

    # Write frequency list to constants.json
    with open(
        sol_path.resolve("config/constants.json"), "r", encoding="utf-8"
    ) as json_file:
        data = json.load(json_file)

    data["freq_list"] = freq_list

    with open(
        sol_path.resolve("config/constants.json"), "w", encoding="utf-8"
    ) as json_file:
        json.dump(data, json_file, indent=4, ensure_ascii=False)
