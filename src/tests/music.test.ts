import { describe, expect, it } from 'vitest'
import { centsBetween, frequencyToMidi, midiToFrequency, nearestString, noteLabel, parseNote, SHARPS } from '../features/tuner/music'
import { presets, standard } from '../features/tunings/tunings'

describe('equal temperament', () => {
  it('calculates independent reference frequencies for all 12 notes', () => {
    const fourthOctave = [261.625565, 277.182631, 293.664768, 311.126984, 329.627557, 349.228231,
      369.994423, 391.995436, 415.304698, 440, 466.163762, 493.883301]
    fourthOctave.forEach((frequency, index) => {
      expect(midiToFrequency(60 + index)).toBeCloseTo(frequency, 5)
      expect(noteLabel(Math.round(frequencyToMidi(frequency)), 'sharps')).toBe(`${SHARPS[index]}4`)
    })
  })

  it('round-trips the operating range with alternate reference frequencies', () => {
    for (const reference of [415, 440, 466]) {
      for (let midi = 27; midi <= 96; midi++) {
        expect(frequencyToMidi(midiToFrequency(midi, reference), reference)).toBeCloseTo(midi, 12)
      }
    }
    expect(midiToFrequency(69, 432)).toBe(432)
    expect(centsBetween(432, 440)).toBeCloseTo(-31.7667, 3)
    expect(centsBetween(110 * 2 ** (3 / 1200), 110)).toBeCloseTo(3, 10)
    expect(centsBetween(55, 110)).toBe(-1200)
  })

  it('handles octave boundaries and both accidental spellings', () => {
    expect(noteLabel(59, 'flats')).toBe('B3')
    expect(noteLabel(61, 'flats')).toBe('D♭4')
    expect(noteLabel(61, 'sharps')).toBe('C♯4')
    expect(parseNote('Cb4')).toBe(59)
    expect(parseNote('B#3')).toBe(60)
  })
})

describe('guitar tunings', () => {
  it('contains every unique preset with its exact string pitches', () => {
    const expected = {
      standard: [40, 45, 50, 55, 59, 64], 'half-step': [39, 44, 49, 54, 58, 63],
      'd-standard': [38, 43, 48, 53, 57, 62], 'c-standard': [36, 41, 46, 51, 55, 60],
      'b-standard': [35, 40, 45, 50, 54, 59], 'drop-d': [38, 45, 50, 55, 59, 64],
      'drop-c-sharp': [37, 44, 49, 54, 58, 63], 'drop-c': [36, 43, 48, 53, 57, 62],
      'drop-b': [35, 42, 47, 52, 56, 61], 'drop-a': [33, 40, 45, 50, 54, 59],
      'double-drop-d': [38, 45, 50, 55, 59, 62], 'open-d': [38, 45, 50, 54, 57, 62],
      'open-e': [40, 47, 52, 56, 59, 64], 'open-g': [38, 43, 50, 55, 59, 62],
      'open-a': [40, 45, 52, 57, 61, 64], 'open-c': [36, 43, 48, 55, 60, 64],
      dadgad: [38, 45, 50, 55, 57, 62],
    }
    expect(Object.fromEntries(presets.map(({ id, notes }) => [id, notes]))).toEqual(expected)
    expect(presets.find(({ id }) => id === 'd-standard')?.aliases).toEqual(['Full Step Down'])
  })

  it('selects by octave and retains the previous string near a midpoint', () => {
    expect(nearestString(standard.notes, frequencyToMidi(82.57))).toBe(0)
    expect(nearestString(standard.notes, frequencyToMidi(330.08))).toBe(5)
    expect(nearestString(standard.notes, 42.52, 0)).toBe(0)
    expect(nearestString(standard.notes, 42.55, 0)).toBe(1)
    expect(nearestString([35, 40, 45, 50, 55, 59, 64], 34.93)).toBe(0)
    expect(nearestString([40, 40], 40, 1)).toBe(1)
  })
})
