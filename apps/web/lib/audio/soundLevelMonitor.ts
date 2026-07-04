/**
 * SoundLevelMonitor - マイク入力の音量 (RMS) 監視
 *
 * 自動追従モードの音量ゲートに使う。無音時に basic-pitch の推論を
 * 回さないよう、RMS が閾値を超えるまで待機する手段を提供する。
 */

/** 楽器音とみなす RMS 閾値。旧自己相関法の無音チェックと同じ値 */
export const SOUND_RMS_THRESHOLD = 0.01;

/** 音量ポーリングの間隔 (ms) */
const POLL_INTERVAL_MS = 100;

export interface WaitForSoundOptions {
    /** 楽器音とみなす RMS 閾値 (デフォルト: SOUND_RMS_THRESHOLD) */
    rmsThreshold?: number;
    /** 待機を中断するか判定するコールバック */
    isCancelled?: () => boolean;
}

/**
 * MediaStream の音量を監視するモニタ。
 * 追従セッションの間 AudioContext を保持し、dispose() で解放する。
 */
export class SoundLevelMonitor {
    private audioContext: AudioContext;
    private analyser: AnalyserNode;
    private source: MediaStreamAudioSourceNode;
    private buffer: Float32Array<ArrayBuffer>;

    constructor(stream: MediaStream) {
        this.audioContext = new AudioContext();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.source = this.audioContext.createMediaStreamSource(stream);
        this.source.connect(this.analyser);
        this.buffer = new Float32Array(this.analyser.fftSize);
    }

    /** 現在の入力音量 (RMS) を返す */
    getRms(): number {
        this.analyser.getFloatTimeDomainData(this.buffer);
        let sum = 0;
        for (let i = 0; i < this.buffer.length; i++) {
            sum += this.buffer[i] * this.buffer[i];
        }
        return Math.sqrt(sum / this.buffer.length);
    }

    /**
     * RMS が閾値を超えるまで待機する。
     * @returns 音を検出したら true、isCancelled で中断されたら false
     */
    async waitForSound({
        rmsThreshold = SOUND_RMS_THRESHOLD,
        isCancelled = () => false,
    }: WaitForSoundOptions = {}): Promise<boolean> {
        while (!isCancelled()) {
            if (this.getRms() >= rmsThreshold) {
                return true;
            }
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }
        return false;
    }

    /** リソースを解放する (stream の tracks は停止しない) */
    dispose(): void {
        this.source.disconnect();
        if (this.audioContext.state !== "closed") {
            void this.audioContext.close();
        }
    }
}
