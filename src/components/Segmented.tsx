import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

type Option<T> = { value: T; label: string; icon?: ReactNode }

export function Segmented<T extends string>({ id, label, options, value, onChange, className = '' }: {
  id: string
  label: string
  options: readonly Option<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  const reduced = useReducedMotion()

  return (
    <div className={`segmented ${className}`} role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={option.value === value} onClick={() => onChange(option.value)}>
          {option.value === value && (
            <motion.span className="segment-fill" layoutId={id}
              transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 430, damping: 36 }} />
          )}
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  )
}
