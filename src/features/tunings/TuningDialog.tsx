import { useState } from 'react'
import { Check, ChevronLeft, Plus, Search, Star } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { useCopy } from '../../locales'
import { usePreferences } from '../../stores/preferences'
import { midiToFrequency, noteParts, SHARPS } from '../tuner/music'
import { categories, tuningNotes, type Category, type Tuning } from './tunings'

type Filter = Category | 'favorites' | 'all'
const octaves = [1, 2, 3, 4, 5, 6, 7]

export function TuningDialog({ tunings, current, onChoose, onClose }: {
  tunings: readonly Tuning[]
  current: Tuning
  onChoose: (id: string) => void
  onClose: () => void
}) {
  const copy = useCopy()
  const favorites = usePreferences((state) => state.favorites)
  const toggleFavorite = usePreferences((state) => state.toggleFavorite)
  const { accidental, reference } = usePreferences((state) => state.preferences)
  const addTuning = usePreferences((state) => state.addTuning)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [lowest, ...higher] = current.notes
  const [draft, setDraft] = useState<[number, ...number[]]>([lowest, ...higher])
  const normalized = query.trim().toLocaleLowerCase().replaceAll('♯', '#').replaceAll('♭', 'b')
  const matches = tunings.filter((tuning) => {
    if (filter === 'favorites' && !favorites.includes(tuning.id)) return false
    if (filter !== 'all' && filter !== 'favorites' && tuning.category !== filter) return false
    return [tuning.name, ...(tuning.aliases ?? [])].some((title) =>
      title.toLocaleLowerCase().replaceAll('♯', '#').replaceAll('♭', 'b').includes(normalized))
  })

  function replaceNote(index: number, midi: number) {
    setDraft(([first, ...rest]) => {
      if (index === 0) return [midi, ...rest]
      rest[index - 1] = midi
      return [first, ...rest]
    })
  }

  return (
    <Modal title={editing ? copy.newTuning : copy.tunings} onClose={onClose}>
      {editing ? <form className="tuning-editor" onSubmit={(event) => {
        event.preventDefault()
        if (!name.trim()) return
        addTuning({ id: `custom-${crypto.randomUUID?.() ?? Date.now()}`, name: name.trim(), category: 'custom', notes: draft })
        onClose()
      }}>
        <div className="modal-scroll editor-scroll">
          <button type="button" className="text-button back-button" onClick={() => setEditing(false)}><ChevronLeft size={17} />{copy.back}</button>
          <label className="editor-name">{copy.tuningName}
            <input autoFocus required maxLength={48} value={name} onChange={(event) => setName(event.target.value)} placeholder={copy.tuningPlaceholder} />
          </label>
          {draft.map((midi, index) => {
            const octave = noteParts(midi, accidental).octave
            const pitchClass = midi % 12
            const number = draft.length - index
            const allowed = (value: number) => {
              const hz = midiToFrequency(value, reference)
              return hz >= 40 && hz <= 2000
            }
            return (
              <div className="editor-row" key={index}>
                <span>{copy.string} {number}</span>
                <select aria-label={`${copy.string} ${number}: ${copy.note}`} value={pitchClass}
                  onChange={(event) => replaceNote(index, (octave + 1) * 12 + Number(event.target.value))}>
                  {SHARPS.map((_, pitch) => <option key={pitch} value={pitch} disabled={!allowed((octave + 1) * 12 + pitch)}>{noteParts(pitch, accidental).name}</option>)}
                </select>
                <select aria-label={`${copy.string} ${number}: ${copy.octave}`} value={octave}
                  onChange={(event) => replaceNote(index, (Number(event.target.value) + 1) * 12 + pitchClass)}>
                  {octaves.map((option) => <option key={option} value={option} disabled={!allowed((option + 1) * 12 + pitchClass)}>{option}</option>)}
                </select>
              </div>
            )
          })}
        </div>
        <footer className="modal-footer"><button type="submit" className="primary-button" disabled={!name.trim()}>{copy.saveTuning}</button></footer>
      </form> : <>
        <div className="tuning-search">
          <label className="search-field"><Search size={18} />
            <input type="search" aria-label={copy.search} placeholder={copy.search} value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <div className="filters" role="group" aria-label={copy.tunings}>
            {(['all', 'favorites', ...categories] as const).map((value) => (
              <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
                {value === 'all' ? copy.tunings : value === 'favorites' ? copy.favorites : copy.categories[value]}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-scroll tuning-results">
          {matches.length === 0 && <p className="empty-state" role="status">{copy.noTunings}</p>}
          {categories.map((category) => {
            const group = matches.filter((tuning) => tuning.category === category)
            if (!group.length) return null
            return <section className="tuning-group" key={category}>
              <h3>{copy.categories[category]}</h3>
              {group.map((tuning) => {
                const favorite = favorites.includes(tuning.id)
                const selected = current.id === tuning.id
                return <div key={tuning.id} className="tuning-result" data-selected={selected}>
                  <button type="button" className="choose-tuning" aria-pressed={selected} onClick={() => onChoose(tuning.id)}>
                    <span><strong>{tuning.name}</strong>{tuning.id === 'd-standard' && <small className="alias"> · Full Step Down</small>}
                      <small className="note-sequence">{tuningNotes(tuning, accidental)}</small></span>
                    {selected && <Check size={19} />}
                  </button>
                  <button type="button" className="icon-button favorite-button" aria-pressed={favorite}
                    aria-label={`${favorite ? copy.unfavorite : copy.favorite}: ${tuning.name}`} onClick={() => toggleFavorite(tuning.id)}><Star size={18} /></button>
                </div>
              })}
            </section>
          })}
        </div>
        <footer className="modal-footer">
          <button type="button" className="primary-button" onClick={() => setEditing(true)}><Plus size={19} />{copy.newTuning}</button>
        </footer>
      </>}
    </Modal>
  )
}
