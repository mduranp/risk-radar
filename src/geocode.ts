export type GeocodeHit = {
  display_name: string
  lat: string
  lon: string
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<GeocodeHit[]> {
  const q = query.trim()
  if (!q) return []

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '5')

  const res = await fetch(url.toString(), {
    signal,
    headers: {
      Accept: 'application/json',
      'Accept-Language': typeof navigator !== 'undefined' ? navigator.language : 'en',
    },
  })

  if (!res.ok) {
    throw new Error(`Search failed (${res.status})`)
  }

  const data: unknown = await res.json()
  if (!Array.isArray(data)) return []

  return data
    .map((row): GeocodeHit | null => {
      if (
        row &&
        typeof row === 'object' &&
        'display_name' in row &&
        'lat' in row &&
        'lon' in row &&
        typeof (row as GeocodeHit).display_name === 'string' &&
        typeof (row as GeocodeHit).lat === 'string' &&
        typeof (row as GeocodeHit).lon === 'string'
      ) {
        return row as GeocodeHit
      }
      return null
    })
    .filter((x): x is GeocodeHit => x !== null)
}
