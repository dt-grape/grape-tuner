import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import type { Accidental } from '../features/tuner/music'
import type { Tuning } from '../features/tunings/tunings'

export interface Preferences {
  theme: 'system' | 'dark' | 'light'
  language: 'en' | 'ru'
  reference: number
  tolerance: number
  accidental: Accidental
  vibration: boolean
  sensitivity: number
}

export function defaultPreferences(language: Preferences['language'] = 'en'): Preferences {
  return { theme: 'system', language, reference: 440, tolerance: 3, accidental: 'sharps', vibration: false, sensitivity: 50 }
}

interface AppState {
  preferences: Preferences
  favorites: string[]
  customTunings: Tuning[]
  tuningId: string
  mode: 'guitar' | 'chromatic'
  selection: 'auto' | 'manual'
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void
  resetPreferences: () => void
  toggleFavorite: (id: string) => void
  addTuning: (tuning: Tuning) => void
  setTuning: (id: string) => void
  setMode: (mode: AppState['mode']) => void
  setSelection: (selection: AppState['selection']) => void
}

export function createPreferencesStore(language: Preferences['language'], storage?: StateStorage) {
  return createStore<AppState>()(persist((set) => ({
    preferences: defaultPreferences(language),
    favorites: [],
    customTunings: [],
    tuningId: 'standard',
    mode: 'guitar',
    selection: 'auto',
    setPreference: (key, value) => set((state) => ({ preferences: { ...state.preferences, [key]: value } })),
    resetPreferences: () => set({ preferences: defaultPreferences(language) }),
    toggleFavorite: (id) => set(({ favorites }) => ({
      favorites: favorites.includes(id) ? favorites.filter((favorite) => favorite !== id) : [...favorites, id],
    })),
    addTuning: (tuning) => set(({ customTunings }) => ({
      customTunings: [...customTunings, tuning],
      tuningId: tuning.id,
    })),
    setTuning: (tuningId) => set({ tuningId }),
    setMode: (mode) => set({ mode }),
    setSelection: (selection) => set({ selection }),
  }), {
    name: 'grapetuner',
    storage: createJSONStorage(() => storage ?? localStorage),
    partialize: ({ preferences, favorites, customTunings, tuningId, mode, selection }) =>
      ({ preferences, favorites, customTunings, tuningId, mode, selection }),
    merge: (saved, current) => {
      const data = (saved ?? {}) as Partial<AppState>
      return { ...current, ...data, preferences: { ...current.preferences, ...data.preferences } }
    },
  }))
}

const language = typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en'
const store = createPreferencesStore(language)
export const usePreferences = <T>(select: (state: AppState) => T) => useStore(store, select)
