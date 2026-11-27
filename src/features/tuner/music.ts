export type Accidental = 'sharps' | 'flats'

export const SHARPS = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const
const FLATS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'] as const

export function frequencyToMidi(frequency: number, reference = 440): number {
  return 69 + 12 * Math.log2(frequency / reference)
}

export function midiToFrequency(midi: number, reference = 440): number {
  return reference * 2 ** ((midi - 69) / 12)
}

export function centsBetween(frequency: number, target: number): number {
  return 1200 * Math.log2(frequency / target)
}

export function noteParts(midi: number, accidental: Accidental) {
  const pitchClass = ((midi % 12) + 12) % 12
  const names = accidental === 'flats' ? FLATS : SHARPS
  return { name: names[pitchClass], octave: Math.floor(midi / 12) - 1 }
}

export function noteLabel(midi: number, accidental: Accidental) {
  const { name, octave } = noteParts(midi, accidental)
  return `${name}${octave}`
}

export function nearestString(notes: readonly number[], midi: number, previous = -1): number {
  let nearest = 0
  for (let index = 1; index < notes.length; index++) {
    if (Math.abs(notes[index] - midi) < Math.abs(notes[nearest] - midi)) nearest = index
  }

  // At a midpoint, retain the previous string within an eight-cent margin.
  if (notes[previous] !== undefined && Math.abs(notes[previous] - midi) <= Math.abs(notes[nearest] - midi) + 0.08) {
    return previous
  }
  return nearest
}

export function parseNote(note: string): number {
  const match = /^([A-G])([#b]?)(-?\d+)$/.exec(note)
  if (!match) throw new Error(`Invalid note: ${note}`)
  const pitchClass = SHARPS.findIndex((name) => name === match[1])
  const shift = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0
  return (Number(match[3]) + 1) * 12 + pitchClass + shift
}
