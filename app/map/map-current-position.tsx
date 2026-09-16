'use client'

// 現在地を地図に重ねる層。進行方向の矢印付きマーカーと、
// GPSの誤差を表す薄い円を描く。
//
// 誤差円は Circle（半径をメートルで指定）を使う。開拓マップの円が
// CircleMarker（半径を画面上のピクセルで指定）なのとは意図的に違う。
// あちらは進捗を示す「記号」で地理的な大きさを持たないが、こちらは
// 「実際に何メートルの誤差か」を表すので、地図の縮尺に連動させるのが正しい。
//
// マーカー本体はCircleMarker（ベクタ図形）ではなくMarker+divIconにした。
// ベクタ図形は常に真上向きの円にしかならず、進行方向の矢印を回転させて
// 描けないため（矢印の絵はmap-icons.tsのhereIcon参照）。

import { useMemo } from 'react'
import { Circle, Marker } from 'react-leaflet'
import { hereIcon } from './map-icons'
import { MAP_THEME } from './map-theme'
import type { CurrentPosition } from './use-current-position'

export function CurrentPositionLayer({ position }: { position: CurrentPosition }) {
  const center: [number, number] = [position.latitude, position.longitude]
  // headingが変わるたびにdivIconを作り直す。現在地は1個しか出さないため、
  // 46個のマーカーを毎回作り直していた過去の反省（map-view.tsxのicons参照）
  // ほど気にする規模ではない。
  const icon = useMemo(() => hereIcon(position.heading), [position.heading])

  return (
    <>
      <Circle
        center={center}
        radius={position.accuracy}
        pathOptions={{
          color: MAP_THEME.marker.here.dot,
          fillColor: MAP_THEME.marker.here.dot,
          fillOpacity: 0.12,
          weight: 1,
        }}
      />
      <Marker position={center} icon={icon} />
    </>
  )
}
