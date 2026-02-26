/**
 * AudioManager - Procedural sound effects using Web Audio API
 *
 * Generates retro-style sound effects without external audio files.
 * Sounds: jump, land, collect, size change, gate unlock, surface-based footsteps
 */

export type SurfaceType = 'grass' | 'stone' | 'wood' | 'default';

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted: boolean = false;
  private ambienceActive: boolean = false;
  private ambienceTimeouts: number[] = [];

  constructor() {
    // Audio context is created on first user interaction
  }

  /**
   * Initialize audio context (call after user interaction)
   */
  init(): void {
    if (this.audioContext) return;

    this.audioContext = new AudioContext();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.audioContext.destination);
  }

  /**
   * Ensure audio context is running
   */
  private ensureContext(): void {
    if (!this.audioContext) {
      this.init();
    }
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * Play jump sound (upward sweep)
   * @param isDoubleJump - If true, plays at slightly higher pitch
   */
  playJump(isDoubleJump: boolean = false): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    // Random pitch variation (0.95 to 1.05) for natural feel
    const pitchVariation = 0.95 + Math.random() * 0.1;
    // Double jump is slightly higher pitched
    const pitchMultiplier = isDoubleJump ? 1.15 : 1.0;
    const basePitch = 200 * pitchVariation * pitchMultiplier;
    const endPitch = 600 * pitchVariation * pitchMultiplier;

    osc.type = 'square';
    osc.frequency.setValueAtTime(basePitch, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endPitch, this.audioContext.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.15);
  }

  /**
   * Play falling/death sound
   */
  playFall(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.8);

    gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.8);
  }

  /**
   * Play respawn sound
   */
  playRespawn(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    // Ascending sparkle
    const notes = [262, 330, 392, 523];
    notes.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = this.audioContext!.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  }

  /**
   * Play footstep sound based on surface type
   */
  playFootstep(surface: SurfaceType = 'default'): void {
    switch (surface) {
      case 'grass':
        this.playFootstepGrass();
        break;
      case 'stone':
        this.playFootstepStone();
        break;
      case 'wood':
        this.playFootstepWood();
        break;
      default:
        this.playFootstepGrass(); // Default to grass for garden setting
    }
  }

  /**
   * Play grass footstep sound - soft, muffled thud
   */
  playFootstepGrass(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const noise = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const noiseGain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    // Low frequency thud with slight variation
    const basePitch = 60 + Math.random() * 30;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(basePitch, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.audioContext.currentTime + 0.06);

    // Add subtle noise for grass texture
    noise.type = 'triangle';
    noise.frequency.setValueAtTime(200 + Math.random() * 100, this.audioContext.currentTime);

    // Quick, muffled tap
    gain.gain.setValueAtTime(0.08, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.07);

    noiseGain.gain.setValueAtTime(0.02, this.audioContext.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.04);

    // Heavy low-pass filter for muffled grass sound
    filter.type = 'lowpass';
    filter.frequency.value = 250;

    osc.connect(filter);
    noise.connect(noiseGain);
    noiseGain.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    noise.start();
    osc.stop(this.audioContext.currentTime + 0.08);
    noise.stop(this.audioContext.currentTime + 0.05);
  }

  /**
   * Play stone footstep sound - harder, clicking
   */
  playFootstepStone(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const gain2 = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    // Higher pitched click with variation
    const basePitch = 400 + Math.random() * 200;
    osc.type = 'square';
    osc.frequency.setValueAtTime(basePitch, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.audioContext.currentTime + 0.03);

    // Secondary low thud for impact
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(100, this.audioContext.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.04);

    // Sharp attack, quick decay
    gain.gain.setValueAtTime(0.06, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.04);

    gain2.gain.setValueAtTime(0.05, this.audioContext.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);

    // Slight high-pass to make it crisp
    filter.type = 'highpass';
    filter.frequency.value = 150;

    osc.connect(filter);
    filter.connect(gain);
    osc2.connect(gain2);
    gain.connect(this.masterGain);
    gain2.connect(this.masterGain);

    osc.start();
    osc2.start();
    osc.stop(this.audioContext.currentTime + 0.05);
    osc2.stop(this.audioContext.currentTime + 0.06);
  }

  /**
   * Play wood footstep sound - hollow, wooden
   */
  playFootstepWood(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const gain2 = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    // Hollow resonant tone with variation
    const basePitch = 180 + Math.random() * 60;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(basePitch, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.08);

    // Higher harmonic for wood character
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(basePitch * 2.5, this.audioContext.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(basePitch, this.audioContext.currentTime + 0.04);

    // Quick attack, medium decay (wood resonance)
    gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

    gain2.gain.setValueAtTime(0.04, this.audioContext.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.06);

    // Band-pass for hollow wood sound
    filter.type = 'bandpass';
    filter.frequency.value = 300;
    filter.Q.value = 2;

    osc.connect(filter);
    osc2.connect(gain2);
    filter.connect(gain);
    gain.connect(this.masterGain);
    gain2.connect(this.masterGain);

    osc.start();
    osc2.start();
    osc.stop(this.audioContext.currentTime + 0.12);
    osc2.stop(this.audioContext.currentTime + 0.07);
  }

  /**
   * Play land sound (thud)
   */
  playLand(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.1);

    gain.gain.setValueAtTime(0.4, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.1);
  }

  /**
   * Play collect sound (coin-like chime)
   */
  playCollect(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const frequencies = [523, 659, 784]; // C5, E5, G5 - major chord arpeggio
    const pitchVariation = 0.9 + Math.random() * 0.2; // 0.9 to 1.1

    frequencies.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq * pitchVariation;

      const startTime = this.audioContext!.currentTime + i * 0.05;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  }

  /**
   * Play key collect sound (special fanfare)
   */
  playKeyCollect(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const frequencies = [392, 523, 659, 784, 1047]; // G4, C5, E5, G5, C6

    frequencies.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;

      const startTime = this.audioContext!.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  }

  /**
   * Play shrink sound (descending pitch)
   */
  playShrink(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.3);

    gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.35);
  }

  /**
   * Play grow sound (ascending pitch)
   */
  playGrow(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.3);

    gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.35);
  }

  /**
   * Play gate unlock sound (triumphant fanfare)
   */
  playGateUnlock(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    // Two-part fanfare
    const part1 = [392, 494, 587]; // G4, B4, D5
    const part2 = [523, 659, 784, 1047]; // C5, E5, G5, C6

    part1.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'square';
      osc.frequency.value = freq;

      const startTime = this.audioContext!.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });

    part2.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;

      const startTime = this.audioContext!.currentTime + 0.35 + i * 0.08;
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.6);
    });
  }

  /**
   * Play checkpoint activation sound (short ascending chime)
   */
  playCheckpoint(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    // Quick bright chime - satisfying "ding" confirmation
    const frequencies = [523, 784]; // C5, G5 - perfect fifth

    frequencies.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = this.audioContext!.currentTime + i * 0.03;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  }

  /**
   * Play chapter complete jingle
   */
  playChapterComplete(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const melody = [523, 587, 659, 784, 880, 1047, 1175, 1319]; // C major scale up

    melody.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;

      const startTime = this.audioContext!.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  }

  /**
   * Play bounce pad sound (springy "boing")
   */
  playBounce(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    // Triangle wave for soft, springy feel
    osc.type = 'triangle';
    // Start high, sweep down for "boing" effect
    osc.frequency.setValueAtTime(600, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.2);

    gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.2);
  }

  /**
   * Play speed boost activation sound (rising whoosh)
   */
  playSpeedBoost(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const startTime = this.audioContext.currentTime;
    const duration = 0.3;

    // Rising oscillator sweep for "whoosh" feel
    const osc = this.audioContext.createOscillator();
    const oscGain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, startTime);
    osc.frequency.exponentialRampToValueAtTime(800, startTime + duration);

    oscGain.gain.setValueAtTime(0.15, startTime);
    oscGain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    // Detuned oscillators for "wind" texture
    const noiseOsc = this.audioContext.createOscillator();
    const noiseOsc2 = this.audioContext.createOscillator();
    const noiseGain = this.audioContext.createGain();
    const noiseFilter = this.audioContext.createBiquadFilter();

    noiseOsc.type = 'sawtooth';
    noiseOsc.frequency.setValueAtTime(400, startTime);
    noiseOsc.frequency.exponentialRampToValueAtTime(1200, startTime + duration);

    noiseOsc2.type = 'sawtooth';
    noiseOsc2.frequency.setValueAtTime(403, startTime);
    noiseOsc2.frequency.exponentialRampToValueAtTime(1207, startTime + duration);

    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(600, startTime);
    noiseFilter.frequency.exponentialRampToValueAtTime(1500, startTime + duration);
    noiseFilter.Q.value = 1;

    noiseGain.gain.setValueAtTime(0.08, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    // Connect oscillator
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    // Connect noise
    noiseOsc.connect(noiseFilter);
    noiseOsc2.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc.start(startTime);
    noiseOsc.start(startTime);
    noiseOsc2.start(startTime);

    osc.stop(startTime + duration + 0.05);
    noiseOsc.stop(startTime + duration + 0.05);
    noiseOsc2.stop(startTime + duration + 0.05);
  }

  /**
   * Play UI hover sound (soft, subtle tick)
   * Very short duration for responsive feedback
   */
  playUIHover(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    // High frequency tick sound
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, this.audioContext.currentTime);

    // Very short, subtle tick
    gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.05);
  }

  /**
   * Play gate proximity chime (soft magical arpeggio)
   * Played once when player enters range of an unlocked gate
   */
  playGateProximity(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    // C major chord arpeggio - gentle, magical feel
    const frequencies = [523, 659, 784]; // C5, E5, G5

    frequencies.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      // Stagger notes for arpeggio effect
      const startTime = this.audioContext!.currentTime + i * 0.08;
      // Short attack, gentle decay
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });
  }

  /**
   * Toggle mute
   */
  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  /**
   * Get mute state
   */
  getMuted(): boolean {
    return this.muted;
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Play ambient bird chirp sound
   * Creates a short, pleasant chirp using frequency modulation
   */
  playAmbientBirds(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    // Random pitch variation for natural feel
    const basePitch = 1800 + Math.random() * 800;
    const chirpCount = Math.random() > 0.6 ? 2 : 1; // Sometimes double chirp

    for (let c = 0; c < chirpCount; c++) {
      const chirpDelay = c * 0.12;

      const osc = this.audioContext.createOscillator();
      const modulator = this.audioContext.createOscillator();
      const modGain = this.audioContext.createGain();
      const gain = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();

      // Main chirp oscillator
      osc.type = 'sine';
      const startTime = this.audioContext.currentTime + chirpDelay;
      osc.frequency.setValueAtTime(basePitch, startTime);
      osc.frequency.exponentialRampToValueAtTime(basePitch * 1.3, startTime + 0.05);
      osc.frequency.exponentialRampToValueAtTime(basePitch * 0.8, startTime + 0.12);

      // Frequency modulator for warble
      modulator.type = 'sine';
      modulator.frequency.value = 30 + Math.random() * 20;
      modGain.gain.value = 50;

      // Envelope - quick attack, quick decay
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.04, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

      // High-pass filter to make it airy
      filter.type = 'highpass';
      filter.frequency.value = 1200;

      // Connect modulator to oscillator frequency
      modulator.connect(modGain);
      modGain.connect(osc.frequency);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      modulator.start(startTime);
      osc.start(startTime);
      modulator.stop(startTime + 0.18);
      osc.stop(startTime + 0.18);
    }
  }

  /**
   * Play ambient wind whoosh sound
   * Creates subtle noise-based wind using filtered oscillators
   */
  playAmbientWind(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    // Use multiple detuned oscillators to create noise-like wind
    const oscCount = 4;
    const duration = 1.5 + Math.random() * 1.5;
    const startTime = this.audioContext.currentTime;

    for (let i = 0; i < oscCount; i++) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();

      // Slightly detuned triangle waves create rustling texture
      osc.type = 'triangle';
      const baseFreq = 80 + Math.random() * 60;
      osc.frequency.setValueAtTime(baseFreq, startTime);
      osc.frequency.linearRampToValueAtTime(baseFreq * (0.8 + Math.random() * 0.4), startTime + duration);

      // Slow swell and fade
      const peakTime = startTime + duration * (0.3 + Math.random() * 0.3);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.015, peakTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      // Band-pass filter for wind character
      filter.type = 'bandpass';
      filter.frequency.value = 200 + Math.random() * 150;
      filter.Q.value = 0.5 + Math.random() * 0.5;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.1);
    }
  }

  /**
   * Start ambient background sounds
   * Plays bird chirps and wind at random intervals
   */
  startAmbience(): void {
    if (this.ambienceActive) return;
    this.ambienceActive = true;
    this.ensureContext();

    const scheduleBirds = (): void => {
      if (!this.ambienceActive) return;

      this.playAmbientBirds();

      // Random interval between 4-12 seconds for next bird
      const nextInterval = 4000 + Math.random() * 8000;
      const timeoutId = window.setTimeout(scheduleBirds, nextInterval);
      this.ambienceTimeouts.push(timeoutId);
    };

    const scheduleWind = (): void => {
      if (!this.ambienceActive) return;

      this.playAmbientWind();

      // Random interval between 8-20 seconds for next wind
      const nextInterval = 8000 + Math.random() * 12000;
      const timeoutId = window.setTimeout(scheduleWind, nextInterval);
      this.ambienceTimeouts.push(timeoutId);
    };

    // Start with slight delays so sounds don't all play at once
    const birdStartDelay = window.setTimeout(() => {
      if (this.ambienceActive) scheduleBirds();
    }, 2000 + Math.random() * 3000);

    const windStartDelay = window.setTimeout(() => {
      if (this.ambienceActive) scheduleWind();
    }, 5000 + Math.random() * 5000);

    this.ambienceTimeouts.push(birdStartDelay, windStartDelay);
  }

  /**
   * Stop ambient background sounds
   */
  stopAmbience(): void {
    this.ambienceActive = false;

    // Clear all scheduled ambient sound timeouts
    this.ambienceTimeouts.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    this.ambienceTimeouts = [];
  }
}

// Singleton instance
export const audioManager = new AudioManager();
