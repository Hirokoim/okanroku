'use client'

// 地図タブの中身。「地図」と「作品一覧」を切り替える。
// どちらも同じ地点（いま選んでいる人物の作品）のデータを別の見せ方で出すもので、
// ナビのタブを増やさずに済むよう地図タブの中に置いている。

import { useState } from 'react'
import { useFigureMeta } from '../figure-context'
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
  const figure = useFigureMeta()
  const [view, setView] = useState<View>('map')
  // クラスタの絞り込みは地図と作品一覧で共有する（地図で絞った状態のまま一覧に切り替えられるように）
  const [clusterFilter, setClusterFilter] = useState<string | null>(initialCluster)
  const galleryLocations = clusterFilter ? locations.filter((l) => l.cluster === clusterFilter) : locations

  // 進み具合。地図にも作品一覧にも共通なので、切り替えの上に1回だけ出す
  const visited = new Set(visitedLocationIds)
  const visitedCount = locations.filter((l) => visited.has(l.id)).length
  const percent = locations.length === 0 ? 0 : Math.round((visitedCount / locations.length) * 100)

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-sumi-2 px-4 py-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-nami-dim">{figure.work || figure.name}</span>
          <span className="text-xs text-nami-dim">
            <span className="text-xl font-bold text-hi tabular-nums">{visitedCount}</span>
            <span className="mx-0.5">/</span>
            {locations.length}
            {figure.unit}
          </span>
        </div>
        <div
          className="h-2 rounded-full bg-sumi-3 mt-2 overflow-hidden"
          role="progressbar"
          aria-label={`訪問した${figure.unit}の割合`}
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-hi" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {/* 地図／作品一覧の切り替え。1つにつながったボタンにして「同じものの見せ方違い」と分かるようにする */}
      <div className="grid grid-cols-2 rounded-full bg-sumi-2 p-1" role="group" aria-label="表示の切り替え">
        {VIEWS.map((v) => (
          <button
            key={v.value}
            type="button"
            aria-pressed={view === v.value}
            onClick={() => setView(v.value)}
            className={`text-sm rounded-full py-2 font-body font-semibold transition-colors ${
              view === v.value ? 'bg-hi text-washi' : 'text-nami-dim'
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
          clusterFilter={clusterFilter}
          onClusterFilterChange={setClusterFilter}
        />
      ) : (
        <LocationGallery
          locations={galleryLocations}
          visitedLocationIds={visitedLocationIds}
          clusterFilter={clusterFilter}
          onClearClusterFilter={() => setClusterFilter(null)}
        />
      )}
    </div>
  )
}
