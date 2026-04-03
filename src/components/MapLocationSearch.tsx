import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { searchPlaces, type GeocodeHit } from '../geocode'

type Props = {
  onNavigate: (lat: number, lng: number) => void
}

export function MapLocationSearch({ onNavigate }: Props) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<GeocodeHit[]>([])
  const abortRef = useRef<AbortController | null>(null)

  const runSearch = useCallback(async () => {
    const q = query.trim()
    if (!q) {
      setResults([])
      setError(null)
      return
    }

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    setError(null)

    try {
      const hits = await searchPlaces(q, ctrl.signal)
      if (ctrl.signal.aborted) return
      setResults(hits)
      setOpen(hits.length > 0)
      if (hits.length === 0) {
        setError('No places matched. Try a different wording.')
      }
    } catch (e) {
      if (ctrl.signal.aborted) return
      setResults([])
      setError(e instanceof Error ? e.message : 'Search could not complete.')
    } finally {
      if (!ctrl.signal.aborted) setLoading(false)
    }
  }, [query])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const pick = (hit: GeocodeHit) => {
    const lat = Number.parseFloat(hit.lat)
    const lng = Number.parseFloat(hit.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    onNavigate(lat, lng)
    setOpen(false)
    setResults([])
    setQuery(hit.display_name)
  }

  return (
    <form
      className="map-search"
      role="search"
      aria-label="Search map location"
      onSubmit={(e) => {
        e.preventDefault()
        void runSearch()
      }}
    >
      <div className="map-search__row">
        <label htmlFor={listId + '-q'} className="map-search__label">
          Search location
        </label>
        <input
          ref={inputRef}
          id={listId + '-q'}
          className="map-search__input"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setError(null)
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true)
          }}
          placeholder="Address, city, place name…"
          autoComplete="off"
          spellCheck={false}
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-autocomplete="list"
          aria-busy={loading}
        />
        <button type="submit" className="map-search__submit btn btn--primary" disabled={loading}>
          {loading ? '…' : 'Search'}
        </button>
      </div>

      {error ? (
        <p className="map-search__error" role="alert">
          {error}
        </p>
      ) : null}

      {open && results.length > 0 ? (
        <ul id={listId} className="map-search__results" role="listbox">
          {results.map((hit) => (
            <li key={`${hit.lat},${hit.lon},${hit.display_name.slice(0, 48)}`} role="none">
              <button
                type="button"
                role="option"
                className="map-search__result"
                onClick={() => pick(hit)}
              >
                {hit.display_name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="map-search__credit">
        Place search{' '}
        <a href="https://nominatim.org" target="_blank" rel="noreferrer noopener">
          Nominatim
        </a>{' '}
        ·{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer noopener">
          OpenStreetMap
        </a>
      </p>
    </form>
  )
}
