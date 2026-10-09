/**
 * Production-ready Web Audio API utility for vehicle alert chimes.
 * Handles browser autoplay policies, AudioContext suspension/resumption,
 * and user-authorized audible notifications.
 */

let globalAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
    }
  }
  return globalAudioCtx;
}

/**
 * Ensures the browser allows audio playback by resuming a suspended AudioContext.
 * Must be triggered by a user gesture (such as clicking the toggle in Settings).
 */
export async function unlockAudioPlayback(): Promise<boolean> {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    return ctx.state === 'running';
  } catch (err) {
    console.warn('Unable to unlock browser audio context:', err);
    return false;
  }
}

/**
 * Plays an alert sound if audio is enabled and permitted by the browser.
 */
export async function playAlertSound(type: 'critical' | 'warn' | 'test' = 'critical'): Promise<void> {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'critical') {
      // Urgent two-tone siren chime for stolen vehicle hits & critical breaches (880Hz -> 1174Hz)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.setValueAtTime(1174.66, now + 0.12); // D6
      osc.frequency.setValueAtTime(880, now + 0.24);
      osc.frequency.setValueAtTime(1174.66, now + 0.36);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.55);
    } else if (type === 'test') {
      // Harmonious confirmation chime (C5 -> E5 -> G5)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.25);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } else {
      // Milder warning chime (D5 -> A5)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
    }
  } catch (err) {
    // Autoplay policy or device audio unavailable
    console.debug('Alert chime playback blocked by browser policy:', err);
  }
}
