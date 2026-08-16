// WebAudio synthesized placeholder sounds behind named hooks.
// Init happens on the first user gesture (unlock). Respects settings.

export type SoundName =
  | "hit"
  | "crit"
  | "enemyDie"
  | "pickup"
  | "xp"
  | "levelUp"
  | "uiClick"
  | "boss"
  | "bossDie"
  | "chest"
  | "victory"
  | "defeat"
  | "hurt"
  | "error";

export class AudioManager {
  private ctx: AudioContext | null = null;
  private sfxOn = true;
  private unlocked = false;
  private musicOn = true;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private readonly musicRoots = [55, 49, 43.65, 55, 58.27, 49]; // A1 G1 F1 A1 Bb1 G1

  setSfx(on: boolean): void {
    this.sfxOn = on;
  }

  isSfxOn(): boolean {
    return this.sfxOn;
  }

  setMusic(on: boolean): void {
    this.musicOn = on;
    if (!on) {
      this.stopMusic();
    } else if (this.unlocked && this.ctx) {
      this.startMusic();
    }
  }

  isMusicOn(): boolean {
    return this.musicOn;
  }

  unlock(): void {
    if (this.unlocked) {
      return;
    }
    try {
      const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const Ctor = w.AudioContext ?? w.webkitAudioContext;
      if (Ctor) {
        this.ctx = new Ctor();
        this.unlocked = true;
        if (this.musicOn) {
          this.startMusic();
        }
      }
    } catch (err) {
      console.warn("[audio] unavailable", err);
    }
  }

  /** Soft procedural ambient loop (menu + runs). Respects settings.music. */
  startMusic(): void {
    if (!this.ctx || !this.musicOn || this.musicGain) {
      return;
    }
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.14;
    this.musicGain.connect(this.ctx.destination);
    this.musicStep = 0;
    this.playMusicStep();
    this.musicTimer = window.setInterval(() => this.playMusicStep(), 2400);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.musicGain) {
      this.musicGain.disconnect();
      this.musicGain = null;
    }
  }

  private playMusicStep(): void {
    if (!this.ctx || !this.musicGain) {
      return;
    }
    const root = this.musicRoots[this.musicStep % this.musicRoots.length];
    const t = this.ctx.currentTime + 0.05;
    this.musicPad(root, t);
    this.musicPad(root * 1.5, t + 0.05);
    this.musicPad(root * 2, t + 0.35);
    this.musicStep++;
  }

  private musicPad(freq: number, when: number): void {
    if (!this.ctx || !this.musicGain) {
      return;
    }
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, when);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.05, when + 1.4);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 2.8);
    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(when);
    osc.stop(when + 3);
  }

  play(name: SoundName): void {
    if (!this.sfxOn || !this.ctx) {
      return;
    }
    try {
      const t = this.ctx.currentTime;
      switch (name) {
        case "hit":
          this.tone(880, 0.06, "square", 0.035, t);
          break;
        case "crit":
          this.tone(1200, 0.09, "square", 0.045, t);
          this.tone(1600, 0.08, "square", 0.035, t + 0.03);
          break;
        case "enemyDie":
          this.tone(420, 0.12, "triangle", 0.05, t);
          this.tone(240, 0.14, "triangle", 0.045, t + 0.05);
          break;
        case "pickup":
          this.tone(980, 0.05, "sine", 0.04, t);
          break;
        case "xp":
          this.tone(700, 0.05, "sine", 0.03, t);
          this.tone(980, 0.05, "sine", 0.03, t + 0.04);
          break;
        case "levelUp":
          [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, "triangle", 0.06, t + i * 0.09));
          break;
        case "uiClick":
          this.tone(660, 0.05, "square", 0.028, t);
          break;
        case "boss":
          this.tone(110, 0.5, "sawtooth", 0.07, t);
          this.tone(82, 0.6, "sawtooth", 0.07, t + 0.15);
          break;
        case "bossDie":
          [440, 554, 659, 880, 1108].forEach((f, i) => this.tone(f, 0.16, "square", 0.055, t + i * 0.1));
          break;
        case "chest":
          [660, 880, 1320].forEach((f, i) => this.tone(f, 0.12, "sine", 0.055, t + i * 0.08));
          break;
        case "victory":
          [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.2, "triangle", 0.07, t + i * 0.12));
          break;
        case "defeat":
          [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.25, "triangle", 0.06, t + i * 0.18));
          break;
        case "hurt":
          this.tone(200, 0.12, "sawtooth", 0.055, t);
          break;
        case "error":
          this.tone(160, 0.15, "square", 0.045, t);
          break;
      }
    } catch (err) {
      // never let audio break gameplay
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, when: number): void {
    if (!this.ctx) {
      return;
    }
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(when);
    osc.stop(when + dur + 0.03);
  }
}
