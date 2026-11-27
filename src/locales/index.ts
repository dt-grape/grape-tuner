import { usePreferences } from '../stores/preferences'
import { en } from './en'
import { ru } from './ru'

export const useCopy = () => usePreferences((state) => state.preferences.language === 'ru' ? ru : en)
export type { Copy } from './en'
