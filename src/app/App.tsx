import { useEffect, useState } from 'react'
import { Activity, AudioLines, Download, Guitar, LockKeyhole, Mic, MicOff, Settings2, Share, WifiOff } from 'lucide-react'
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'motion/react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Modal } from '../components/Modal'
import { Segmented } from '../components/Segmented'
import { SettingsDialog } from '../features/settings/SettingsDialog'
import { TunerPanel } from '../features/tuner/TunerPanel'
import { useMicrophone } from '../features/tuner/useMicrophone'
import { useReading } from '../features/tuner/useReading'
import { TuningPanel } from '../features/tunings/TuningPanel'
import { TuningDialog } from '../features/tunings/TuningDialog'
import { presets, standard } from '../features/tunings/tunings'
import { useCopy } from '../locales'
import { usePreferences } from '../stores/preferences'
import { useInstall } from './useInstall'

export function App() {
  const copy = useCopy()
  const preferences = usePreferences((state) => state.preferences)
  const mode = usePreferences((state) => state.mode)
  const setMode = usePreferences((state) => state.setMode)
  const selection = usePreferences((state) => state.selection)
  const setSelection = usePreferences((state) => state.setSelection)
  const tuningId = usePreferences((state) => state.tuningId)
  const setTuning = usePreferences((state) => state.setTuning)
  const customTunings = usePreferences((state) => state.customTunings)
  const tunings = [...presets, ...customTunings]
  const tuning = tunings.find(({ id }) => id === tuningId) ?? standard
  const guitar = mode === 'guitar'
  const [modal, setModal] = useState<'settings' | 'tunings' | 'install' | null>(null)
  const [manualString, setManualString] = useState(0)
  const mic = useMicrophone(preferences.sensitivity)
  const { reading, progress, resetProgress } = useReading(
    mic.signal, tuning, guitar, selection === 'manual' ? Math.min(manualString, tuning.notes.length - 1) : null, preferences,
  )
  const reduced = useReducedMotion()
  const install = useInstall()
  const { offlineReady: [offlineReady], needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()
  const [offlineCapable, setOfflineCapable] = useState(false)
  const [darkSystem, setDarkSystem] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)
  const dark = preferences.theme === 'dark' || (preferences.theme === 'system' && darkSystem)
  const micState = { off: copy.micOff, on: copy.micOn, paused: copy.micPaused, requesting: copy.micConnecting }[mic.status]

  useEffect(() => {
    const query = matchMedia('(prefers-color-scheme: dark)')
    const update = () => setDarkSystem(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    navigator.serviceWorker?.ready.then(() => setOfflineCapable(true))
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = dark ? 'dark' : 'light'
    const color = getComputedStyle(root).getPropertyValue('--bg').trim()
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
  }, [dark])

  useEffect(() => { document.documentElement.lang = preferences.language }, [preferences.language])

  function chooseString(index: number) {
    if (index >= 0) setManualString(index)
    setSelection(index === -1 ? 'auto' : 'manual')
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell">
        <header className="app-header">
          <div className="brand"><span className="brand-mark"><AudioLines size={23} strokeWidth={2.25} /></span><span>grape<span className="brand-accent">tuner</span></span></div>
          <div className="header-controls">
            <div className="mic-status" data-status={mic.status} title={micState} aria-live="polite">
              {mic.status === 'on' ? <Mic size={15} /> : <MicOff size={15} />}
              <span>{micState}</span>
            </div>
            <button type="button" className="icon-button settings-button" aria-label={copy.settings}
              title={copy.settings} aria-haspopup="dialog" onClick={() => setModal('settings')}><Settings2 size={20} /></button>
          </div>
        </header>

        <main className="app-main">
          <div className="intro">
            <div>
              <h1>{guitar ? copy.guitarTitle : copy.chromaticTitle}</h1>
              <p>{guitar ? copy.guitarIntro : copy.chromaticIntro}</p>
            </div>
            <Segmented id="tuner-mode" label={copy.pitchSettings} value={mode} onChange={setMode} className="mode-switch"
              options={[{ value: 'guitar', label: copy.guitar, icon: <Guitar size={17} /> },
                { value: 'chromatic', label: copy.chromatic, icon: <Activity size={17} /> }]} />
          </div>
          <div className={`dashboard ${guitar ? '' : 'chromatic-dashboard'}`}>
            <TunerPanel mic={mic} reading={reading} guitar={guitar} reference={preferences.reference}
              tolerance={preferences.tolerance} stringCount={tuning.notes.length} locale={preferences.language} />
            {guitar && <TuningPanel tuning={tuning} active={reading.active} progress={progress}
              onChooseString={chooseString} onReset={resetProgress} onChooseTuning={() => setModal('tunings')} />}
          </div>
          {needRefresh && <aside className="update glass" role="status">
            <span>{mic.status === 'off' ? copy.update : copy.updateWhenIdle}</span>
            {mic.status === 'off' && <button type="button" className="text-button" onClick={() => void updateServiceWorker(true)}>{copy.applyUpdate}</button>}
          </aside>}
        </main>

        <footer className="app-footer">
          <span><LockKeyhole size={15} />{copy.privacy}</span>
          <div>
            {(offlineReady || offlineCapable) && <span><WifiOff size={15} />{copy.offline}</span>}
            {install.canInstall && <button type="button" className="text-button" onClick={() => void install.install()}><Download size={16} />{copy.install}</button>}
            {install.iosHelp && <button type="button" className="text-button" aria-haspopup="dialog" onClick={() => setModal('install')}><Share size={16} />{copy.install}</button>}
          </div>
        </footer>
      </div>
      <AnimatePresence>
        {modal && <motion.div key={modal} initial={false} exit={{ opacity: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.16 }}>
          {modal === 'tunings' && <TuningDialog tunings={tunings} current={tuning}
            onChoose={(id) => { setTuning(id); setManualString(0); setModal(null) }} onClose={() => setModal(null)} />}
          {modal === 'settings' && <SettingsDialog onClose={() => setModal(null)}
            canInstall={install.canInstall} iosHelp={install.iosHelp} onInstall={() => void install.install()} />}
          {modal === 'install' && <Modal title={copy.installHelp} onClose={() => setModal(null)}>
            <p className="install-guide"><Share size={18} />{copy.iosSteps}</p>
          </Modal>}
        </motion.div>}
      </AnimatePresence>
    </MotionConfig>
  )
}
