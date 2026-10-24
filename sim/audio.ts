/**
 * WebAudio player for Mictlán.js sound data (src/core/game/sound.ts).
 * Square-wave effects (like a piezo), plus the run music on two voices.
 * Browsers only allow audio after a user gesture, so call unlock() on keydown.
 */
import { MUSIC_RUN, SFX, tuneMs, type Tune } from "../src/core/game/sound";

export class ChipAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicUntil = 0; // AudioContext time the scheduled music runs to
  private musicOn = false;
  private sfxBusyUntil = 0;
  muted = false;
  /** Diagnostics: notes scheduled so far. */
  notes = 0;
  get state(): string {
    return this.ctx?.state ?? "locked";
  }

  unlock(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.18;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.45;
      this.musicGain.connect(this.master);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.18, this.ctx.currentTime, 0.02);
  }

  /** One-channel effect, like the badge's future piezo: a new effect cuts the previous one. */
  play(id: number): void {
    const tune = SFX[id];
    if (!tune || !this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + 0.005;
    this.sfxBusyUntil = t0 + tuneMs(tune) / 1000;
    this.schedule(tune, t0, "square", this.master, 1);
  }

  /** Keep the run loop scheduled ~1 s ahead while `on`; fades out when it turns off. */
  music(on: boolean): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    if (on && !this.musicOn) {
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(0.45, now);
      this.musicUntil = now + 0.05;
    }
    if (!on && this.musicOn) {
      this.musicGain.gain.setTargetAtTime(0, now, 0.08);
    }
    this.musicOn = on;
    if (!on) return;
    while (this.musicUntil < now + 1) {
      const start = this.musicUntil;
      this.schedule(MUSIC_RUN.lead, start, "square", this.musicGain, 0.55);
      this.schedule(MUSIC_RUN.bass, start, "triangle", this.musicGain, 1);
      this.musicUntil = start + tuneMs(MUSIC_RUN.lead) / 1000;
    }
  }

  private schedule(tune: Tune, t0: number, type: OscillatorType, out: AudioNode, level: number): void {
    const ctx = this.ctx!;
    let t = t0;
    for (const [hz, ms] of tune) {
      const d = ms / 1000;
      if (hz > 0) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.value = hz;
        // short attack/release so notes don't click
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(level, t + 0.004);
        g.gain.setValueAtTime(level, t + Math.max(0.005, d - 0.012));
        g.gain.linearRampToValueAtTime(0, t + d);
        osc.connect(g).connect(out);
        osc.start(t);
        this.notes++;
        osc.stop(t + d + 0.01);
      }
      t += d;
    }
  }
}
