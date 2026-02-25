/**
 * AudioManager - Procedural sound effects using Web Audio API
 *
 * Generates retro-style sound effects without external audio files.
 * Sounds: jump, land, collect, size change, gate unlock
 */

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted: boolean = false;

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
   */
  playJump(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.15);
  }

  /**
   * Play footstep sound
   */
  playFootstep(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    // Vary pitch slightly for natural feel
    const basePitch = 80 + Math.random() * 40;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(basePitch, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.audioContext.currentTime + 0.05);

    // Quick, quiet tap
    gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.06);

    // Low-pass filter for softness
    filter.type = 'lowpass';
    filter.frequency.value = 300;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.08);
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

    frequencies.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

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
}

// Singleton instance
export const audioManager = new AudioManager();
