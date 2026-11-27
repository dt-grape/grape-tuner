import { useId, useState } from 'react'
import { Download, Info, RotateCcw, Share } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { Segmented } from '../../components/Segmented'
import { useCopy } from '../../locales'
import { usePreferences } from '../../stores/preferences'

function Range({ label, min, max, value, units, onChange }: {
  label: string
  min: number
  max: number
  value: number
  units: string
  onChange: (value: number) => void
}) {
  const id = useId()
  return (
    <label className="settings-range" htmlFor={id}>
      <span>{label} <output aria-hidden="true">{value}{units}</output></span>
      <input id={id} type="range" min={min} max={max} value={value}
        aria-valuetext={`${value}${units}`} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  )
}

export function SettingsDialog({ onClose, canInstall, iosHelp, onInstall }: {
  onClose: () => void
  canInstall: boolean
  iosHelp: boolean
  onInstall: () => void
}) {
  const copy = useCopy()
  const preferences = usePreferences((state) => state.preferences)
  const set = usePreferences((state) => state.setPreference)
  const reset = usePreferences((state) => state.resetPreferences)
  const [resetDone, setResetDone] = useState(false)

  return (
    <Modal title={copy.settings} onClose={onClose}>
      <div className="modal-scroll settings-body">
        <section>
          <h3>{copy.theme}</h3>
          <Segmented id="theme" label={copy.theme} value={preferences.theme}
            options={[{ value: 'system', label: copy.system }, { value: 'light', label: copy.light }, { value: 'dark', label: copy.dark }]}
            onChange={(value) => set('theme', value)} />
        </section>
        <section>
          <h3>{copy.pitchSettings}</h3>
          <div className="settings-group">
            <Range label={copy.referenceA4} min={415} max={466} value={preferences.reference} units=" Hz" onChange={(value) => set('reference', value)} />
            <Range label={copy.tolerance} min={1} max={10} value={preferences.tolerance} units={` ${copy.cents}`} onChange={(value) => set('tolerance', value)} />
            <Range label={copy.sensitivity} min={0} max={100} value={preferences.sensitivity} units="%" onChange={(value) => set('sensitivity', value)} />
            <label className="settings-row">{copy.accidentals}
              <select value={preferences.accidental} onChange={(event) => set('accidental', event.target.value === 'flats' ? 'flats' : 'sharps')}>
                <option value="sharps">{copy.sharps}</option><option value="flats">{copy.flats}</option>
              </select>
            </label>
            {'vibrate' in navigator && <label className="settings-row">
              {copy.vibration}
              <input className="toggle" role="switch" type="checkbox" checked={preferences.vibration} onChange={(event) => set('vibration', event.target.checked)} />
            </label>}
          </div>
        </section>
        <section>
          <h3>{copy.language}</h3>
          <Segmented id="language" label={copy.language} value={preferences.language}
            options={[{ value: 'en', label: 'English' }, { value: 'ru', label: 'Русский' }]} onChange={(value) => set('language', value)} />
        </section>
        <section>
          <h3>{copy.about}</h3>
          <div className="settings-group about-group">
            <p><Info size={17} />{copy.aboutText}</p>
            {canInstall && <button type="button" className="text-button" onClick={onInstall}><Download size={17} />{copy.install}</button>}
            {iosHelp && <details><summary><Share size={17} />{copy.installHelp}</summary><p>{copy.iosSteps}</p></details>}
          </div>
        </section>
        <button type="button" className="text-button reset-settings" onClick={() => { reset(); setResetDone(true) }}>
          <RotateCcw size={17} />{copy.resetSettings}
        </button>
        {resetDone && <span className="settings-feedback" role="status">{copy.resetDone}</span>}
      </div>
    </Modal>
  )
}
