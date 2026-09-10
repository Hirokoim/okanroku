'use client'

// 開拓マップ：クラスタ（その日1日で往還できる単位）ごとの進捗を、
// 地図の上に円で重ねるモード。46個のピンを1つずつ見るのではなく、
// 「どのあたりがどれだけ進んだか」を一目で見るための層。
//
// 円の濃さ＝そのクラスタの訪問率。制覇（100%）したものだけ縁を金にする。
// 進捗の計算そのものはlib/clusters.tsが持ち、ここは見せ方だけを持つ。

import { CircleMarker, Polyline, Popup } from 'react-leaflet'
import type { ClusterStatus, ClusterSummary } from '@/lib/clusters'
import { MAP_THEME } from './map-theme'
import { ClusterPopupBody } from './map-popups'

// 円は「そのクラスタの範囲」ではなく進捗を示す記号なので、地理的な広さ
// （メートル）ではなく画面上の大きさ（ピクセル）で描く。CircleではなくCircleMarker。
//
// 一度メートル指定で実装したところ、実際は最大1.3kmしかない江戸のクラスタに
// 半径11kmの円が乗り、江戸の7クラスタが巨大な同心円になって地図が読めなくなった。
// 円の大きさが「その範囲を歩く」という誤った意味にも見えてしまう。
function radiusPixelsFor(count: number) {
  return 8 + count * 2.5
}

// 未踏（訪問率0）もうっすら塗る。塗らずに縁だけにすると、未踏が多いうちは
// 地図が輪郭線だらけになって、重なった部分がとくに読みにくい。
function fillOpacityFor(rate: number) {
  return rate <= 0 ? 0.1 : 0.25 + rate * 0.45
}

type PlacedCluster = ClusterSummary & { centroid: { latitude: number; longitude: number } }

function isPlaced(cluster: ClusterSummary): cluster is PlacedCluster {
  return cluster.centroid !== null
}

export function ClusterLayer({
  clusters,
  visibleStatuses,
}: {
  clusters: ClusterSummary[]
  /** 表示する状態。省略すると全部出す */
  visibleStatuses?: ReadonlySet<ClusterStatus>
}) {
  const placed = clusters.filter(isPlaced)
  // 経路線は絞り込みの影響を受けない。往還の順序を示す背景であり、
  // 絞り込んだ数個だけを結ぶと順序として意味をなさないため。
  const shown = visibleStatuses ? placed.filter((c) => visibleStatuses.has(c.status)) : placed

  return (
    <>
      {/* クラスタを巡礼順（江戸から遠い順＝lib/clusters.tsの並び）に結ぶ細い線。
          個々の街道を再現したものではなく、往還の順序を示す目安 */}
      <Polyline
        positions={placed.map((c) => [c.centroid.latitude, c.centroid.longitude] as [number, number])}
        pathOptions={{
          color: MAP_THEME.cluster.route,
          weight: 1.2,
          opacity: 0.25,
          dashArray: '4 5',
        }}
      />

      {shown.map((c) => {
        const rate = c.total === 0 ? 0 : c.visited / c.total
        const complete = rate >= 1
        return (
          <CircleMarker
            key={c.name}
            center={[c.centroid.latitude, c.centroid.longitude]}
            radius={radiusPixelsFor(c.total)}
            pathOptions={{
              color: complete ? MAP_THEME.cluster.gold : MAP_THEME.cluster.indigo,
              weight: complete ? 2.5 : 1.5,
              fillColor: MAP_THEME.cluster.indigo,
              fillOpacity: fillOpacityFor(rate),
            }}
          >
            <Popup>
              <ClusterPopupBody cluster={c} />
            </Popup>
          </CircleMarker>
        )
      })}
    </>
  )
}
