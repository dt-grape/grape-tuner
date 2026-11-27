import { expect, it } from 'vitest'
import type { StateStorage } from 'zustand/middleware'
import { createPreferencesStore, defaultPreferences } from '../stores/preferences'
import type { Tuning } from '../features/tunings/tunings'

it('restores preferences, favorites, mode and custom tunings from storage', () => {
  const data = new Map<string, string>()
  const storage: StateStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value) },
    removeItem: (key) => { data.delete(key) },
  }
  const first = createPreferencesStore('en', storage).getState()
  const tuning: Tuning = { id: 'my-tuning', category: 'custom', name: 'My tuning', notes: [40, 45, 50, 55, 59, 64] }
  first.addTuning(tuning)
  first.toggleFavorite(tuning.id)
  first.setPreference('reference', 432)
  first.setPreference('language', 'ru')
  first.setSelection('manual')
  first.setMode('chromatic')

  const secondStore = createPreferencesStore('en', storage)
  expect(secondStore.getState()).toMatchObject({
    customTunings: [tuning], favorites: [tuning.id], tuningId: tuning.id, mode: 'chromatic', selection: 'manual',
    preferences: { reference: 432, language: 'ru' },
  })
  secondStore.getState().resetPreferences()
  expect(createPreferencesStore('en', storage).getState()).toMatchObject({
    preferences: defaultPreferences(), favorites: [tuning.id], customTunings: [tuning],
  })
})
