import { describe, expect, it } from 'vitest'
import { centsBetween, midiToFrequency } from '../features/tuner/music'
import { BUFFER_SIZE, createPitchAnalyzer, createPitchReader, PitchTracker, quietSignal, type Signal } from '../features/tuner/pitch'

const read = createPitchReader()
function waveform(sampleRate: number, frequency: number, harmonics: number[], noise = 0,
  length = BUFFER_SIZE, envelope = (_time: number) => 1) {
  let random = 8675309
  return Float32Array.from({ length }, (_, index) => {
    const time = index / sampleRate
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0
    const tone = harmonics.reduce((sum, strength, harmonic) =>
      sum + strength * Math.sin(2 * Math.PI * frequency * time * (harmonic + 1)), 0)
    return tone * envelope(time) + noise * (2 * random / 0x100000000 - 1)
  })
}

describe('pitch reading', () => {
  it.each([44100, 48000, 96000])('stays within one cent across the operating range at %s Hz', (sampleRate) => {
    for (const frequency of [40, 55, 61.735, 82.407, 110, 329.628, 440, 987.767, 2000]) {
      const reading = read(waveform(sampleRate, frequency, [0.2]), sampleRate, 50)
      expect(reading.state, `${frequency} Hz`).toBe('pitch')
      expect(Math.abs(centsBetween(reading.frequency!, frequency))).toBeLessThan(1)
    }
  })

  it('finds the fundamental under strong overtones and noise', () => {
    const sampleRate = 48000
    const frequency = midiToFrequency(33)
    const reading = read(waveform(sampleRate, frequency, [0.08, 0.4, 0.3, 0.06], 0.07), sampleRate, 50)
    expect(reading.state).toBe('pitch')
    expect(reading.quality).toBeGreaterThan(0.85)
    expect(Math.abs(centsBetween(reading.frequency!, frequency))).toBeLessThan(2)
  })

  it('distinguishes a weak fundamental from a dominating second harmonic', () => {
    const reading = read(waveform(48000, 82.407, [0.07, 0.57], 0.02), 48000, 50)
    expect(reading.state).toBe('pitch')
    expect(Math.abs(centsBetween(reading.frequency!, 82.407))).toBeLessThan(2)
  })

  it('rejects silence, audible noise, weak signals and out-of-range frequencies', () => {
    expect(read(new Float32Array(BUFFER_SIZE), 48000, 50)).toEqual(quietSignal)
    expect(read(waveform(48000, 180, [0.002]), 48000, 50).state).toBe('weak')
    expect(read(waveform(48000, 180, [0.006]), 48000, 100).state).toBe('pitch')
    expect(read(waveform(48000, 100, [], 0.02), 48000, 50).frequency).toBeNull()
    expect(read(waveform(48000, 32, [0.2]), 48000, 50).frequency).toBeNull()
    expect(read(waveform(48000, 2200, [0.2]), 48000, 50).frequency).toBeNull()
  })
})

describe('pitch tracking', () => {
  const pitch = (frequency: number): Signal => ({ frequency, quality: 1, state: 'pitch' })

  it('smooths small movements, suppresses octave spikes and admits actual changes', () => {
    const track = new PitchTracker()
    expect(track.update(pitch(110), 0).state).toBe('tracking')
    expect(track.update(pitch(110), 45).frequency).toBe(110)
    const smoothed = track.update(pitch(111), 90).frequency!
    expect(smoothed).toBeGreaterThan(110)
    expect(smoothed).toBeLessThan(111)
    for (const time of [135, 180, 225]) expect(track.update(pitch(220), time).frequency).toBe(smoothed)
    expect(track.update(pitch(220), 270).frequency).toBe(220)
    expect(track.update(pitch(146.83), 315).frequency).toBe(220)
    expect(track.update(pitch(146.83), 360).frequency).toBe(146.83)
  })

  it('clears stale measurements during a decay', () => {
    const track = new PitchTracker()
    track.update(pitch(82), 0)
    track.update(pitch(82), 45)
    expect(track.update(quietSignal, 225)).toEqual({ ...quietSignal, frequency: 82 })
    expect(track.update(quietSignal, 300)).toEqual(quietSignal)
  })
})

describe('sustained string detection', () => {
  const sampleRate = 48000

  it.each([82.407, 329.628])('measures a single decaying %.3f Hz pluck for at least 1.4 seconds', (frequency) => {
    const pitch = createPitchAnalyzer()
    const samples = waveform(sampleRate, frequency, [0.018, 0.012, 0.007], 0.00021, sampleRate * 2.4, (time) => {
      const age = time - 0.25
      return age >= 0 && age < 1.6 ? Math.exp(-age / 0.4) : 0
    })

    function measure(time: number) {
      const end = Math.round(time * sampleRate / 1000)
      return pitch.analyze(samples.subarray(end - BUFFER_SIZE, end), sampleRate, 50, time)
    }

    expect(measure(210)).toEqual(quietSignal)
    for (let time = 255; time <= 1650; time += 45) {
      const reading = measure(time)
      if (time < 435) continue
      expect(reading.state, `${time} ms`).toBe('pitch')
      expect(Math.abs(centsBetween(reading.frequency!, frequency)), `${time} ms`).toBeLessThan(3)
    }
    for (let time = 1695; time < 2300; time += 45) measure(time)
    expect(measure(2300)).toEqual(quietSignal)
  })

  it('rejects stray weak harmonics and noise while allowing the next strong pluck', () => {
    const pitch = createPitchAnalyzer()
    const weakHarmonic = waveform(sampleRate, 220, [0.0015])
    const aString = waveform(sampleRate, 110, [0.03])
    const dString = waveform(sampleRate, 146.83, [0.03])

    expect(pitch.analyze(weakHarmonic, sampleRate, 50, 0).frequency).toBeNull()
    pitch.analyze(aString, sampleRate, 50, 45)
    expect(pitch.analyze(aString, sampleRate, 50, 90).state).toBe('pitch')
    expect(pitch.analyze(weakHarmonic, sampleRate, 50, 135).state).toBe('weak')
    const noise = waveform(sampleRate, 110, [], 0.0018)
    expect(pitch.analyze(noise, sampleRate, 50, 180).state).toBe('weak')
    expect(pitch.analyze(dString, sampleRate, 50, 225).state).toBe('tracking')
    expect(pitch.analyze(dString, sampleRate, 50, 270).frequency).toBeCloseTo(146.83, 2)

    pitch.reset()
    const quietD = waveform(sampleRate, 146.83, [0.0015])
    expect(pitch.analyze(quietD, sampleRate, 50, 315).frequency).toBeNull()
  })
})
