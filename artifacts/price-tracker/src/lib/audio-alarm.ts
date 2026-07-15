export type RingtoneId = "classic" | "digital" | "bell" | "siren";

export const RINGTONES: { id: RingtoneId; label: string }[] = [
  { id: "classic", label: "Classic Alarm" },
  { id: "digital", label: "Digital Beep" },
  { id: "bell", label: "Soft Bell" },
  { id: "siren", label: "Urgent Siren" },
];

/**
 * Each ringtone schedules one "hit" of sound starting at `time` on the given
 * AudioContext/gain, and returns the interval (ms) before the next hit
 * should be scheduled — used both for the looping real alarm and for a
 * short one-shot preview.
 */
function playClassic(ctx: AudioContext, out: GainNode, time: number): number {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc1.type = "square";
  osc2.type = "sawtooth";
  osc1.frequency.setValueAtTime(880, time);
  osc2.frequency.setValueAtTime(1108.73, time);
  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(out);
  gainNode.gain.setValueAtTime(0, time);
  gainNode.gain.linearRampToValueAtTime(1, time + 0.05);
  gainNode.gain.setValueAtTime(1, time + 0.15);
  gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
  osc1.start(time);
  osc2.start(time);
  osc1.stop(time + 0.2);
  osc2.stop(time + 0.2);
  return 300;
}

function playDigital(ctx: AudioContext, out: GainNode, time: number): number {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(1046.5, time);
  osc.connect(gainNode);
  gainNode.connect(out);
  gainNode.gain.setValueAtTime(0, time);
  gainNode.gain.linearRampToValueAtTime(1, time + 0.01);
  gainNode.gain.setValueAtTime(1, time + 0.08);
  gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
  osc.start(time);
  osc.stop(time + 0.1);
  return 200;
}

function playBell(ctx: AudioContext, out: GainNode, time: number): number {
  const osc = ctx.createOscillator();
  const overtone = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const overtoneGain = ctx.createGain();
  osc.type = "sine";
  overtone.type = "sine";
  osc.frequency.setValueAtTime(660, time);
  overtone.frequency.setValueAtTime(1320, time);
  osc.connect(gainNode);
  overtone.connect(overtoneGain);
  overtoneGain.connect(gainNode);
  gainNode.connect(out);
  overtoneGain.gain.setValueAtTime(0.35, time);
  gainNode.gain.setValueAtTime(0, time);
  gainNode.gain.linearRampToValueAtTime(1, time + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.9);
  osc.start(time);
  overtone.start(time);
  osc.stop(time + 0.9);
  overtone.stop(time + 0.9);
  return 1100;
}

function playSiren(ctx: AudioContext, out: GainNode, time: number): number {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = "sine";
  osc.connect(gainNode);
  gainNode.connect(out);
  const duration = 0.7;
  osc.frequency.setValueAtTime(420, time);
  osc.frequency.linearRampToValueAtTime(1250, time + duration / 2);
  osc.frequency.linearRampToValueAtTime(420, time + duration);
  gainNode.gain.setValueAtTime(0, time);
  gainNode.gain.linearRampToValueAtTime(0.9, time + 0.05);
  gainNode.gain.setValueAtTime(0.9, time + duration - 0.05);
  gainNode.gain.linearRampToValueAtTime(0, time + duration);
  osc.start(time);
  osc.stop(time + duration);
  return duration * 1000 + 60;
}

const PLAYERS: Record<RingtoneId, (ctx: AudioContext, out: GainNode, time: number) => number> = {
  classic: playClassic,
  digital: playDigital,
  bell: playBell,
  siren: playSiren,
};

class AudioAlarmService {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private masterGain: GainNode | null = null;
  private timeoutId: number | null = null;
  private previewCtx: AudioContext | null = null;
  private previewTimeoutId: number | null = null;

  private getCtx(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn("AudioContext not supported", e);
      }
    }
    return this.ctx;
  }

  init() {
    this.getCtx();
  }

  play(ringtone: RingtoneId = "classic") {
    const ctx = this.getCtx();
    if (!ctx || this.isPlaying) return;

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    this.isPlaying = true;
    this.masterGain = ctx.createGain();
    this.masterGain.connect(ctx.destination);
    this.masterGain.gain.setValueAtTime(0, ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);

    const scheduleNext = () => {
      if (!this.ctx || !this.isPlaying || !this.masterGain) return;
      const interval = PLAYERS[ringtone](this.ctx, this.masterGain, this.ctx.currentTime);
      this.timeoutId = window.setTimeout(scheduleNext, interval);
    };
    scheduleNext();
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
      const gainRef = this.masterGain;
      setTimeout(() => {
        gainRef.disconnect();
      }, 150);
      this.masterGain = null;
    }
  }

  /** Plays a short, isolated preview of a ringtone (a few hits), independent of the live alarm loop. */
  preview(ringtone: RingtoneId) {
    this.stopPreview();
    let ctx = this.previewCtx;
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.previewCtx = ctx;
      } catch (e) {
        console.warn("AudioContext not supported", e);
        return;
      }
    }
    if (ctx.state === "suspended") ctx.resume();

    const out = ctx.createGain();
    out.connect(ctx.destination);
    out.gain.setValueAtTime(0.3, ctx.currentTime);

    let hits = 0;
    const maxHits = ringtone === "bell" || ringtone === "siren" ? 2 : 3;
    const scheduleNext = () => {
      if (!this.previewCtx || hits >= maxHits) return;
      hits += 1;
      const interval = PLAYERS[ringtone](this.previewCtx, out, this.previewCtx.currentTime);
      if (hits < maxHits) {
        this.previewTimeoutId = window.setTimeout(scheduleNext, interval);
      } else {
        this.previewTimeoutId = window.setTimeout(() => out.disconnect(), interval + 50);
      }
    };
    scheduleNext();
  }

  stopPreview() {
    if (this.previewTimeoutId !== null) {
      clearTimeout(this.previewTimeoutId);
      this.previewTimeoutId = null;
    }
  }
}

export const audioAlarm = new AudioAlarmService();
