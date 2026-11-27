import { motion, useReducedMotion } from 'motion/react'
import { useId, type CSSProperties } from 'react'
import type { Reading } from './useReading'

const indices = Array.from({ length: 41 }, (_, index) => index)
const labels = [-50, -25, 0, 25, 50]
const center = { x: 220, y: 184 }
function point(radius: number, step: number) {
  const angle = (-110 + 220 * step) * Math.PI / 180
  return { x: center.x + radius * Math.sin(angle), y: center.y - radius * Math.cos(angle) }
}

function arc(radius: number, from: number, to: number) {
  const a = point(radius, from)
  const b = point(radius, to)
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${to - from > 180 / 220 ? 1 : 0} 1 ${b.x} ${b.y}`
}

export function Gauge({ reading, tolerance }: { reading: Reading; tolerance: number }) {
  const id = useId()
  const reduced = useReducedMotion()
  const cents = reading.cents ?? 0
  const rotation = Math.min(50, Math.max(-50, cents)) * 2.2
  const tuneStart = (50 - tolerance) / 100
  const tuneEnd = (50 + tolerance) / 100

  return (
    <div className={`gauge ${reading.inTune ? 'gauge-tuned' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 440 264" className="gauge-face">
        <defs>
          <linearGradient id={id} x1="0%" x2="100%">
            <stop offset="0%" stopColor="var(--dial-edge)" stopOpacity=".25" />
            <stop offset="50%" stopColor="var(--dial-edge)" stopOpacity=".85" />
            <stop offset="100%" stopColor="var(--dial-edge)" stopOpacity=".25" />
          </linearGradient>
        </defs>
        <path d={arc(162, 0, 1)} stroke={`url(#${id})`} strokeWidth="1.5" fill="none" />
        <path className="tune-arc-shadow" d={arc(162, tuneStart, tuneEnd)} strokeWidth="8" fill="none" strokeLinecap="round" />
        <path className="tune-arc" d={arc(162, tuneStart, tuneEnd)} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {indices.map((index) => {
          const major = index % 10 === 0
          const a = point(151, index / 40)
          const b = point(major ? 137 : index % 2 === 0 ? 141 : 145, index / 40)
          return <line key={index} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            className={index === 20 ? 'tick center-tick' : major ? 'tick major-tick' : 'tick'} strokeWidth={major ? 2 : 1.4} strokeLinecap="round" />
        })}
        {labels.map((label, index) => {
          const position = point(119, index / 4)
          return <text key={label} x={position.x} y={position.y + 4}
            className={label === 0 ? 'scale-label scale-center' : 'scale-label'} textAnchor="middle">
            {label > 0 ? `+${label}` : String(label).replace('-', '−')}
          </text>
        })}
      </svg>
      <motion.div className="needle" style={{ '--dial-origin': '69.697%' } as CSSProperties}
        animate={{ rotate: rotation }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 290, damping: 28 }}>
        <span />
      </motion.div>
      <div className="gauge-note">
        <span>{reading.note?.name ?? '—'}</span>
        {reading.note && <sub>{reading.note.octave}</sub>}
      </div>
    </div>
  )
}
