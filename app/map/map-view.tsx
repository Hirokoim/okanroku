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

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

import { MAP_THEME } from './map-theme'
import { fujiIcon, markerSizeFor, numberIcon, visitIcon } from './map-icons'
import { MapToolbar } from './map-toolbar'
import { MapLegend, MapSearch } from './map-overlays'
import { FujiPopupBody, LocationPopupBody, VisitPopupBody } from './map-popups'
import { CurrentPositionLayer } from './map-current-position'
import { useCurrentPosition } from './use-current-position'
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

// Leafletの地図はマウント解除後や、Strict Modeが誘発する不整合な状態のもとで
// 命令的メソッド（flyTo等）を呼ぶと例外を投げることがある（2026-09-16調査、
// next.config.tsのreactStrictModeのコメント参照）。カメラを動かすのはあくまで
// 補助的な演出であり、失敗してもアプリ全体を巻き込んで落とす価値は無いため、
// 例外を握りつぶして開発コンソールにだけ出す。
function safelyMoveMap(fn: () => void) {
  try {
    fn()
  } catch (err) {
    console.error('地図の移動に失敗しました（表示には影響しません）', err)
  }
}

// 検索結果をクリックしたときに地図を移動させる。
// 地図の移動は「描画のついで」ではなく useEffect で行う。描画の途中で flyTo を
// 呼ぶと、ズームやフィルタ切替など別の理由で再描画されるたびに再実行され、
// 直前に検索した地点へ地図が引き戻されてしまう。
function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) safelyMoveMap(() => map.flyTo(target, Math.max(map.getZoom(), 11), { duration: 0.6 }))
  }, [target, map])
  return null
}

// クラスタ絞り込みが変わるたびに、そのクラスタの地点がちょうど収まる範囲へ地図を動かす。
// FlyToと同じ理由（描画中に呼ぶと再描画のたびに引き戻される）でuseEffectに置く。
function FitToPoints({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      safelyMoveMap(() => map.flyTo(points[0], 13, { duration: 0.6 }))
      return
    }
    safelyMoveMap(() => map.flyToBounds(L.latLngBounds(points), { padding: [36, 36], duration: 0.6 }))
    // pointsは絞り込みが変わるたびに作り直される配列のため、内容ではなく
    // 「配列そのものの入れ替わり」を検知したい。JSON化して依存に使う。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points), map])
  return null
}

// クラスタ内の地点をおすすめの巡回順（route_order）で並べる。
// lib/clusters.tsのbuildClusterSummariesと同じ並び替え規則
// （route_orderが無い地点は図番号順で末尾に回す）。
function byRouteOrder(a: LocationPin, b: LocationPin) {
  return (a.route_order ?? Infinity) - (b.route_order ?? Infinity) || a.number - b.number
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
  initialCluster,
}: {
  locations: LocationPin[]
  visitedLocationIds: string[]
  visitPoints: VisitPoint[]
  /** ダッシュボードのクラスタ一覧から「ここへ行く」で来たときの絞り込み初期値 */
  initialCluster: string | null
}) {
  const [filter, setFilter] = useState<SeriesFilter>('all')
  const [showFuji, setShowFuji] = useState(false)
  const [showVisit, setShowVisit] = useState(false)
  const [zoom, setZoom] = useState(INITIAL_ZOOM)
  const [query, setQuery] = useState('')
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null)
  const [clusterFilter, setClusterFilter] = useState<string | null>(initialCluster)
  const { position: here, error: hereError, watching: hereWatching, toggle: toggleHere } =
    useCurrentPosition()

  // 最初に測位できたときだけ、地図を現在地へ寄せる。毎回寄せると、
  // 地図を動かしたそばから引き戻されて操作できなくなる。
  const flewToHereRef = useRef(false)
  useEffect(() => {
    if (!hereWatching) {
      flewToHereRef.current = false
      return
    }
    if (here && !flewToHereRef.current) {
      flewToHereRef.current = true
      setFlyTarget([here.latitude, here.longitude])
    }
  }, [here, hereWatching])

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

  // クラスタ絞り込みは種類（正景/裏富士）の絞り込みとは独立に重ねてかける。
  // 「このクラスタのこの種類だけ見たい」も成立するため。
  const displayed = useMemo(
    () => (clusterFilter ? filtered.filter((l) => l.cluster === clusterFilter).sort(byRouteOrder) : filtered),
    [filtered, clusterFilter]
  )

  const fitPoints = useMemo(
    () => (clusterFilter ? displayed.map((l) => [Number(l.latitude), Number(l.longitude)] as [number, number]) : []),
    [clusterFilter, displayed]
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
        showHere={hereWatching}
        onToggleHere={toggleHere}
        shownCount={displayed.length}
        visitedCount={visitedCount}
      />

      {hereError && (
        <div className="px-4 py-2 text-xs" style={{ color: MAP_THEME.panel.muted }}>
          {hereError}
        </div>
      )}

      {clusterFilter && (
        <div
          className="flex items-center gap-2 px-4 py-2 text-xs flex-wrap"
          style={{ borderBottom: `1px solid ${MAP_THEME.panel.divider}`, color: MAP_THEME.panel.text }}
        >
          <span style={{ color: MAP_THEME.panel.title }}>クラスタ：{clusterFilter}</span>
          <span style={{ color: MAP_THEME.panel.muted }}>で絞り込み中</span>
          <button
            onClick={() => setClusterFilter(null)}
            className="ml-auto text-xs px-3 py-1 rounded-full border"
            style={{ background: 'transparent', color: MAP_THEME.panel.text, borderColor: MAP_THEME.panel.line }}
          >
            地図全体に戻る
          </button>
        </div>
      )}

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

        {/* scrollWheelZoom=falseにする理由：既定ではマウスホイールが地図の上に
            乗った瞬間にズーム操作として奪われ、ページ自体がスクロールしなくなる。
            ページ最上部でカーソルが地図に重なった状態だと「下にスクロールしよう
            としてもページが動かず、固定表示のボトムナビ（app/bottom-nav.tsx）に
            地図が張り付いたまま」に見えていた（地図の外にカーソルを逃がすと
            正常にスクロールできることと符合する）。ズームはツールバーの+/−ボタン・
            ダブルクリック・タッチのピンチ操作で行える。 */}
        <MapContainer
          center={INITIAL_CENTER}
          zoom={INITIAL_ZOOM}
          scrollWheelZoom={false}
          style={{ height: '70dvh', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <ZoomWatcher onZoom={setZoom} />
          <FlyTo target={flyTarget} />
          <FitToPoints points={fitPoints} />

          {/* クラスタ絞り込み中だけ、地点をおすすめ順に結ぶ線を引く。
              全地点表示のときに46点を繋いでも往還の単位を表さないため出さない。 */}
          {clusterFilter && displayed.length > 1 && (
            <Polyline
              positions={displayed.map((l) => [Number(l.latitude), Number(l.longitude)] as [number, number])}
              pathOptions={{ color: MAP_THEME.cluster.gold, weight: 2.5, opacity: 0.7, dashArray: '2 6' }}
            />
          )}

          {displayed.map((l) => (
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
                <Popup minWidth={200} maxWidth={220}>
                  <VisitPopupBody point={v} />
                </Popup>
              </Marker>
            ))}

          {here && <CurrentPositionLayer position={here} />}
        </MapContainer>

        <MapLegend />
      </div>

      {clusterFilter && <RoutePanel clusterName={clusterFilter} locations={displayed} visited={visited} />}
    </div>
  )
}

// クラスタ絞り込み中に地図の下へ出す、おすすめの巡回順パネル。
// 地図上のポリラインと同じ並び（byRouteOrder）を、タップして地点詳細へ飛べる
// リストの形でも見せる。地図の線だけでは「結局どの順で回るか」が読み取りにくいため。
function RoutePanel({
  clusterName,
  locations,
  visited,
}: {
  clusterName: string
  locations: LocationPin[]
  visited: Set<string>
}) {
  if (locations.length === 0) {
    return (
      <div className="px-4 py-4 text-xs" style={{ color: MAP_THEME.panel.muted }}>
        {clusterName}に座標のある地点がありません。
      </div>
    )
  }

  return (
    <div className="px-4 py-4" style={{ borderTop: `1px solid ${MAP_THEME.panel.divider}` }}>
      <div className="text-sm mb-3" style={{ color: MAP_THEME.panel.title, letterSpacing: '0.05em' }}>
        {clusterName}のおすすめの回り方
      </div>
      <ol className="space-y-0">
        {locations.map((l, i) => (
          <li key={l.id} className="flex gap-3">
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className="w-2.5 h-2.5 rounded-full mt-1.5"
                style={{ background: MAP_THEME.cluster.gold }}
              />
              {i < locations.length - 1 && (
                <div className="w-px flex-1" style={{ background: MAP_THEME.panel.line, minHeight: '1.5rem' }} />
              )}
            </div>
            <Link href={`/locations/${l.id}`} className="pb-4 -mt-0.5 group">
              <div className="text-sm group-hover:underline" style={{ color: MAP_THEME.panel.text }}>
                第{l.number}景・{l.title_jp}
              </div>
              <div className="text-xs mt-0.5" style={{ color: MAP_THEME.panel.muted }}>
                {visited.has(l.id) ? '記録あり' : '未記録'}
                {l.modern_location ? `　${l.modern_location}` : ''}
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}
