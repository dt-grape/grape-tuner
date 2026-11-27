import { useEffect, useRef, useState } from 'react'
import { centsBetween, frequencyToMidi, midiToFrequency, nearestString, noteParts } from './music'
import type { Signal } from './pitch'
import type { Tuning } from '../tunings/tunings'
import type { Preferences } from '../../stores/preferences'

export interface Reading {
  note: ReturnType<typeof noteParts> | null
  frequency: number | null
  target: number | null
  cents: number | null
  active: number
  inTune: boolean
}

export function useReading(signal: Signal, tuning: Tuning, guitar: boolean, manual: number | null, settings: Preferences) {
  const previous = useRef({ tuningId: tuning.id, index: -1 })
  const [progress, setProgress] = useState<readonly number[]>([])
  const steadySince = useRef<{ key: string; time: number } | null>(null)
  const confirmedTarget = useRef<string | null>(null)
  const progressKey = `${tuning.id}:${settings.reference}:${settings.tolerance}`
  const [savedKey, setSavedKey] = useState(progressKey)

  if (savedKey !== progressKey) {
    setSavedKey(progressKey)
    setProgress([])
  }

  const frequency = signal.frequency
  const midi = frequency === null ? null : frequencyToMidi(frequency, settings.reference)
  const lastString = previous.current.tuningId === tuning.id ? previous.current.index : -1
  const active = guitar ? manual ?? (midi === null ? -1 : nearestString(tuning.notes, midi, lastString)) : -1
  const targetMidi = guitar ? tuning.notes[active] : midi === null ? undefined : Math.round(midi)
  const target = targetMidi === undefined ? null : midiToFrequency(targetMidi, settings.reference)
  const cents = frequency === null || target === null ? null : centsBetween(frequency, target)
  const inTune = signal.state === 'pitch' && cents !== null && Math.abs(cents) <= settings.tolerance
  const tuneKey = guitar ? `${progressKey}:${active}` : `${settings.reference}:${settings.tolerance}:${targetMidi}`

  useEffect(() => { previous.current = { tuningId: tuning.id, index: active } }, [active, tuning.id])

  useEffect(() => {
    if (!inTune) {
      steadySince.current = null
      return
    }

    const now = performance.now()
    if (steadySince.current?.key !== tuneKey) {
      steadySince.current = { key: tuneKey, time: now }
      return
    }

    if (now - steadySince.current.time < 140) return
    if (guitar && !progress.includes(active)) setProgress((done) => done.includes(active) ? done : [...done, active])
    if (confirmedTarget.current !== tuneKey) {
      confirmedTarget.current = tuneKey
      if (settings.vibration) navigator.vibrate?.(25)
    }
  }, [signal, inTune, tuneKey, guitar, active, progress, settings.vibration])

  useEffect(() => {
    if (signal.frequency === null) confirmedTarget.current = null
  }, [signal.frequency])

  function resetProgress() {
    steadySince.current = null
    confirmedTarget.current = null
    setProgress([])
  }

  const reading: Reading = {
    note: midi === null ? null : noteParts(Math.round(midi), (guitar ? tuning.spelling : undefined) ?? settings.accidental),
    frequency, target, cents, active, inTune,
  }

  return { reading, progress: savedKey === progressKey ? progress : [], resetProgress }
}
