import { CONFIG } from '../config';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  // Thruster continuous loop node
  private thrusterNoiseNode: AudioBufferSourceNode | null = null;
  private thrusterGain: GainNode | null = null;
  private thrusterFilter: BiquadFilterNode | null = null;

  // Laser beam continuous hum node
  private laserOsc: OscillatorNode | null = null;
  private laserGain: GainNode | null = null;

  // Dynamic Procedural Music Sequencer
  private musicInterval: number | null = null;
  private musicStep: number = 0;
  private isBossMusic: boolean = false;

  // Volume settings
  public masterVolume: number = CONFIG.AUDIO.MASTER_VOL;
  public sfxVolume: number = CONFIG.AUDIO.SFX_VOL;
  public musicVolume: number = CONFIG.AUDIO.MUSIC_VOL;

  constructor() {
    this.loadSettings();
  }

  // Must be called on first user gesture (click, key, touch)
  public init(): void {
    if (this.ctx) return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX Gain
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Music Gain
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.setupThrusterLoop();
      this.startMusic();
    } catch (e) {
      console.warn('Web Audio API not supported or initialized yet', e);
    }
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('orbital_audio_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.masterVolume = parsed.masterVolume ?? this.masterVolume;
        this.sfxVolume = parsed.sfxVolume ?? this.sfxVolume;
        this.musicVolume = parsed.musicVolume ?? this.musicVolume;
        this.isMuted = parsed.isMuted ?? false;
      }
    } catch {
      // ignore
    }
  }

  public saveSettings(): void {
    try {
      localStorage.setItem('orbital_audio_settings', JSON.stringify({
        masterVolume: this.masterVolume,
        sfxVolume: this.sfxVolume,
        musicVolume: this.musicVolume,
        isMuted: this.isMuted,
      }));
    } catch {
      // ignore
    }
  }

  public setMasterVolume(val: number): void {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
    this.saveSettings();
  }

  public setSfxVolume(val: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
    this.saveSettings();
  }

  public setMusicVolume(val: number): void {
    this.musicVolume = Math.max(0, Math.min(1, val));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    }
    this.saveSettings();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
    this.saveSettings();
    return this.isMuted;
  }

  public get muted(): boolean {
    return this.isMuted;
  }

  // --- Thruster Continuous Sound Loop ---
  private setupThrusterLoop(): void {
    if (!this.ctx || !this.sfxGain) return;

    // Create 2-second pink noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2) * 0.11;
    }

    this.thrusterNoiseNode = this.ctx.createBufferSource();
    this.thrusterNoiseNode.buffer = noiseBuffer;
    this.thrusterNoiseNode.loop = true;

    this.thrusterFilter = this.ctx.createBiquadFilter();
    this.thrusterFilter.type = 'lowpass';
    this.thrusterFilter.frequency.value = 140;

    this.thrusterGain = this.ctx.createGain();
    this.thrusterGain.gain.value = 0;

    this.thrusterNoiseNode.connect(this.thrusterFilter);
    this.thrusterFilter.connect(this.thrusterGain);
    this.thrusterGain.connect(this.sfxGain);
    this.thrusterNoiseNode.start(0);
  }

  public updateThrusterSound(thrustInput: number, isBurning: boolean): void {
    if (!this.ctx || !this.thrusterGain || !this.thrusterFilter) return;

    const targetGain = isBurning ? Math.min(0.35, thrustInput * 0.35) : 0;
    const targetFreq = isBurning ? 120 + thrustInput * 180 : 80;

    this.thrusterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.08);
    this.thrusterFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
  }

  // --- Sound Effects ---

  // Standard Blaster Pew
  public playBlaster(): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  // Spread Shot Volley
  public playSpread(): void {
    if (!this.ctx || !this.sfxGain) return;
    const freqs = [550, 440, 330];
    for (const f of freqs) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(90, this.ctx.currentTime + 0.16);

      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.16);
    }
  }

  // Rapid Vulcan Burst
  public playRapid(): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(320 + Math.random() * 80, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  // Laser Beam Continuous Hum
  public setLaserBeam(active: boolean): void {
    if (!this.ctx || !this.sfxGain) return;

    if (active) {
      if (!this.laserOsc) {
        this.laserOsc = this.ctx.createOscillator();
        this.laserGain = this.ctx.createGain();

        this.laserOsc.type = 'sawtooth';
        this.laserOsc.frequency.setValueAtTime(180, this.ctx.currentTime);

        this.laserGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

        this.laserOsc.connect(this.laserGain);
        this.laserGain.connect(this.sfxGain);
        this.laserOsc.start();
      }
    } else {
      if (this.laserOsc && this.laserGain) {
        this.laserGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
        const osc = this.laserOsc;
        setTimeout(() => {
          try { osc.stop(); osc.disconnect(); } catch {}
        }, 80);
        this.laserOsc = null;
        this.laserGain = null;
      }
    }
  }

  // Missile Launch
  public playMissileLaunch(): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(450, this.ctx.currentTime + 0.22);

    gain.gain.setValueAtTime(0.22, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  // Explosion
  public playExplosion(intensity: 'small' | 'medium' | 'large' = 'medium'): void {
    if (!this.ctx || !this.sfxGain) return;

    const duration = intensity === 'large' ? 0.75 : intensity === 'medium' ? 0.45 : 0.25;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-3.5 * (i / bufferSize));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(intensity === 'large' ? 240 : 380, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + duration);

    const gain = this.ctx.createGain();
    const peakVol = intensity === 'large' ? 0.6 : intensity === 'medium' ? 0.4 : 0.22;
    gain.gain.setValueAtTime(peakVol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start();
  }

  // Shield Impact Ping
  public playShieldHit(): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(280, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  // Pickup Collect Chime
  public playPickup(): void {
    if (!this.ctx || !this.sfxGain) return;
    const notes = [440, 554, 659, 880]; // A major arpeggio
    notes.forEach((f, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime + idx * 0.04;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  // Boss Warning Siren
  public playBossAlarm(): void {
    if (!this.ctx || !this.sfxGain) return;
    for (let i = 0; i < 2; i++) {
      const t = this.ctx.currentTime + i * 0.4;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.linearRampToValueAtTime(640, t + 0.3);

      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.35);
    }
  }

  // --- Dynamic Procedural Space Synth Music Generator ---
  private startMusic(): void {
    if (this.musicInterval !== null) return;

    // Ambient Minor scale pitches: A minor (A2, C3, E3, G3, A3, B3, C4, E4)
    const scale = [110, 130.81, 164.81, 196.0, 220.0, 246.94, 261.63, 329.63];
    const bassScale = [55, 65.41, 73.42, 82.41];

    const stepInterval = 280; // ms per step

    this.musicInterval = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || this.isMuted) return;

      this.musicStep++;
      const now = this.ctx.currentTime;

      // 1. Bass drone on every 4 steps
      if (this.musicStep % 4 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = this.isBossMusic ? 'sawtooth' : 'triangle';
        const bassPitch = bassScale[(Math.floor(this.musicStep / 16)) % bassScale.length];
        bassOsc.frequency.setValueAtTime(bassPitch, now);

        bassGain.gain.setValueAtTime(this.isBossMusic ? 0.22 : 0.14, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

        bassOsc.connect(bassGain);
        bassGain.connect(this.musicGain);
        bassOsc.start(now);
        bassOsc.stop(now + 0.85);
      }

      // 2. Arpeggiated melody line
      const pitchIdx = (this.musicStep * 3) % scale.length;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(scale[pitchIdx], now);

      const noteVol = this.isBossMusic ? 0.12 : 0.08;
      gain.gain.setValueAtTime(noteVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 0.24);

      // 3. Hi-hat pulse on boss mode
      if (this.isBossMusic && this.musicStep % 2 === 0) {
        const hatBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.04), this.ctx.sampleRate);
        const d = hatBuffer.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-15 * (i / d.length));
        const hat = this.ctx.createBufferSource();
        hat.buffer = hatBuffer;
        const hatGain = this.ctx.createGain();
        hatGain.gain.setValueAtTime(0.08, now);
        hat.connect(hatGain);
        hatGain.connect(this.musicGain);
        hat.start(now);
      }
    }, stepInterval);
  }

  public setBossMusic(isBoss: boolean): void {
    this.isBossMusic = isBoss;
  }
}
