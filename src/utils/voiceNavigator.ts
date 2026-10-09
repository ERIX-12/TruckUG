import { Vehicle } from '../types';
import { unlockAudioPlayback } from './audio';

export interface VoiceLocateEvent {
  vehicleId: string;
  plate: string;
  address: string;
  district: string;
  speed: number;
  topSpeed: number;
  stolenFrom?: string;
  originAddress?: string;
  isStolen: boolean;
  message: string;
  lat: number;
  lon: number;
}

/**
 * Acoustic police dispatch radio chirp before voice readout
 */
function playDispatchChirp(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.13);
  } catch (err) {
    // Ignore audio synthesis errors
  }
}

/**
 * Triggers a spoken voice dispatch announcement for a vehicle's location:
 * 1. Announces: "Locating vehicle."
 * 2. Reads where the vehicle was stolen from (or dispatched from).
 * 3. Reads the recorded speeds at which it traveled and current velocity.
 * 4. Reads the exact current place name where it is located while navigating on live map.
 */
export async function speakVehicleLocation(vehicle: Vehicle): Promise<void> {
  if (typeof window === 'undefined') return;

  // Unlock web audio context if needed
  await unlockAudioPlayback();
  playDispatchChirp();

  const plate = vehicle.plate;
  const address = vehicle.lastPosition?.address || 'Kampala Metropolitan Route';
  const district = vehicle.district || 'Kampala';
  const currentSpeed = vehicle.lastPosition?.speedKph ?? 0;
  const isStolen = vehicle.status === 'stolen' || !!vehicle.stolenFrom;
  const topSpeed = vehicle.topSpeedKph || Math.max(currentSpeed, isStolen ? 74 : 65);
  const lat = vehicle.lastPosition?.lat || 0.3204;
  const lon = vehicle.lastPosition?.lon || 32.5976;

  const phraseIntro = 'Locating vehicle.';

  let originNarrative = '';
  if (isStolen) {
    const stolenLoc = vehicle.stolenFrom || vehicle.originAddress || 'Oasis Mall Parking, Yusuf Lule Road, Kampala Central';
    originNarrative = `Stolen vehicle ${plate}, reported stolen from ${stolenLoc}.`;
  } else {
    const originLoc = vehicle.originAddress || 'Namanve Industrial Transit Depot';
    originNarrative = `Vehicle ${plate}, dispatched from ${originLoc}.`;
  }

  const speedNarrative =
    currentSpeed > 0
      ? `Traveled at corridor speeds up to ${topSpeed} kilometers per hour, currently moving at ${currentSpeed} kilometers per hour.`
      : `Traveled at recorded corridor speeds up to ${topSpeed} kilometers per hour, currently stationary.`;

  const locationNarrative = `Currently located at ${address}, ${district} District.`;

  const fullSpokenPhrase = `${phraseIntro} ${originNarrative} ${speedNarrative} ${locationNarrative}`;

  // Dispatch visual event for on-screen speech banner and wave animation
  if (window.dispatchEvent) {
    const detail: VoiceLocateEvent = {
      vehicleId: vehicle.id,
      plate,
      address,
      district,
      speed: currentSpeed,
      topSpeed,
      stolenFrom: vehicle.stolenFrom,
      originAddress: vehicle.originAddress,
      isStolen,
      message: fullSpokenPhrase,
      lat,
      lon,
    };
    window.dispatchEvent(new CustomEvent('trackug-voice-locate', { detail }));

    // Dispatch map navigation signal
    window.dispatchEvent(
      new CustomEvent('trackug-navigate-map', {
        detail: {
          vehicleId: vehicle.id,
          lat,
          lon,
          plate,
          speed: currentSpeed,
          address,
        },
      })
    );
  }

  // Browser Speech Synthesis
  if (!('speechSynthesis' in window)) {
    console.warn('[TrackUG Voice] Speech synthesis is not supported in this browser.');
    return;
  }

  try {
    // Cancel any active speech utterances to speak immediately
    window.speechSynthesis.cancel();

    // Prepare voice choice
    const getBestVoice = (): SpeechSynthesisVoice | undefined => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return undefined;
      return (
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Samantha') ||
              v.name.includes('Daniel') ||
              v.name.includes('Alex'))
        ) || voices.find((v) => v.lang.startsWith('en'))
      );
    };

    const bestVoice = getBestVoice();

    // Utterance 1: "Locating vehicle."
    const utt1 = new SpeechSynthesisUtterance(phraseIntro);
    utt1.volume = 1.0; // Loud volume
    utt1.rate = 1.0;
    utt1.pitch = 1.05;
    utt1.lang = 'en-US';
    if (bestVoice) utt1.voice = bestVoice;

    // Utterance 2: Origin, speeds traveled, and exact current location
    const utt2Text = `${originNarrative} ${speedNarrative} ${locationNarrative}`;
    const utt2 = new SpeechSynthesisUtterance(utt2Text);
    utt2.volume = 1.0; // Loud volume
    utt2.rate = 0.95;  // Clear deliberate dispatch pronunciation
    utt2.pitch = 1.0;
    utt2.lang = 'en-US';
    if (bestVoice) utt2.voice = bestVoice;

    // Queue both utterances in strict sequence
    window.speechSynthesis.speak(utt1);
    window.speechSynthesis.speak(utt2);
  } catch (err) {
    console.warn('[TrackUG Voice] Speech synthesis error:', err);
  }
}

/**
 * Cancels any active speech readout
 */
export function stopVehicleVoice(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    window.dispatchEvent(new CustomEvent('trackug-voice-stop'));
  }
}

/**
 * Speech recognition helper for voice commands (e.g. "Locate vehicle", "Locate UAX 892K")
 */
export interface VoiceRecognitionController {
  stop: () => void;
}

export function startVoiceCommandRecognition(
  onResult: (transcript: string) => void,
  onError?: (error: string) => void
): VoiceRecognitionController | null {
  if (typeof window === 'undefined') return null;

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (onError) onError('Speech recognition not supported in this browser.');
    return null;
  }

  try {
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      if (transcript) {
        onResult(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      if (onError) onError(event.error || 'Recognition error');
    };

    recognition.start();

    return {
      stop: () => {
        try {
          recognition.stop();
        } catch (e) {
          // ignore
        }
      },
    };
  } catch (err: any) {
    if (onError) onError(err.message || 'Failed to start voice recognition');
    return null;
  }
}
