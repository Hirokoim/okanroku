'use client'

// このファイルはブラウザ側でのみ動く。
// Leafletは画面サイズなどブラウザ固有の情報を使うため、サーバー側では実行できない。
// 読み込みを遅らせる指定（ssr: false）は map-panel.tsx が担当する。
//
// デザインはMulmoClaude(fugaku-36コレクション)の地図ビューを参考にしている。
// 出典: ~/mulmoclaude/data/skills/fugaku-36/views/map.html
// 元は生のHTML/CSS/Leafletで、MulmoClaude独自API（写真取得・検索）に依存する
// 部分があったため、配色・マーカー・ポップアップ・凡例の「見た目」だけを移植し、
// データの出し入れはこのアプリのSupabaseクエリ（page.tsxで取得済み）に置き換えている。

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

export type LocationPin = {
  id: string
  number: number
  title_jp: string
  title_en: string | null
  series: string | null
  prefecture: string | null
  modern_location: string | null
  cluster: string | null
  latitude: number | null
  longitude: number | null
  accessibility_class: string | null
}

export type VisitPoint = {
  id: string
  latitude: number
  longitude: number
  taken_at: string | null
  number: number
  title_jp: string
}

const FUJI: [number, number] = [35.3606, 138.7274]

// 富士の見え方（保存値）→ 表示ラベルと色。requirements.md 5-E②の対応表と揃えてある。
const ACCESSIBILITY_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  visible: { label: '見える富士', color: '#60a0e0', bg: '#1a3a60' },
  not_visible: { label: '見えない富士', color: '#e06060', bg: '#3a1a10' },
  imagined: { label: '心の中の富士', color: '#c080e0', bg: '#2a1a3a' },
  unjudged: { label: '未判定', color: '#909090', bg: '#2a2a2a' },
}

// 番号入りの丸バッジマーカー。訪問済みかどうかで色を変える。
function numberIcon(number: number, visited: boolean, size: number) {
  const bg = visited ? '#6aaa40' : '#e8c87a'
  const border = visited ? '#2a5a10' : '#8a4a00'
  const color = visited ? '#fff' : '#3a1a00'
  const fontSize = Math.max(8, Math.round(size * 0.4))
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:2px solid ${border};color:${color};font-weight:bold;font-size:${fontSize}px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.5)">${number}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

// 実際に撮影した地点のマーカー（比定地とは別扱い）
const visitIcon = L.divIcon({
  className: '',
  html: '<div style="width:22px;height:22px;border-radius:50%;background:#3a8ac8;border:2px solid #1a4a70;display:flex;align-items:center;justify-content:center;font-size:12px">📷</div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -11],
})

// 富士山そのもののマーカー（山の形をCSSで描く簡易版）
const fujiIcon = L.divIcon({
  className: '',
  html: '<div style="width:0;height:0;border-left:22px solid transparent;border-right:22px solid transparent;border-bottom:34px solid #2a1a06;position:relative"><div style="position:absolute;top:0;left:-7px;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:15px solid #e8c87a"></div></div>',
  iconSize: [44, 34],
  iconAnchor: [22, 34],
  popupAnchor: [0, -34],
})

// ズームに応じてマーカーの大きさを変える
function ZoomWatcher({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) })
  return null
}

// 検索結果をクリックしたときに地図を移動させる
function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap()
  if (target) map.flyTo(target, Math.max(map.getZoom(), 11), { duration: 0.6 })
  return null
}

function markerSizeFor(zoom: number) {
  if (zoom >= 13) return 40
  if (zoom >= 11) return 32
  if (zoom >= 9) return 26
  return 20
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
  const [filter, setFilter] = useState<'all' | '正景' | '裏富士'>('all')
  const [showLine, setShowLine] = useState(true)
  const [showFuji, setShowFuji] = useState(false)
  const [showVisit, setShowVisit] = useState(false)
  const [zoom, setZoom] = useState(7)
  const [query, setQuery] = useState('')
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null)

  const visited = new Set(visitedLocationIds)
  const placed = locations.filter((l) => l.latitude !== null && l.longitude !== null)

  const filtered = useMemo(
    () => (filter === 'all' ? placed : placed.filter((l) => l.series === filter)),
    [placed, filter]
  )

  const routeLatLngs = useMemo(
    () => filtered.map((l) => [Number(l.latitude), Number(l.longitude)] as [number, number]),
    [filtered]
  )

  const visitedCount = placed.filter((l) => visited.has(l.id)).length
  const size = markerSizeFor(zoom)

  const searchResults = useMemo(() => {
    const q = query.trim()
    if (!q) return []
    return placed
      .filter(
        (l) =>
          String(l.number) === q ||
          l.title_jp.includes(q) ||
          (l.title_en ?? '').toLowerCase().includes(q.toLowerCase()) ||
          (l.modern_location ?? '').includes(q)
      )
      .slice(0, 8)
  }, [placed, query])

  return (
    <div className="rounded-lg overflow-hidden border" style={{ background: '#1a1008' }}>
      {/* トゥールバー */}
      <div className="flex items-center gap-2 px-4 py-2 flex-wrap" style={{ borderBottom: '1px solid #3a2a10' }}>
        <span className="text-sm mr-2" style={{ color: '#e8c87a', letterSpacing: '0.1em' }}>
          富嶽三十六景 訪問地図
        </span>
        <div className="w-px h-5" style={{ background: '#3a2a10' }} />
        {(['all', '正景', '裏富士'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="text-xs px-3 py-1 rounded-full border"
            style={
              filter === f
                ? { background: '#a07040', color: '#fff', borderColor: '#a07040' }
                : { background: 'transparent', color: '#c8a060', borderColor: '#5a3a10' }
            }
          >
            {f === 'all' ? '全景' : f}
          </button>
        ))}
        <div className="w-px h-5" style={{ background: '#3a2a10' }} />
        <button
          onClick={() => setShowLine((v) => !v)}
          className="text-xs px-3 py-1 rounded-full border"
          style={
            showLine
              ? { background: '#a07040', color: '#fff', borderColor: '#a07040' }
              : { background: 'transparent', color: '#c8a060', borderColor: '#5a3a10' }
          }
        >
          ● 経路線
        </button>
        <button
          onClick={() => setShowFuji((v) => !v)}
          className="text-xs px-3 py-1 rounded-full border"
          style={
            showFuji
              ? { background: '#a07040', color: '#fff', borderColor: '#a07040' }
              : { background: 'transparent', color: '#c8a060', borderColor: '#5a3a10' }
          }
        >
          富士山を表示
        </button>
        <button
          onClick={() => setShowVisit((v) => !v)}
          className="text-xs px-3 py-1 rounded-full border"
          style={
            showVisit
              ? { background: '#a07040', color: '#fff', borderColor: '#a07040' }
              : { background: 'transparent', color: '#c8a060', borderColor: '#5a3a10' }
          }
        >
          📷 訪問地点を表示
        </button>
        <span className="text-xs ml-auto" style={{ color: '#8a6a30' }}>
          表示 {filtered.length}景 ／ 訪問済み {visitedCount}景
        </span>
      </div>

      {/* 地図本体 */}
      <div className="relative">
        {/* 検索ボックス */}
        <div className="absolute top-3 right-3 z-[1000] w-60">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="番号または作品名で検索…"
            className="w-full text-sm px-3 py-2 rounded-lg outline-none"
            style={{ background: 'rgba(26,16,8,.95)', border: '1.5px solid #5a3a10', color: '#f5e8d0' }}
          />
          {searchResults.length > 0 && (
            <div
              className="mt-1 rounded-lg overflow-hidden max-h-64 overflow-y-auto"
              style={{ background: 'rgba(26,16,8,.97)', border: '1.5px solid #5a3a10' }}
            >
              {searchResults.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    setFlyTarget([Number(l.latitude), Number(l.longitude)])
                    setQuery(l.title_jp)
                  }}
                  className="w-full text-left px-3 py-2 text-sm flex items-center gap-2"
                  style={{ borderBottom: '1px solid #2a1a08', color: '#e8c87a' }}
                >
                  <span className="text-xs" style={{ color: '#8a6a30' }}>
                    第{l.number}景
                  </span>
                  {l.title_jp}
                  <span className="text-xs ml-auto" style={{ color: '#8a6a30' }}>
                    {l.prefecture}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <MapContainer center={[35.4, 138.9]} zoom={7} style={{ height: '70vh', width: '100%' }}>
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
              icon={numberIcon(l.number, visited.has(l.id), size)}
            >
              <Popup>
                <div className="text-sm" style={{ color: '#f5e8d0' }}>
                  <div className="text-xs" style={{ color: '#8a6a30' }}>
                    第{l.number}景
                  </div>
                  <div className="font-medium" style={{ color: '#e8c87a' }}>
                    {l.title_jp}
                  </div>
                  {l.title_en && (
                    <div className="text-xs" style={{ color: '#9a7a40' }}>
                      {l.title_en}
                    </div>
                  )}
                  <div className="text-xs mt-1" style={{ color: '#c8a060' }}>
                    {l.prefecture}
                    {l.modern_location && <br />}
                    {l.modern_location}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {l.series && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: '#3a2a60', color: '#a090e0' }}
                      >
                        {l.series}
                      </span>
                    )}
                    {l.accessibility_class && ACCESSIBILITY_LABEL[l.accessibility_class] && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: ACCESSIBILITY_LABEL[l.accessibility_class].bg,
                          color: ACCESSIBILITY_LABEL[l.accessibility_class].color,
                        }}
                      >
                        {ACCESSIBILITY_LABEL[l.accessibility_class].label}
                      </span>
                    )}
                  </div>
                  <span
                    className="inline-block text-xs px-2 py-0.5 rounded-full mt-2"
                    style={
                      visited.has(l.id)
                        ? { background: '#2a4a20', color: '#6aaa40' }
                        : { background: '#3a2a10', color: '#8a6a30' }
                    }
                  >
                    {visited.has(l.id) ? '訪問済み' : '未訪問'}
                  </span>
                  <div className="mt-2">
                    <Link href={`/locations/${l.id}`} className="text-xs underline" style={{ color: '#e8c87a' }}>
                      詳細を見る ↗
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {showLine && routeLatLngs.length > 1 && (
            <Polyline positions={routeLatLngs} pathOptions={{ color: '#c8a060', weight: 1.2, opacity: 0.45, dashArray: '4 5' }} />
          )}

          {showFuji && (
            <Marker position={FUJI} icon={fujiIcon}>
              <Popup>
                <div className="text-sm" style={{ color: '#f5e8d0' }}>
                  <div className="font-medium" style={{ color: '#e8c87a' }}>
                    富士山
                  </div>
                  <div className="text-xs" style={{ color: '#c8a060' }}>
                    標高3,776m・静岡県／山梨県
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {showVisit &&
            visitPoints.map((v) => (
              <Marker key={v.id} position={[v.latitude, v.longitude]} icon={visitIcon}>
                <Popup>
                  <div className="text-sm" style={{ color: '#f5e8d0' }}>
                    <div className="text-xs" style={{ color: '#8a6a30' }}>
                      第{v.number}景・実際の訪問地点
                    </div>
                    <div className="font-medium" style={{ color: '#e8c87a' }}>
                      {v.title_jp}
                    </div>
                    <div className="text-xs mt-1" style={{ color: '#c8a060' }}>
                      GPS: {v.latitude.toFixed(5)}, {v.longitude.toFixed(5)}
                    </div>
                    {v.taken_at && (
                      <div className="text-xs" style={{ color: '#c8a060' }}>
                        {new Date(v.taken_at).toLocaleDateString('ja-JP')}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>

        {/* 凡例 */}
        <div
          className="absolute bottom-6 left-3 z-[1000] rounded-lg px-4 py-3 text-sm"
          style={{ background: 'rgba(26,16,8,.92)', border: '1.5px solid #5a3a10', color: '#c8a060' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="inline-block w-4 h-4 rounded-full"
              style={{ background: '#e8c87a', border: '2px solid #8a4a00' }}
            />
            未訪問
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="inline-block w-4 h-4 rounded-full"
              style={{ background: '#6aaa40', border: '2px solid #2a5a10' }}
            />
            訪問済み
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-4 h-4 rounded-full"
              style={{ background: '#3a8ac8', border: '2px solid #1a4a70' }}
            />
            実際の訪問地点（📷）
          </div>
        </div>
      </div>
    </div>
  )
}
