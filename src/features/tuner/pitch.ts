import { PitchDetector } from 'pitchy'
import { centsBetween } from './music'

export const MIN_PITCH = 40
export const MAX_PITCH = 2000
export const BUFFER_SIZE = 8192
export const MIN_CLARITY = 0.84
const SUSTAIN_CLARITY = 0.88
const SUSTAIN_LEVEL_RATIO = 0.15
const MAX_SUSTAIN_JUMP_CENTS = 75
const PITCH_HOLD_MS = 240

export interface Signal {
  frequency: number | null
  quality: number
  state: 'quiet' | 'weak' | 'tracking' | 'pitch'
}

export const quietSignal: Signal = { frequency: null, quality: 0, state: 'quiet' }

export function createPitchReader(bufferSize = BUFFER_SIZE) {
  const detector = PitchDetector.forFloat32Array(bufferSize)
  detector.clarityThreshold = 0.98

  return (samples: Float32Array, sampleRate: number, sensitivity: number, recentPitch: number | null = null): Signal => {
    let squareSum = 0
    for (const sample of samples) squareSum += sample * sample
    const rms = Math.sqrt(squareSum / samples.length)
    const attackLevel = 0.012 * 0.06 ** (sensitivity / 100)
    // A confirmed string can decay below the level needed to acquire a new note.
    const sustaining = recentPitch !== null && rms < attackLevel
    const threshold = sustaining ? attackLevel * SUSTAIN_LEVEL_RATIO : attackLevel
    if (rms < threshold) {
      return rms < attackLevel * 0.25 ? quietSignal : { frequency: null, quality: 0.15, state: 'weak' }
    }

    const [frequency, clarity] = detector.findPitch(samples, sampleRate)
    const quality = clarity * Math.min(1, 0.56 + 0.24 * rms / attackLevel)
    const minClarity = sustaining ? SUSTAIN_CLARITY : MIN_CLARITY
    const unrelated = sustaining && Math.abs(centsBetween(frequency, recentPitch)) > MAX_SUSTAIN_JUMP_CENTS
    if (clarity < minClarity || frequency < MIN_PITCH - 0.03 || frequency > MAX_PITCH + 0.03 || unrelated) {
      return { frequency: null, quality: Math.min(0.35, quality), state: 'weak' }
    }

    return { frequency: Math.min(MAX_PITCH, Math.max(MIN_PITCH, frequency)), quality, state: 'pitch' }
  }
}

export class PitchTracker {
  private frequency: number | null = null
  private pending: number | null = null
  private pendingFrames = 0
  private lastPitch = -Infinity

  recentFrequency(time: number): number | null {
    return time - this.lastPitch <= PITCH_HOLD_MS ? this.frequency : null
  }

  update(signal: Signal, time: number): Signal {
    this.frequency = this.recentFrequency(time)
    if (signal.frequency === null) {
      this.pending = null
      this.pendingFrames = 0
      return this.frequency === null ? signal : { ...signal, frequency: this.frequency }
    }

    const incoming = signal.frequency
    const distance = this.frequency === null ? Infinity : Math.abs(centsBetween(incoming, this.frequency))

    if (distance > 55) {
      const sameCandidate = this.pending !== null && Math.abs(centsBetween(incoming, this.pending)) < 45
      this.pending = incoming
      this.pendingFrames = sameCandidate ? this.pendingFrames + 1 : 1
      // An octave jump often comes from the attack or dying harmonics of the same string.
      const octaveJump = this.frequency !== null && Math.abs(distance - 1200) < 70
      if (this.pendingFrames < (octaveJump ? 4 : 2)) {
        return { ...signal, frequency: this.frequency, state: 'tracking' }
      }
      this.frequency = incoming
    } else {
      // Dampen small movements in weak tails while responding quickly to larger pitch changes.
      const weight = distance > 12 ? 0.62 : signal.quality < 0.75 ? 0.24 : 0.38
      this.frequency = this.frequency! * (incoming / this.frequency!) ** weight
    }

    this.pending = null
    this.pendingFrames = 0
    this.lastPitch = time
    return { ...signal, frequency: this.frequency }
  }
}

export function createPitchAnalyzer(bufferSize = BUFFER_SIZE) {
  const readPitch = createPitchReader(bufferSize)
  let tracker = new PitchTracker()

  return {
    analyze(samples: Float32Array, sampleRate: number, sensitivity: number, time: number): Signal {
      const signal = readPitch(samples, sampleRate, sensitivity, tracker.recentFrequency(time))
      return tracker.update(signal, time)
    },
    reset() {
      tracker = new PitchTracker()
    },
  }
}
