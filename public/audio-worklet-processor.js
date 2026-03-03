/**
 * AudioWorklet Processor — PCM Capture
 *
 * Runs in the audio rendering thread. Captures raw audio frames
 * from the microphone and converts them to 16-bit PCM at the
 * browser's native sample rate. Resampling to 16kHz is handled
 * in the main thread before sending to the server.
 */

class PCMCaptureProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this._active = true;

        this.port.onmessage = (event) => {
            if (event.data === 'stop') {
                this._active = false;
            }
        };
    }

    process(inputs) {
        if (!this._active) return false;

        const input = inputs[0];
        if (!input || !input[0]) return true;

        // Get mono channel (channel 0)
        const float32Data = input[0];

        // Convert Float32 [-1.0, 1.0] to Int16 [-32768, 32767]
        const int16Data = new Int16Array(float32Data.length);
        for (let i = 0; i < float32Data.length; i++) {
            const s = Math.max(-1, Math.min(1, float32Data[i]));
            int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Send the PCM data to the main thread
        this.port.postMessage(int16Data.buffer, [int16Data.buffer]);

        return true;
    }
}

registerProcessor('pcm-capture-processor', PCMCaptureProcessor);
