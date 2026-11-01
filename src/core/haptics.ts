/**
 * Otium Haptic Engine
 * Provides subtle, high-frequency tactile vibrations for mobile devices.
 * Uses the Web Vibration API with safe fallbacks.
 */
class HapticEngine {
  public enabled = true;

  private vibrate(pattern: number | number[]) {
    if (!this.enabled || typeof window === 'undefined' || typeof navigator === 'undefined') return;
    try {
      if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // Haptics unsupported or disabled by system
    }
  }

  /** Subtle micro-tick for buttons and tab switches (12ms) */
  public light() {
    this.vibrate(12);
  }

  /** Medium tick for actions like pause, resume, toggle (25ms) */
  public medium() {
    this.vibrate(25);
  }

  /** Noticeable thump for starting downloads or confirming delete (40ms) */
  public heavy() {
    this.vibrate(40);
  }

  /** Dual chime pattern for successful download completion */
  public success() {
    this.vibrate([20, 60, 35]);
  }

  /** Warning alert pattern for network error or failed verification */
  public error() {
    this.vibrate([40, 50, 40, 50, 60]);
  }
}

export const haptics = new HapticEngine();
