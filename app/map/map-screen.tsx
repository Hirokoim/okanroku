'use client'

// 地図タブの中身。「地図」と「作品一覧」を切り替える。
// どちらも同じ46景のデータを別の見せ方で出すもので、ナビのタブを増やさずに済むよう
// 地図タブの中に置いている。

import { useState } from 'react'
import { LocationGallery } from './location-gallery'
import { MapPanel } from './map-panel'
import type { LocationPin, VisitPoint } from './map-types'

type View = 'map' | 'gallery'

const VIEWS: { value: View; label: string }[] = [
  { value: 'map', label: '地図' },
  { value: 'gallery', label: '作品一覧' },
]

export function MapScreen({
  locations,
  visitedLocationIds,
  visitPoints,
  initialCluster,
}: {
  locations: LocationPin[]
  visitedLocationIds: string[]
  visitPoints: VisitPoint[]
  initialCluster: string | null
}) {
  const [view, setView] = useState<View>('map')

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.value}
            type="button"
            aria-pressed={view === v.value}
            onClick={() => setView(v.value)}
            className={`text-sm rounded-full px-4 py-2 font-body font-semibold transition-colors ${
              view === v.value ? 'bg-hi text-nami' : 'border border-line text-nami-dim'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === 'map' ? (
        <MapPanel
          locations={locations}
          visitedLocationIds={visitedLocationIds}
          visitPoints={visitPoints}
          initialCluster={initialCluster}
        />
      ) : (
        <LocationGallery locations={locations} visitedLocationIds={visitedLocationIds} />
      )}
    </div>
  )
}
