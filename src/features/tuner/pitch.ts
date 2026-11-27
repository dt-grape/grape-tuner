import { PitchDetector } from 'pitchy'
import { centsBetween } from './music'

export const MIN_PITCH = 40
export const MAX_PITCH = 2000
export const BUFFER_SIZE = 8192
export const MIN_CLARITY = 0.84

export interface Signal {
  frequency: number | null
  quality: number
  state: 'quiet' | 'weak' | 'tracking' | 'pitch'
}

export const quietSignal: Signal = { frequency: null, quality: 0, state: 'quiet' }

export function createPitchReader(bufferSize = BUFFER_SIZE) {
  const detector = PitchDetector.forFloat32Array(bufferSize)
  detector.clarityThreshold = 0.98

  return (samples: Float32Array, sampleRate: number, sensitivity: number): Signal => {
    let squareSum = 0
    for (const sample of samples) squareSum += sample * sample
    const rms = Math.sqrt(squareSum / samples.length)
    const threshold = 0.014 * 0.09 ** (sensitivity / 100)
    if (rms < threshold * 0.25) return quietSignal
    if (rms < threshold) return { frequency: null, quality: 0.15, state: 'weak' }

    const [frequency, clarity] = detector.findPitch(samples, sampleRate)
    const quality = Math.min(1, clarity * Math.min(1, 0.6 + 0.2 * rms / threshold))
    if (clarity < MIN_CLARITY || frequency < MIN_PITCH - 0.03 || frequency > MAX_PITCH + 0.03) {
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

  update(signal: Signal, time: number): Signal {
    if (signal.frequency === null) {
      this.pending = null
      this.pendingFrames = 0
      if (time - this.lastPitch > 145) this.frequency = null
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
      const weight = distance > 12 ? 0.62 : 0.38
      this.frequency = this.frequency! * (incoming / this.frequency!) ** weight
    }

    this.pending = null
    this.pendingFrames = 0
    this.lastPitch = time
    return { ...signal, frequency: this.frequency }
  }
}
