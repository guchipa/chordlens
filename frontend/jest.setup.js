import '@testing-library/jest-dom';

// Web Audio API と getUserMedia をモックする
global.AudioContext = jest.fn().mockImplementation(() => {
  return {
    createAnalyser: jest.fn().mockReturnValue({
      fftSize: 2048,
      smoothingTimeConstant: 0.8,
      frequencyBinCount: 1024,
      getFloatFrequencyData: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    }),
    createMediaStreamSource: jest.fn().mockReturnValue({
      connect: jest.fn(),
      disconnect: jest.fn(),
      mediaStream: {
        getTracks: jest.fn().mockReturnValue([{
          stop: jest.fn(),
        }]),
      },
    }),
    close: jest.fn(),
    sampleRate: 44100,
  };
});

if (typeof global.navigator.mediaDevices === 'undefined') {
  global.navigator.mediaDevices = {};
}

Object.defineProperty(global.navigator.mediaDevices, 'getUserMedia', {
  configurable: true,
  value: jest.fn().mockResolvedValue({
    getTracks: jest.fn().mockReturnValue([{
      stop: jest.fn(),
    }]),
  }),
});

// ResizeObserver をモックする
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
