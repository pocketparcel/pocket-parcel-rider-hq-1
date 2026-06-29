export const DEFAULT_MAP_CENTER = { lat: 20.5937, lng: 78.9629 }
export const DEFAULT_MAP_ZOOM = 12

export const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }

export const MAP_OPTIONS = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
}

export function createRiderMarkerIcon(heading, color = '#ff8a22') {
  if (!window.google?.maps?.SymbolPath) return undefined

  return {
    path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
    scale: 6,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 1.5,
    rotation: Number.isFinite(heading) ? heading : 0,
  }
}

export function createPointMarkerIcon(color, scale = 8) {
  if (!window.google?.maps?.SymbolPath) return undefined

  return {
    path: window.google.maps.SymbolPath.CIRCLE,
    scale,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
  }
}

export function fitMapToPoints(map, points, padding = 64) {
  if (!map || !window.google?.maps || !points.length) return

  const bounds = new window.google.maps.LatLngBounds()
  for (const point of points) {
    if (point?.lat != null && point?.lng != null) {
      bounds.extend({ lat: Number(point.lat), lng: Number(point.lng) })
    }
  }
  map.fitBounds(bounds, padding)
}
