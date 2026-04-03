import { useEffect } from 'react'
import L from 'leaflet'
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import type { RobberyReport } from '../types'

const draftIcon = L.divIcon({
  className: 'draft-marker-wrap',
  html: '<div class="draft-pin" aria-hidden="true"><span class="draft-pin__dot"></span></div>',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
})

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      onMapClick(lat, lng)
    },
  })
  return null
}

function FlyToRequest({
  target,
}: {
  target: { lat: number; lng: number; nonce: number } | null
}) {
  const map = useMap()
  useEffect(() => {
    if (!target) return
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 15), { duration: 0.9 })
  }, [map, target])
  return null
}

type Props = {
  reports: RobberyReport[]
  highlightId: string | null
  draft: { lat: number; lng: number } | null
  onPickLocation: (lat: number, lng: number) => void
  onSelectReport: (id: string) => void
  flyTo: { lat: number; lng: number; nonce: number } | null
}

export function RobberyMap({
  reports,
  highlightId,
  draft,
  onPickLocation,
  onSelectReport,
  flyTo,
}: Props) {
  const center: LatLngExpression = [20, 0]

  return (
    <MapContainer
      center={center}
      zoom={2}
      minZoom={2}
      className="robbery-map__leaflet"
      scrollWheelZoom
      worldCopyJump
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler onMapClick={onPickLocation} />
      <FlyToRequest target={flyTo} />

      {reports.map((r) => (
        <CircleMarker
          key={r.id}
          center={[r.lat, r.lng]}
          radius={highlightId === r.id ? 12 : 8}
          pathOptions={{
            color: '#b91c1c',
            fillColor: '#ef4444',
            fillOpacity: 0.85,
            weight: 2,
          }}
        >
          <Popup>
            <div className="map-popup">
              <strong className="map-popup__title">{r.title || 'Robbery incident'}</strong>
              <p className="map-popup__when">
                {new Date(r.occurredAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
              <p className="map-popup__text">{r.description}</p>
              <button type="button" className="map-popup__focus" onClick={() => onSelectReport(r.id)}>
                Show in list
              </button>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {draft ? (
        <Marker position={[draft.lat, draft.lng]} icon={draftIcon}>
          <Popup>
            <span className="map-popup__hint">
              Selected location. Use the form in the sidebar to submit this report.
            </span>
          </Popup>
        </Marker>
      ) : null}
    </MapContainer>
  )
}
