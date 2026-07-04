/**
 * recordMonoAudio - マイク入力の短時間録音とリサンプリング
 *
 * MediaRecorder で一定時間録音し、指定サンプルレートのモノラル
 * Float32Array にデコードして返す。NoteDetector (basic-pitch) への
 * 入力生成に使う。
 */

/** チューナー系と同じ制約: エフェクトを切って生の音を取る */
const MIC_CONSTRAINTS: MediaStreamConstraints = {
    audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
    },
};

export interface RecordMonoAudioOptions {
    /** 録音時間 (ms) */
    durationMs: number;
    /** 出力サンプルレート (Hz) */
    targetSampleRate: number;
    /**
     * 既に取得済みの MediaStream を使う (連続追従モード用)。
     * 指定時は getUserMedia() を呼ばず、tracks も停止しない。
     */
    stream?: MediaStream;
    /** 録音開始時に呼ばれる (マイク許可ダイアログ通過後) */
    onRecordingStart?: () => void;
}

/**
 * マイクから durationMs だけ録音し、targetSampleRate のモノラル PCM を返す
 */
export async function recordMonoAudio({
    durationMs,
    targetSampleRate,
    stream,
    onRecordingStart,
}: RecordMonoAudioOptions): Promise<Float32Array> {
    const ownsStream = !stream;
    const mediaStream =
        stream ?? (await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS));

    try {
        const blob = await recordBlob(mediaStream, durationMs, onRecordingStart);
        return await decodeToMono(blob, targetSampleRate);
    } finally {
        if (ownsStream) {
            mediaStream.getTracks().forEach((track) => track.stop());
        }
    }
}

/** MediaRecorder で durationMs 分の音声 Blob を録音する */
function recordBlob(
    stream: MediaStream,
    durationMs: number,
    onRecordingStart?: () => void
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                chunks.push(event.data);
            }
        };
        recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType }));
        recorder.onerror = () => reject(new Error("録音中にエラーが発生しました。"));

        recorder.start();
        onRecordingStart?.();
        setTimeout(() => {
            if (recorder.state !== "inactive") {
                recorder.stop();
            }
        }, durationMs);
    });
}

/** Blob を targetSampleRate のモノラル Float32Array にデコードする */
async function decodeToMono(
    blob: Blob,
    targetSampleRate: number
): Promise<Float32Array> {
    const arrayBuffer = await blob.arrayBuffer();

    // decodeAudioData はコンテキストのサンプルレートへ自動でリサンプルする
    const audioContext = new AudioContext({ sampleRate: targetSampleRate });
    try {
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        return mixdownToMono(audioBuffer);
    } finally {
        await audioContext.close();
    }
}

/** マルチチャンネルの AudioBuffer を平均してモノラル化する */
function mixdownToMono(audioBuffer: AudioBuffer): Float32Array {
    if (audioBuffer.numberOfChannels === 1) {
        return audioBuffer.getChannelData(0);
    }

    const mono = new Float32Array(audioBuffer.length);
    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
        const channel = audioBuffer.getChannelData(ch);
        for (let i = 0; i < channel.length; i++) {
            mono[i] += channel[i];
        }
    }
    for (let i = 0; i < mono.length; i++) {
        mono[i] /= audioBuffer.numberOfChannels;
    }
    return mono;
}
