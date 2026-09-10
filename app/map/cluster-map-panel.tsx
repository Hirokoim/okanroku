'use client'

// 開拓マップ（cluster-map.tsx）をブラウザ側だけで読み込むための中継ファイル。
// map-panel.tsx と同じ理由：Next.js 16では ssr: false をサーバー側の
// ファイルに書けないため、'use client' を付けたこのファイルを1枚挟む。

import dynamic from 'next/dynamic'
import type { ClusterSummary } from '@/lib/clusters'
import { MAP_THEME } from './map-theme'

const ClusterMap = dynamic(() => import('./cluster-map').then((m) => m.ClusterMap), {
  ssr: false,
  loading: () => (
    <div
      className="h-[55vh] w-full rounded-lg border border-line flex items-center justify-center text-sm"
      style={{ background: MAP_THEME.panel.bg, color: MAP_THEME.panel.muted }}
    >
      開拓マップを読み込み中...
    </div>
  ),
})

export function ClusterMapPanel({ clusters }: { clusters: ClusterSummary[] }) {
  return <ClusterMap clusters={clusters} />
}
