'use client'

// 地図の組み立て役。「どんなデータを、どの状態で出すか」だけを持ち、
// 見た目のパーツは同じフォルダの各ファイルに分けてある。
//
//   map-types.ts   … 扱うデータの形
//   map-theme.ts   … 配色
//   map-icons.ts   … マーカーの絵
//   map-toolbar.tsx… 上部の操作バー
//   map-overlays.tsx… 地図に重ねる検索ボックスと凡例
//   map-popups.tsx … マーカーの吹き出し
//
// このファイルはブラウザ側でのみ動く。Leafletは画面サイズなどブラウザ固有の
// 情報を使うため、サーバー側では実行できない。
// 読み込みを遅らせる指定（ssr: false）は map-panel.tsx が担当する。
//
// デザインはMulmoClaude(fugaku-36コレクション)の地図ビューを参考にしている。
// 出典: ~/mulmoclaude/data/skills/fugaku-36/views/map.html
// 元は生のHTML/CSS/Leafletで、MulmoClaude独自API（写真取得・検索）に依存する
// 部分があったため、配色・マーカー・ポップアップ・凡例の「見た目」だけを移植し、
// データの出し入れはこのアプリのSupabaseクエリ（page.tsxで取得済み）に置き換えている。

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type L from 'leaflet'

import { MAP_THEME } from './map-theme'
import { fujiIcon, markerSizeFor, numberIcon, visitIcon } from './map-icons'
import { MapToolbar } from './map-toolbar'
import { MapLegend, MapSearch } from './map-overlays'
import { FujiPopupBody, LocationPopupBody, VisitPopupBody } from './map-popups'
import type { LocationPin, SeriesFilter, VisitPoint } from './map-types'

const FUJI: [number, number] = [35.3606, 138.7274]
const INITIAL_CENTER: [number, number] = [35.4, 138.9]
const INITIAL_ZOOM = 7
const MAX_SEARCH_RESULTS = 8

// ズームに応じてマーカーの大きさを変えるため、現在のズームを拾う
function ZoomWatcher({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) })
  return null
}

// 検索結果をクリックしたときに地図を移動させる。
// 地図の移動は「描画のついで」ではなく useEffect で行う。描画の途中で flyTo を
// 呼ぶと、ズームやフィルタ切替など別の理由で再描画されるたびに再実行され、
// 直前に検索した地点へ地図が引き戻されてしまう。
function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 11), { duration: 0.6 })
  }, [target, map])
  return null
}

function matchesQuery(location: LocationPin, query: string) {
  return (
    String(location.number) === query ||
    location.title_jp.includes(query) ||
    (location.title_en ?? '').toLowerCase().includes(query.toLowerCase()) ||
    (location.modern_location ?? '').includes(query)
  )
}

export function MapView({
  locations,
  visitedLocationIds,
  visitPoints,
}: {
  locations: LocationPin[]
  visitedLocationIds: string[]
  visitPoints: VisitPoint[]
}) {
  const [filter, setFilter] = useState<SeriesFilter>('all')
  const [showFuji, setShowFuji] = useState(false)
  const [showVisit, setShowVisit] = useState(false)
  const [zoom, setZoom] = useState(INITIAL_ZOOM)
  const [query, setQuery] = useState('')
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null)

  // useMemoで包まないと、検索ボックスに1文字打つたびにSetと配列が作り直され、
  // それを依存に持つ下のuseMemoも道連れで無効になる（＝メモ化が効かない）。
  const visited = useMemo(() => new Set(visitedLocationIds), [visitedLocationIds])
  const placed = useMemo(
    () => locations.filter((l) => l.latitude !== null && l.longitude !== null),
    [locations]
  )

  const filtered = useMemo(
    () => (filter === 'all' ? placed : placed.filter((l) => l.series === filter)),
    [placed, filter]
  )

  const visitedCount = useMemo(
    () => placed.filter((l) => visited.has(l.id)).length,
    [placed, visited]
  )

  const size = markerSizeFor(zoom)

  // マーカーのアイコンは地点ごとに一度だけ作る。以前は描画のたびに46個分の
  // divIconを作り直していたため、検索ボックスの1打鍵ごとに全マーカーが
  // 作り直されていた。見た目は「訪問済みか」と「大きさ」だけで変わるので、
  // それが変わったときだけ作り直せばよい。
  const icons = useMemo(() => {
    const byLocationId = new Map<string, L.DivIcon>()
    for (const l of placed) {
      byLocationId.set(l.id, numberIcon(l.number, visited.has(l.id), size))
    }
    return byLocationId
  }, [placed, visited, size])

  const searchResults = useMemo(() => {
    const q = query.trim()
    if (!q) return []
    return placed.filter((l) => matchesQuery(l, q)).slice(0, MAX_SEARCH_RESULTS)
  }, [placed, query])

  return (
    <div className="rounded-lg overflow-hidden border" style={{ background: MAP_THEME.panel.bg }}>
      <MapToolbar
        filter={filter}
        onFilterChange={setFilter}
        showFuji={showFuji}
        onToggleFuji={() => setShowFuji((v) => !v)}
        showVisit={showVisit}
        onToggleVisit={() => setShowVisit((v) => !v)}
        shownCount={filtered.length}
        visitedCount={visitedCount}
      />

      <div className="relative">
        <MapSearch
          query={query}
          onQueryChange={setQuery}
          results={searchResults}
          onSelect={(l) => {
            setFlyTarget([Number(l.latitude), Number(l.longitude)])
            setQuery(l.title_jp)
          }}
        />

        <MapContainer center={INITIAL_CENTER} zoom={INITIAL_ZOOM} style={{ height: '70vh', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <ZoomWatcher onZoom={setZoom} />
          <FlyTo target={flyTarget} />

          {filtered.map((l) => (
            <Marker
              key={l.id}
              position={[Number(l.latitude), Number(l.longitude)]}
              icon={icons.get(l.id)}
            >
              <Popup minWidth={200} maxWidth={220}>
                <LocationPopupBody location={l} visited={visited.has(l.id)} />
              </Popup>
            </Marker>
          ))}

          {showFuji && (
            <Marker position={FUJI} icon={fujiIcon}>
              <Popup>
                <FujiPopupBody />
              </Popup>
            </Marker>
          )}

          {showVisit &&
            visitPoints.map((v) => (
              <Marker key={v.id} position={[v.latitude, v.longitude]} icon={visitIcon}>
                <Popup>
                  <VisitPopupBody point={v} />
                </Popup>
              </Marker>
            ))}
        </MapContainer>

        <MapLegend />
      </div>
    </div>
  )
}
