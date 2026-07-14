class AudioAlarmService {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private masterGain: GainNode | null = null;
  private timeoutId: number | null = null;

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn("AudioContext not supported", e);
    }
  }

  play() {
    if (!this.ctx) this.init();
    if (!this.ctx || this.isPlaying) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isPlaying = true;
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    
    // Set a moderate volume
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.1);

    this.scheduleNextBeep();
  }

  private scheduleNextBeep = () => {
    if (!this.ctx || !this.isPlaying || !this.masterGain) return;

    const time = this.ctx.currentTime;
    
    // Create urgent dual-tone beep
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc1.type = 'square';
    osc2.type = 'sawtooth';
    
    // High pitched urgent frequencies
    osc1.frequency.setValueAtTime(880, time);
    osc2.frequency.setValueAtTime(1108.73, time);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.masterGain);

    // Envelope for sharp beep
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(1, time + 0.05);
    gainNode.gain.setValueAtTime(1, time + 0.15);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.2);
    osc2.stop(time + 0.2);

    // Schedule next beep (3 fast beeps, then a pause)
    this.timeoutId = window.setTimeout(this.scheduleNextBeep, 300);
  }

  stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
      setTimeout(() => {
        if (this.masterGain) {
          this.masterGain.disconnect();
          this.masterGain = null;
        }
      }, 150);
    }
  }
}

export const audioAlarm = new AudioAlarmService();
