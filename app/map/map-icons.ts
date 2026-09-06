// 地図に立てるマーカーの「絵」を作る係。
// Leafletは通常のReactコンポーネントではなくHTML文字列を受け取るため、
// 見た目の指定がここだけ style 文字列の組み立てになる。

import L from 'leaflet'
import { MAP_THEME } from './map-theme'

/** 番号入りの丸バッジ。訪問済みかどうかで色が変わり、ズームに応じて大きさが変わる */
export function numberIcon(number: number, visited: boolean, size: number) {
  const c = visited ? MAP_THEME.marker.visited : MAP_THEME.marker.unvisited
  const fontSize = Math.max(8, Math.round(size * 0.4))
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${c.bg};border:2px solid ${c.border};color:${c.text};font-weight:bold;font-size:${fontSize}px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.5)">${number}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

/** 実際に撮影した地点のマーカー（比定地とは別扱い） */
export const visitIcon = L.divIcon({
  className: '',
  html: `<div style="width:22px;height:22px;border-radius:50%;background:${MAP_THEME.marker.visit.bg};border:2px solid ${MAP_THEME.marker.visit.border};display:flex;align-items:center;justify-content:center;font-size:12px">📷</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -11],
})

/** 富士山そのもののマーカー（山の形をCSSの三角形で描く簡易版） */
export const fujiIcon = L.divIcon({
  className: '',
  html: `<div style="width:0;height:0;border-left:22px solid transparent;border-right:22px solid transparent;border-bottom:34px solid ${MAP_THEME.marker.fuji.body};position:relative"><div style="position:absolute;top:0;left:-7px;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:15px solid ${MAP_THEME.marker.fuji.snow}"></div></div>`,
  iconSize: [44, 34],
  iconAnchor: [22, 34],
  popupAnchor: [0, -34],
})

/** ズームが深いほどマーカーを大きくする */
export function markerSizeFor(zoom: number) {
  if (zoom >= 13) return 40
  if (zoom >= 11) return 32
  if (zoom >= 9) return 26
  return 20
}
