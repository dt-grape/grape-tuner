import { Check, ChevronsUpDown, Guitar, RotateCcw } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Segmented } from '../../components/Segmented'
import { useCopy } from '../../locales'
import { usePreferences } from '../../stores/preferences'
import { midiToFrequency, noteParts } from '../tuner/music'
import { tuningNotes, type Tuning } from './tunings'

export function TuningPanel({ tuning, active, progress, onChooseTuning, onChooseString, onReset }: {
  tuning: Tuning
  active: number
  progress: readonly number[]
  onChooseTuning: () => void
  onChooseString: (index: number) => void
  onReset: () => void
}) {
  const copy = useCopy()
  const reduced = useReducedMotion()
  const selection = usePreferences((state) => state.selection)
  const { accidental, language, reference } = usePreferences((state) => state.preferences)
  const format = new Intl.NumberFormat(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <section className="glass tuning-panel" aria-labelledby="tuning-title">
      <header className="panel-header">
        <h2 id="tuning-title"><Guitar size={19} />{copy.tuning}</h2>
      </header>
      <button type="button" className="tuning-picker" onClick={onChooseTuning} aria-haspopup="dialog" aria-label={`${copy.chooseTuning}: ${tuning.name}`}>
        <span><strong>{tuning.name}</strong><small>{tuningNotes(tuning, accidental)}</small></span>
        <ChevronsUpDown size={17} />
      </button>
      <div className="string-controls">
        <div className="control-label">{copy.stringSelection}</div>
        <Segmented id="string-selection" label={copy.stringSelection}
          options={[{ value: 'auto', label: copy.auto }, { value: 'manual', label: copy.manual }]}
          value={selection} onChange={(value) => onChooseString(value === 'auto' ? -1 : Math.max(0, active))} />
      </div>
      <ul className="string-list" aria-label={copy.stringSelection}>
        {tuning.notes.map((note, index) => {
          const label = noteParts(note, tuning.spelling ?? accidental)
          const tuned = progress.includes(index)
          const number = tuning.notes.length - index
          const hz = format.format(midiToFrequency(note, reference))
          return (
            <li key={index}>
              <button type="button" className={`string-button ${active === index ? 'string-active' : ''} ${tuned ? 'string-tuned' : ''}`}
                aria-pressed={active === index}
                aria-label={`${copy.string} ${number}, ${label.name}${label.octave}, ${hz} Hz${tuned ? `, ${copy.markedTuned}` : ''}`}
                onClick={() => onChooseString(index)}>
                {active === index && <motion.span className="string-highlight" layoutId="active-string"
                  transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 410, damping: 38 }} />}
                <span className="string-index">{number}</span>
                <span className="string-note">{label.name}<sub>{label.octave}</sub></span>
                <span className="string-frequency">{hz} Hz</span>
                <span className="string-marker" aria-hidden="true">{tuned && <Check size={14} strokeWidth={2.8} />}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="progress">
        <div>
          <span>{copy.tuningProgress}</span>
          <div className="progress-indicator" role="progressbar" aria-label={copy.tuningProgress} aria-valuenow={progress.length} aria-valuemax={tuning.notes.length}>
            {tuning.notes.map((_, index) => <i key={index} data-tuned={index < progress.length} />)}
            <strong aria-hidden="true">{progress.length}/{tuning.notes.length}</strong>
          </div>
        </div>
        <button type="button" className="icon-button reset-progress" onClick={onReset}
          aria-label={copy.resetProgress} title={copy.resetProgress} disabled={progress.length === 0}><RotateCcw size={17} /></button>
      </div>
    </section>
  )
}
