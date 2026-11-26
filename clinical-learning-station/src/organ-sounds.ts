
import { createSystem } from '@iwsdk/core';

export class OrganSoundsSystem extends createSystem({}) {
  private audioContext: AudioContext | null = null;

  init(): void {
    window.addEventListener('organ-grabbed', this.handleOrganGrabbed);
    window.addEventListener('organ-selected', this.handleOrganSelected);
  }

  private handleOrganGrabbed = (): void => {
    void this.playPickupSound();
  };

  private handleOrganSelected = (): void => {
    void this.playPlacementSound();
  };

  private async getAudioContext(): Promise<AudioContext | null> {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      return this.audioContext;
    } catch (error) {
      console.warn('[OrganSounds] Audio could not start:', error);
      return null;
    }
  }

  private playTone(
    context: AudioContext,
    frequency: number,
    endFrequency: number,
    startTime: number,
    duration: number,
    volume: number,
  ): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';

    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      endFrequency,
      startTime + duration,
    );

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(
      volume,
      startTime + 0.025,
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      startTime + duration,
    );

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
  }

  private async playPickupSound(): Promise<void> {
    const context = await this.getAudioContext();
    if (!context) return;

    const now = context.currentTime;

    this.playTone(context, 280, 440, now, 0.16, 0.045);
  }

  private async playPlacementSound(): Promise<void> {
    const context = await this.getAudioContext();
    if (!context) return;

    const now = context.currentTime;

    this.playTone(context, 520, 780, now, 0.18, 0.045);
    this.playTone(context, 780, 1040, now + 0.13, 0.22, 0.035);
  }

  dispose(): void {
    window.removeEventListener('organ-grabbed', this.handleOrganGrabbed);
    window.removeEventListener('organ-selected', this.handleOrganSelected);

    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }
  }
}
