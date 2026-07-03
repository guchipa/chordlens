
// Simple FFT implementation
class FFT {
  constructor(size) {
    this.size = size;
    this.reverseTable = new Uint32Array(size);
    this.sinTable = new Float32Array(size);
    this.cosTable = new Float32Array(size);

    let limit = 1;
    let bit = size >> 1;

    while (limit < size) {
      for (let i = 0; i < limit; i++) {
        this.reverseTable[i + limit] = this.reverseTable[i] + bit;
      }
      limit <<= 1;
      bit >>= 1;
    }

    for (let i = 0; i < size; i++) {
      this.sinTable[i] = Math.sin(-Math.PI / i);
      this.cosTable[i] = Math.cos(-Math.PI / i);
    }
  }

  transform(real, imag) {
    const size = this.size;
    const reverseTable = this.reverseTable;

    for (let i = 0; i < size; i++) {
      const j = reverseTable[i];
      if (j > i) {
        const tempReal = real[i];
        const tempImag = imag[i];
        real[i] = real[j];
        imag[i] = imag[j];
        real[j] = tempReal;
        imag[j] = tempImag;
      }
    }

    let halfSize = 1;
    while (halfSize < size) {
      const phaseShiftStepReal = Math.cos(-Math.PI / halfSize);
      const phaseShiftStepImag = Math.sin(-Math.PI / halfSize);

      let currentPhaseShiftReal = 1;
      let currentPhaseShiftImag = 0;

      for (let fftStep = 0; fftStep < halfSize; fftStep++) {
        for (let i = fftStep; i < size; i += 2 * halfSize) {
          const j = i + halfSize;
          const tr = currentPhaseShiftReal * real[j] - currentPhaseShiftImag * imag[j];
          const ti = currentPhaseShiftReal * imag[j] + currentPhaseShiftImag * real[j];

          real[j] = real[i] - tr;
          imag[j] = imag[i] - ti;
          real[i] += tr;
          imag[i] += ti;
        }

        const tmpReal = currentPhaseShiftReal;
        currentPhaseShiftReal = tmpReal * phaseShiftStepReal - currentPhaseShiftImag * phaseShiftStepImag;
        currentPhaseShiftImag = tmpReal * phaseShiftStepImag + currentPhaseShiftImag * phaseShiftStepReal;
      }
      halfSize <<= 1;
    }
  }
}

class CustomAnalyserProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.fftSize = 2048;
    this.smoothingTimeConstant = 0.8;
    this.buffer = new Float32Array(this.fftSize);
    this.writeIndex = 0;
    this.fft = null;
    this.windowTable = null;
    this.lastMagnitudes = null;

    this.initFFT(this.fftSize);

    this.port.onmessage = (event) => {
      if (event.data.type === 'configure') {
        const { fftSize, smoothingTimeConstant } = event.data;
        if (fftSize && fftSize !== this.fftSize) {
          this.initFFT(fftSize);
        }
        if (smoothingTimeConstant !== undefined) {
          this.smoothingTimeConstant = smoothingTimeConstant;
        }
      } else if (event.data.type === 'getFrequencyData') {
        this.computeFFT(event.data.requestId);
      }
    };
  }

  initFFT(size) {
    this.fftSize = size;
    this.buffer = new Float32Array(size);
    this.writeIndex = 0;
    this.fft = new FFT(size);
    this.lastMagnitudes = new Float32Array(size / 2);
    this.lastMagnitudes.fill(-100); // Default silence

    // Blackman window
    this.windowTable = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      const a0 = 0.42;
      const a1 = 0.5;
      const a2 = 0.08;
      this.windowTable[i] = a0 - a1 * Math.cos((2 * Math.PI * i) / (size - 1)) + a2 * Math.cos((4 * Math.PI * i) / (size - 1));
    }
  }

  process(inputs) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0];
      const bufferLength = this.buffer.length;

      // Copy data to ring buffer
      for (let i = 0; i < channelData.length; i++) {
        this.buffer[this.writeIndex] = channelData[i];
        this.writeIndex = (this.writeIndex + 1) % bufferLength;
      }
    }
    return true;
  }

  computeFFT(requestId) {
    const size = this.fftSize;
    const real = new Float32Array(size);
    const imag = new Float32Array(size);

    // Unwrap ring buffer
    for (let i = 0; i < size; i++) {
      const index = (this.writeIndex + i) % size;
      real[i] = this.buffer[index] * this.windowTable[i];
    }

    this.fft.transform(real, imag);

    const magnitudes = new Float32Array(size / 2);
    const smoothing = this.smoothingTimeConstant;

    for (let i = 0; i < size / 2; i++) {
      // Magnitude
      const mag = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
      // Convert to dB
      // AnalyserNode uses 20 * log10(mag) but the scale might be different.
      // Usually normalized by size.
      // Let's try standard normalization.
      const db = 20 * Math.log10(mag / size + 1e-20); // +epsilon to avoid -Infinity

      // Smoothing
      this.lastMagnitudes[i] = smoothing * this.lastMagnitudes[i] + (1 - smoothing) * db;
      magnitudes[i] = this.lastMagnitudes[i];
    }

    this.port.postMessage({
      type: 'frequencyData',
      requestId,
      data: magnitudes
    }, [magnitudes.buffer]);
  }
}

registerProcessor('custom-analyser-processor', CustomAnalyserProcessor);
