'use client'

// ダッシュボードに置く開拓マップ。
//
// /map の訪問地図（map-view.tsx）とは別物として、ツールバー・検索・
// 46個のピンを持たず、クラスタの円だけを出す。ダッシュボードで見たいのは
// 「どのあたりがどれだけ進んだか」だけで、個々の地点を探す画面ではないため。
//
// 円の描き方そのものは map-clusters.tsx を /map と共有している。
//
// Leafletはブラウザ固有の情報を使うのでサーバー側では動かない。
// 読み込みを遅らせる指定（ssr: false）は cluster-map-panel.tsx が担当する。

import { useState } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

import type { ClusterStatus, ClusterSummary } from '@/lib/clusters'
import { MAP_THEME } from './map-theme'
import { ClusterLayer } from './map-clusters'
import { ClusterLegend } from './map-overlays'
import { PillButton } from './map-toolbar'

// 46図がほぼ収まる範囲。/map の初期表示と揃えてある
const INITIAL_CENTER: [number, number] = [35.4, 138.9]
const INITIAL_ZOOM = 7

const STATUS_LABEL: { status: ClusterStatus; label: string }[] = [
  { status: 'none', label: '未踏' },
  { status: 'partial', label: '開拓中' },
  { status: 'complete', label: '制覇' },
]

export function ClusterMap({ clusters }: { clusters: ClusterSummary[] }) {
  const visited = clusters.reduce((sum, c) => sum + c.visited, 0)
  const total = clusters.reduce((sum, c) => sum + c.total, 0)

  // 初期は全部表示。「未踏だけ見たい」ときは他の2つを消す使い方を想定している
  const [visibleStatuses, setVisibleStatuses] = useState<ReadonlySet<ClusterStatus>>(
    new Set(['none', 'partial', 'complete'])
  )

  function toggleStatus(status: ClusterStatus) {
    setVisibleStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  const shownCount = clusters.filter((c) => visibleStatuses.has(c.status)).length

  return (
    <div className="rounded-lg overflow-hidden border border-line" style={{ background: MAP_THEME.panel.bg }}>
      <div
        className="flex items-center justify-between px-4 py-2 text-sm"
        style={{ borderBottom: `1px solid ${MAP_THEME.panel.divider}`, color: MAP_THEME.panel.title }}
      >
        <span style={{ letterSpacing: '0.1em' }}>開拓マップ</span>
        <span className="text-xs tabular-nums" style={{ color: MAP_THEME.panel.muted }}>
          開拓 {visited}/{total}景
        </span>
      </div>

      <div
        className="flex items-center gap-2 px-4 py-2 flex-wrap"
        style={{ borderBottom: `1px solid ${MAP_THEME.panel.divider}` }}
      >
        {STATUS_LABEL.map(({ status, label }) => (
          <PillButton
            key={status}
            active={visibleStatuses.has(status)}
            onClick={() => toggleStatus(status)}
          >
            {label}
          </PillButton>
        ))}
        <span className="text-xs ml-auto tabular-nums" style={{ color: MAP_THEME.panel.muted }}>
          {shownCount}/{clusters.length}クラスタ
        </span>
      </div>

      <div className="relative">
        <MapContainer center={INITIAL_CENTER} zoom={INITIAL_ZOOM} style={{ height: '55vh', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <ClusterLayer clusters={clusters} visibleStatuses={visibleStatuses} />
        </MapContainer>

        <ClusterLegend />
      </div>
    </div>
  )
}
