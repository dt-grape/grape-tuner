import { Activity, AudioLines, CircleCheck, Mic, MicOff } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useCopy } from '../../locales'
import type { useMicrophone } from './useMicrophone'
import type { Reading } from './useReading'
import { Gauge } from './Gauge'

export function TunerPanel({ mic, reading, guitar, reference, tolerance, stringCount, locale }: {
  mic: ReturnType<typeof useMicrophone>
  reading: Reading
  guitar: boolean
  reference: number
  tolerance: number
  stringCount: number
  locale: string
}) {
  const copy = useCopy()
  const reduced = useReducedMotion()
  const live = mic.status === 'on'
  const requesting = mic.status === 'requesting'
  const paused = mic.status === 'paused'
  const quality = live ? mic.signal.quality : 0
  const active = reading.active >= 0 ? stringCount - reading.active : null
  const formatFrequency = (frequency: number | null) => frequency === null ? '—' :
    new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(frequency)
  const roundedCents = reading.cents === null ? null : Math.abs(reading.cents) < 0.05 ? 0 : reading.cents
  const cents = roundedCents === null ? '—' : new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1, signDisplay: 'exceptZero',
  }).format(roundedCents)
  const weak = live && mic.signal.state === 'weak'
  const sizingStates = guitar ? [copy.flat, copy.sharp] : [copy.paused, copy.tracking]
  let state = copy.standby

  if (paused) {
    state = copy.paused
  } else if (requesting) {
    state = copy.micConnecting
  } else if (live) {
    if (mic.signal.state === 'quiet') state = copy.waiting
    if (mic.signal.state === 'tracking') state = copy.tracking
    if (weak) state = copy.weak
    if (mic.signal.state === 'pitch' && reading.cents !== null) {
      state = reading.inTune ? copy.tuned : reading.cents < 0
        ? (guitar ? copy.flat : copy.chromaticFlat)
        : (guitar ? copy.sharp : copy.chromaticSharp)
    }
  }

  const action = requesting ? copy.cancelMic : paused ? copy.resumeMic : live ? copy.disableMic
    : mic.error ? copy.retryMic : copy.enableMic

  return (
    <section className={`glass tuner-panel ${reading.inTune ? 'panel-tuned' : ''}`} aria-labelledby="pitch-title">
      <header className="panel-header">
        <h2 id="pitch-title"><Activity size={19} />{copy.livePitch}</h2>
        <div className="signal" role="meter" aria-label={copy.quality} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(quality * 100)}>
          <div className="signal-bars" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((bar) => <i key={bar} className={quality > bar / 5 ? 'lit' : ''} />)}
          </div>
          <span aria-hidden="true">{copy.signal}</span>
        </div>
      </header>

      <div className="meter-body">
        <Gauge reading={reading} tolerance={tolerance} />
        {reading.note && <span className="sr-only">{copy.note} {reading.note.name}, {copy.octave} {reading.note.octave}</span>}
        <div className="cents-value" data-present={reading.cents !== null}>{cents} <span>{copy.cents}</span></div>
        <div className="pitch-feedback" role="status">
          <div className="pitch-state-slot">
            {sizingStates.map((label) => (
              <span className="pitch-state feedback-placeholder" key={label} aria-hidden="true">
                <AudioLines size={15} /><span>{label}</span>
              </span>
            ))}
            <motion.div key={state} className={`pitch-state ${reading.inTune ? 'positive' : ''}`}
              initial={reading.inTune && !reduced ? { scale: 0.96 } : false} animate={{ scale: 1 }}
              transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 440, damping: 24 }}>
              {reading.inTune ? <CircleCheck size={15} /> : <AudioLines size={15} />}
              <span>{state}</span>
            </motion.div>
          </div>
          <div className="pitch-hints">
            <p className="mic-hint" data-visible={weak} aria-hidden={!weak}>{copy.weakHint}</p>
            <p className="mic-hint" data-visible={paused} aria-hidden={!paused}>{copy.pausedHint}</p>
          </div>
        </div>
      </div>

      <dl className="measurements">
        <div><dt>{copy.measured}</dt><dd>{formatFrequency(reading.frequency)} <small>Hz</small></dd></div>
        <div>
          <dt className="target-label">
            {guitar && <span className="feedback-placeholder" aria-hidden="true">{copy.target}{' '}<span className="target-string">/ {copy.string} {stringCount}</span></span>}
            <span>{copy.target}{active !== null && <> <span className="target-string">/ {copy.string} {active}</span></>}</span>
          </dt>
          <dd>{formatFrequency(reading.target)} <small>Hz</small></dd>
        </div>
        <div><dt>{copy.reference}</dt><dd>A4 <span className="reference-divider">·</span> {reference} <small>Hz</small></dd></div>
      </dl>

      <div className="mic-controls">
        <motion.button type="button" className={`primary-button mic-button ${live ? 'mic-active' : ''}`}
          whileTap={reduced ? undefined : { scale: 0.98 }} onClick={() => live || requesting ? mic.stop() : paused ? mic.resume() : void mic.start()}>
          {live ? <MicOff size={19} /> : <Mic size={19} />}
          {action}
        </motion.button>
        {mic.error && <p className="mic-hint error" role="alert">{copy.errors[mic.error]}</p>}
      </div>
    </section>
  )
}
