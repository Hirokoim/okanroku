'use client'

// 地図本体（map-view.tsx）をブラウザ側だけで読み込むための中継ファイル。
//
// Next.js 16では ssr: false をサーバー側のファイルに書けない。
// （公式ドキュメント：ssr: false is not allowed with next/dynamic in Server Components）
// そのため、この 'use client' を付けたファイルを1枚挟んでいる。

import dynamic from 'next/dynamic'
import type { LocationPin, VisitPoint } from './map-types'

const MapView = dynamic(() => import('./map-view').then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="h-[70dvh] w-full rounded-xl bg-sumi-2 flex items-center justify-center text-nami-dim text-sm">
      地図を読み込み中...
    </div>
  ),
})

export function MapPanel({
  locations,
  visitedLocationIds,
  visitPoints,
  clusterFilter,
  onClusterFilterChange,
}: {
  locations: LocationPin[]
  visitedLocationIds: string[]
  visitPoints: VisitPoint[]
  clusterFilter: string | null
  onClusterFilterChange: (cluster: string | null) => void
}) {
  return (
    <MapView
      locations={locations}
      visitedLocationIds={visitedLocationIds}
      visitPoints={visitPoints}
      clusterFilter={clusterFilter}
      onClusterFilterChange={onClusterFilterChange}
    />
  )
}
