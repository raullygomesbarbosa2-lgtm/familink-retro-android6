export class NesAudioEngine {
  private ctx: AudioContext | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private gainNode: GainNode | null = null;
  private readonly bufferSize = 8192;
  private readonly leftBuffer = new Float32Array(8192);
  private readonly rightBuffer = new Float32Array(8192);
  private writeIdx = 0;
  private readIdx = 0;
  private muted = false;
  private volume = 0.65;

  public start(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx({ sampleRate: 44100 });
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = this.muted ? 0 : this.volume;

      this.scriptNode = this.ctx.createScriptProcessor(1024, 0, 2);
      this.scriptNode.onaudioprocess = (event) => {
        const outL = event.outputBuffer.getChannelData(0);
        const outR = event.outputBuffer.getChannelData(1);
        for (let i = 0; i < outL.length; i++) {
          if (this.readIdx !== this.writeIdx) {
            outL[i] = this.leftBuffer[this.readIdx];
            outR[i] = this.rightBuffer[this.readIdx];
            this.readIdx = (this.readIdx + 1) % this.bufferSize;
          } else {
            outL[i] = 0;
            outR[i] = 0;
          }
        }
      };

      this.scriptNode.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public pushSample(left: number, right: number): void {
    const nextWrite = (this.writeIdx + 1) % this.bufferSize;
    if (nextWrite === this.readIdx) {
      this.readIdx = (this.readIdx + 1) % this.bufferSize;
    }
    this.leftBuffer[this.writeIdx] = left;
    this.rightBuffer[this.writeIdx] = right;
    this.writeIdx = nextWrite;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.gainNode) {
      this.gainNode.gain.value = muted ? 0 : this.volume;
    }
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode && !this.muted) {
      this.gainNode.gain.value = this.volume;
    }
  }

  public clear(): void {
    this.readIdx = 0;
    this.writeIdx = 0;
  }

  public destroy(): void {
    if (this.scriptNode) {
      this.scriptNode.disconnect();
      this.scriptNode = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
