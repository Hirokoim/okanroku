'use client'

// 現在地を地図に重ねる層。青い点と、GPSの誤差を表す薄い円を描く。
//
// 誤差円は Circle（半径をメートルで指定）を使う。開拓マップの円が
// CircleMarker（半径を画面上のピクセルで指定）なのとは意図的に違う。
// あちらは進捗を示す「記号」で地理的な大きさを持たないが、こちらは
// 「実際に何メートルの誤差か」を表すので、地図の縮尺に連動させるのが正しい。

import { Circle, CircleMarker } from 'react-leaflet'
import { MAP_THEME } from './map-theme'
import type { CurrentPosition } from './use-current-position'

export function CurrentPositionLayer({ position }: { position: CurrentPosition }) {
  const center: [number, number] = [position.latitude, position.longitude]
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
      <CircleMarker
        center={center}
        radius={7}
        pathOptions={{
          color: MAP_THEME.marker.here.ring,
          fillColor: MAP_THEME.marker.here.dot,
          fillOpacity: 1,
          weight: 2,
        }}
      />
    </>
  )
}
