/**
 * MusicManager - Procedural ambient background music
 *
 * Generates whimsical Alice-themed music using Web Audio API.
 * Different moods per chapter.
 */

type ChapterMood = 'mysterious' | 'playful' | 'dreamy' | 'adventurous';

export class MusicManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private currentMood: ChapterMood = 'mysterious';

  // Oscillators and intervals
  private padOsc: OscillatorNode | null = null;
  private padGain: GainNode | null = null;
  private arpeggioInterval: number | null = null;

  // Musical scales for each mood
  private scales: Record<ChapterMood, number[]> = {
    mysterious: [261.63, 293.66, 311.13, 349.23, 392.00, 415.30, 466.16], // C minor
    playful: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88],    // C major
    dreamy: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33],     // C pentatonic + octave
    adventurous: [261.63, 311.13, 349.23, 392.00, 466.16, 523.25, 622.25] // C dorian
  };

  constructor() {
    // Will initialize on first play
  }

  /**
   * Initialize audio context
   */
  private init(): void {
    if (this.audioContext) return;

    this.audioContext = new AudioContext();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.15; // Quiet background music
    this.masterGain.connect(this.audioContext.destination);
  }

  /**
   * Set mood based on chapter
   */
  setChapterMood(chapterNum: number): void {
    const moods: ChapterMood[] = ['mysterious', 'playful', 'dreamy', 'adventurous'];
    this.currentMood = moods[(chapterNum - 1) % moods.length];

    // If playing, restart with new mood
    if (this.isPlaying) {
      this.stop();
      this.play();
    }
  }

  /**
   * Start playing background music
   */
  play(): void {
    if (this.isPlaying) return;

    this.init();
    if (!this.audioContext || !this.masterGain) return;

    // Resume if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.isPlaying = true;

    // Start pad drone
    this.startPad();

    // Start arpeggio pattern
    this.startArpeggio();
  }

  /**
   * Create ambient pad drone
   */
  private startPad(): void {
    if (!this.audioContext || !this.masterGain) return;

    const scale = this.scales[this.currentMood];

    // Create a soft pad with multiple detuned oscillators
    this.padOsc = this.audioContext.createOscillator();
    this.padGain = this.audioContext.createGain();

    this.padOsc.type = 'sine';
    this.padOsc.frequency.value = scale[0] / 2; // Root note, one octave down

    this.padGain.gain.value = 0;
    this.padGain.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 2);

    // Add filter for warmth
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    this.padOsc.connect(filter);
    filter.connect(this.padGain);
    this.padGain.connect(this.masterGain);

    this.padOsc.start();

    // Slowly modulate the pad
    this.modulatePad();
  }

  /**
   * Modulate pad frequency slowly
   */
  private modulatePad(): void {
    if (!this.audioContext || !this.padOsc) return;

    const scale = this.scales[this.currentMood];
    const rootFreqs = [scale[0] / 2, scale[2] / 2, scale[4] / 2]; // Root, third, fifth
    let noteIndex = 0;

    const modulateNote = () => {
      if (!this.isPlaying || !this.padOsc || !this.audioContext) return;

      noteIndex = (noteIndex + 1) % rootFreqs.length;
      this.padOsc.frequency.linearRampToValueAtTime(
        rootFreqs[noteIndex],
        this.audioContext.currentTime + 4
      );

      setTimeout(modulateNote, 8000); // Change every 8 seconds
    };

    setTimeout(modulateNote, 8000);
  }

  /**
   * Start arpeggio pattern
   */
  private startArpeggio(): void {
    if (!this.audioContext || !this.masterGain) return;

    const scale = this.scales[this.currentMood];
    let noteIndex = 0;
    let direction = 1;

    const playArpeggioNote = () => {
      if (!this.isPlaying || !this.audioContext || !this.masterGain) return;

      // Create note
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();

      // Randomly select oscillator type for variety
      const types: OscillatorType[] = ['sine', 'triangle'];
      osc.type = types[Math.floor(Math.random() * types.length)];

      // Get frequency with occasional octave jump
      let freq = scale[noteIndex];
      if (Math.random() > 0.7) freq *= 2; // Octave up sometimes

      osc.frequency.value = freq;

      // Soft attack, quick release
      gain.gain.setValueAtTime(0, this.audioContext.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

      // Warm filter
      filter.type = 'lowpass';
      filter.frequency.value = 1500;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.audioContext.currentTime + 0.6);

      // Move through scale
      noteIndex += direction;
      if (noteIndex >= scale.length - 1) direction = -1;
      if (noteIndex <= 0) direction = 1;

      // Occasionally skip notes for variation
      if (Math.random() > 0.3) {
        noteIndex += direction;
        noteIndex = Math.max(0, Math.min(scale.length - 1, noteIndex));
      }
    };

    // Play notes at varying intervals for organic feel
    const scheduleNext = () => {
      if (!this.isPlaying) return;

      playArpeggioNote();

      // Vary timing between 300-600ms
      const nextTime = 300 + Math.random() * 300;
      this.arpeggioInterval = window.setTimeout(scheduleNext, nextTime);
    };

    // Start after a brief delay
    setTimeout(scheduleNext, 1000);
  }

  /**
   * Stop music
   */
  stop(): void {
    this.isPlaying = false;

    // Stop pad
    if (this.padGain && this.audioContext) {
      this.padGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1);
      setTimeout(() => {
        if (this.padOsc) {
          this.padOsc.stop();
          this.padOsc = null;
        }
        this.padGain = null;
      }, 1100);
    }

    // Stop arpeggio
    if (this.arpeggioInterval) {
      clearTimeout(this.arpeggioInterval);
      this.arpeggioInterval = null;
    }
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume)) * 0.15;
    }
  }

  /**
   * Check if playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

// Singleton
export const musicManager = new MusicManager();
