import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import { MapLocationSearch } from './components/MapLocationSearch'
import { RobberyMap } from './components/RobberyMap'
import { formatDbError } from './dbError'
import { fetchReports, insertReport, subscribeToNewReports } from './reportsApi'
import { isSupabaseConfigured } from './supabaseClient'
import type { RobberyReport } from './types'
import './fixLeafletIcons'

function mergeIncoming(prev: RobberyReport[], incoming: RobberyReport): RobberyReport[] {
  if (prev.some((r) => r.id === incoming.id)) return prev
  return [...prev, incoming].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function App() {
  const [reports, setReports] = useState<RobberyReport[]>([])
  const [reportsLoad, setReportsLoad] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [reportsError, setReportsError] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [occurredAt, setOccurredAt] = useState(() => toDatetimeLocalValue(new Date()))
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; nonce: number } | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setReportsLoad('error')
      setReportsError(
        'Supabase URL and anon key are missing. Copy .env.example to .env (or .env.local) in the project root — Vite does not load .env.example. Restart npm run dev, then ensure supabase/schema.sql was run in the Supabase SQL editor.',
      )
      return
    }

    let cancelled = false
    setReportsLoad('loading')
    setReportsError(null)

    fetchReports()
      .then((data) => {
        if (cancelled) return
        setReports(data)
        setReportsLoad('ready')
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setReportsLoad('error')
        setReportsError(e instanceof Error ? e.message : formatDbError(e))
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    return subscribeToNewReports((report) => {
      setReports((prev) => mergeIncoming(prev, report))
    })
  }, [])

  const onPickLocation = useCallback((lat: number, lng: number) => {
    setDraft({ lat, lng })
    setFormError(null)
  }, [])

  const submitReport = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!isSupabaseConfigured()) {
        setFormError('Database is not configured. Set Supabase environment variables.')
        return
      }
      if (!draft) {
        setFormError('Click the map to choose where the incident happened.')
        return
      }
      const trimmed = description.trim()
      if (trimmed.length < 8) {
        setFormError('Please add a short description (at least 8 characters).')
        return
      }
      const occurred = new Date(occurredAt)
      if (Number.isNaN(occurred.getTime())) {
        setFormError('Pick a valid date and time for the incident.')
        return
      }

      const report: RobberyReport = {
        id: crypto.randomUUID(),
        lat: draft.lat,
        lng: draft.lng,
        title: title.trim(),
        description: trimmed,
        occurredAt: occurred.toISOString(),
        createdAt: new Date().toISOString(),
      }

      setSubmitting(true)
      setFormError(null)
      try {
        await insertReport(report)
        setReports((prev) => mergeIncoming(prev, report))
        setDraft(null)
        setTitle('')
        setDescription('')
        setOccurredAt(toDatetimeLocalValue(new Date()))
        setHighlightId(report.id)
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Could not save the report.')
      } finally {
        setSubmitting(false)
      }
    },
    [draft, description, occurredAt, title],
  )

  const focusReport = useCallback((r: RobberyReport) => {
    setHighlightId(r.id)
    setFlyTo({ lat: r.lat, lng: r.lng, nonce: Date.now() })
  }, [])

  const searchNavigate = useCallback((lat: number, lng: number) => {
    setHighlightId(null)
    setFlyTo({ lat, lng, nonce: Date.now() })
  }, [])

  const sortedReports = useMemo(
    () => [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reports],
  )

  const configMissing = reportsLoad === 'error' && !isSupabaseConfigured()

  return (
    <div className="app">
      <aside className="app__sidebar" aria-label="Reports and form">
        <header className="app__header">
          <h1 className="app__title">Robbery incident map</h1>
          <p className="app__lede">
            Click anywhere on the map to place a marker, then describe what happened. Reports are saved to a shared
            database so everyone sees the same list.
          </p>
        </header>

        {configMissing ? (
          <p className="app__banner app__banner--warn" role="status">
            {reportsError}
          </p>
        ) : reportsLoad === 'error' && reportsError ? (
          <p className="app__banner app__banner--warn" role="alert">
            {reportsError}
          </p>
        ) : null}

        <form className="report-form" onSubmit={submitReport} noValidate>
          <h2 className="report-form__heading">New report</h2>
          {draft ? (
            <p className="report-form__coords">
              Location: {draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}
            </p>
          ) : (
            <p className="report-form__coords report-form__coords--muted">No location selected yet.</p>
          )}

          <label className="field">
            <span className="field__label">Title (optional)</span>
            <input
              className="field__input"
              type="text"
              value={title}
              onChange={(ev) => setTitle(ev.target.value)}
              placeholder="e.g. Street robbery near station"
              maxLength={120}
              autoComplete="off"
              disabled={submitting || configMissing}
            />
          </label>

          <label className="field">
            <span className="field__label">When it happened</span>
            <input
              className="field__input"
              type="datetime-local"
              value={occurredAt}
              onChange={(ev) => setOccurredAt(ev.target.value)}
              required
              disabled={submitting || configMissing}
            />
          </label>

          <label className="field">
            <span className="field__label">What happened</span>
            <textarea
              className="field__input field__textarea"
              value={description}
              onChange={(ev) => setDescription(ev.target.value)}
              placeholder="Describe the incident. Do not include personal identifying details of victims unless appropriate."
              rows={4}
              required
              minLength={8}
              disabled={submitting || configMissing}
            />
          </label>

          {formError ? (
            <p className="report-form__error" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="report-form__actions">
            <button type="submit" className="btn btn--primary" disabled={submitting || configMissing}>
              {submitting ? 'Saving…' : 'Submit report'}
            </button>
            {draft ? (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setDraft(null)}
                disabled={submitting}
              >
                Clear marker
              </button>
            ) : null}
          </div>
        </form>

        <section className="recent" aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="recent__title">
            Reports ({reports.length})
          </h2>
          {reportsLoad === 'loading' ? (
            <p className="recent__empty">Loading reports…</p>
          ) : sortedReports.length === 0 ? (
            <p className="recent__empty">No reports yet. Add one from the map.</p>
          ) : (
            <ul className="recent__list">
              {sortedReports.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className={`recent__item${highlightId === r.id ? ' recent__item--active' : ''}`}
                    onClick={() => focusReport(r)}
                  >
                    <span className="recent__item-title">{r.title || 'Robbery incident'}</span>
                    <span className="recent__item-meta">
                      {new Date(r.occurredAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                    <span className="recent__item-preview">{r.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>

      <main className="app__map" aria-label="Map — click to choose location">
        <MapLocationSearch onNavigate={searchNavigate} />
        <RobberyMap
          reports={reports}
          highlightId={highlightId}
          draft={draft}
          onPickLocation={onPickLocation}
          onSelectReport={(id) => {
            const r = reports.find((x) => x.id === id)
            if (r) focusReport(r)
          }}
          flyTo={flyTo}
        />
      </main>
    </div>
  )
}

export default App

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = d.getFullYear()
  const m = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const h = pad(d.getHours())
  const min = pad(d.getMinutes())
  return `${y}-${m}-${day}T${h}:${min}`
}
