'use client'

// 開拓マップ（cluster-map.tsx）をブラウザ側だけで読み込むための中継ファイル。
// map-panel.tsx と同じ理由：Next.js 16では ssr: false をサーバー側の
// ファイルに書けないため、'use client' を付けたこのファイルを1枚挟む。

import dynamic from 'next/dynamic'
import type { ClusterSummary } from '@/lib/clusters'
import { MAP_THEME } from './map-theme'
import { useClusterJourney } from '../cluster-journey'

const ClusterMap = dynamic(() => import('./cluster-map').then((m) => m.ClusterMap), {
  ssr: false,
  loading: () => (
    <div
      className="h-[70dvh] w-full rounded-lg border border-line flex items-center justify-center text-sm"
      style={{ background: MAP_THEME.panel.bg, color: MAP_THEME.panel.muted }}
    >
      開拓マップを読み込み中...
    </div>
  ),
})

export function ClusterMapPanel({ clusters }: { clusters: ClusterSummary[] }) {
  // 確認画面は地図の枠（isolation:isolate）の外に出す。中に置くと、地図のパーツ
  // （z-index:1000）が確認画面（z-50）より手前に描かれてしまうため。
  const { start, overlay } = useClusterJourney()
  return (
    <>
      <ClusterMap clusters={clusters} onSelectCluster={start} />
      {overlay}
    </>
  )
}
