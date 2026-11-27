import type { Accidental } from '../tuner/music'
import { noteLabel, parseNote } from '../tuner/music'

export const categories = ['standard', 'lower', 'drop', 'open', 'alternate', 'custom'] as const
export type Category = typeof categories[number]

export interface Tuning {
  id: string
  name: string
  category: Category
  notes: readonly [number, ...number[]]
  aliases?: readonly string[]
  spelling?: Accidental
}

function tuning(id: string, name: string, category: Category, notes: string, options: Pick<Tuning, 'aliases' | 'spelling'> = {}): Tuning {
  const [lowest, ...higher] = notes.split(' ').map(parseNote)
  return { id, name, category, notes: [lowest, ...higher], ...options }
}

export const standard = tuning('standard', 'Standard', 'standard', 'E2 A2 D3 G3 B3 E4')

export const presets: readonly Tuning[] = [
  standard,
  tuning('half-step', 'Half Step Down', 'lower', 'Eb2 Ab2 Db3 Gb3 Bb3 Eb4', { spelling: 'flats' }),
  tuning('d-standard', 'D Standard', 'lower', 'D2 G2 C3 F3 A3 D4', { aliases: ['Full Step Down'] }),
  tuning('c-standard', 'C Standard', 'lower', 'C2 F2 Bb2 Eb3 G3 C4', { spelling: 'flats' }),
  tuning('b-standard', 'B Standard', 'lower', 'B1 E2 A2 D3 F#3 B3'),
  tuning('drop-d', 'Drop D', 'drop', 'D2 A2 D3 G3 B3 E4'),
  tuning('drop-c-sharp', 'Drop C♯', 'drop', 'C#2 G#2 C#3 F#3 A#3 D#4', { aliases: ['Drop C#', 'Drop Db'] }),
  tuning('drop-c', 'Drop C', 'drop', 'C2 G2 C3 F3 A3 D4'),
  tuning('drop-b', 'Drop B', 'drop', 'B1 F#2 B2 E3 G#3 C#4'),
  tuning('drop-a', 'Drop A', 'drop', 'A1 E2 A2 D3 F#3 B3'),
  tuning('double-drop-d', 'Double Drop D', 'drop', 'D2 A2 D3 G3 B3 D4'),
  tuning('open-d', 'Open D', 'open', 'D2 A2 D3 F#3 A3 D4'),
  tuning('open-e', 'Open E', 'open', 'E2 B2 E3 G#3 B3 E4'),
  tuning('open-g', 'Open G', 'open', 'D2 G2 D3 G3 B3 D4'),
  tuning('open-a', 'Open A', 'open', 'E2 A2 E3 A3 C#4 E4'),
  tuning('open-c', 'Open C', 'open', 'C2 G2 C3 G3 C4 E4'),
  tuning('dadgad', 'DADGAD', 'alternate', 'D2 A2 D3 G3 A3 D4'),
]

export function tuningNotes(tuning: Tuning, accidental: Accidental) {
  return tuning.notes.map((note) => noteLabel(note, tuning.spelling ?? accidental)).join('  ')
}
