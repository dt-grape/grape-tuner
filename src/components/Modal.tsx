import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { motion, useDragControls, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { useCopy } from '../locales'

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const copy = useCopy()
  const ref = useRef<HTMLDialogElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const id = useId()
  const reduced = useReducedMotion()
  const drag = useDragControls()

  useEffect(() => {
    const dialog = ref.current
    const focused = document.activeElement
    const previousOverflow = document.body.style.overflow
    dialog?.showModal()
    titleRef.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.body.style.overflow = previousOverflow
      if (focused instanceof HTMLElement && focused.isConnected) focused.focus()
    }
  }, [])

  return (
    <dialog ref={ref} className="modal-shell" aria-labelledby={id}
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => { if (event.currentTarget === event.target) onClose() }}>
      <motion.section className="glass modal" initial={{ opacity: 0, y: reduced ? 0 : 24, scale: reduced ? 1 : 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: reduced ? 0 : 24, scale: reduced ? 1 : 0.985 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 37 }}
        drag="y" dragListener={false} dragControls={drag} dragMomentum={false}
        dragConstraints={{ top: 0, bottom: 0 }} dragElastic={reduced ? 0 : { top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => { if (info.offset.y > 85 || (info.offset.y > 24 && info.velocity.y > 500)) onClose() }}>
        <div className="sheet-handle" aria-hidden="true" onPointerDown={(event) => drag.start(event)} />
        <header className="modal-header">
          <h2 id={id} ref={titleRef} tabIndex={-1}>{title}</h2>
          <button type="button" className="icon-button" aria-label={copy.close} onClick={onClose}><X size={19} /></button>
        </header>
        {children}
      </motion.section>
    </dialog>
  )
}
