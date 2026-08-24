'use client'

// このファイルはブラウザ側でのみ動く。
// Leafletは画面サイズなどブラウザ固有の情報を使うため、サーバー側では実行できない。
// 読み込みを遅らせる指定（ssr: false）は map-panel.tsx が担当する。

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

export type LocationPin = {
  id: string
  number: number
  title_jp: string
  modern_location: string | null
  cluster: string | null
  latitude: number | null
  longitude: number | null
}

// 地図上の点を、丸い印として自作する。
// Leaflet標準のピンは画像ファイルを別途読み込む必要があり、
// Next.jsのビルドではパスが解決できず表示が崩れるため、CSSで描ける丸に置き換える。
const pinIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#0f6e56;border:2px solid white;box-shadow:0 0 3px rgba(0,0,0,0.4)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

export function MapView({ locations }: { locations: LocationPin[] }) {
  // 46地点はおおむね東京〜名古屋に散らばるため、その中間あたりを初期表示にする
  const center: [number, number] = [35.4, 138.9]

  return (
    <MapContainer center={center} zoom={8} style={{ height: '70vh', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      {locations.map((loc) => {
        // 緯度経度が未設定の地点は地図に置けないので飛ばす
        if (loc.latitude === null || loc.longitude === null) return null

        return (
          <Marker
            key={loc.id}
            position={[Number(loc.latitude), Number(loc.longitude)]}
            icon={pinIcon}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-medium">
                  第{loc.number}景 {loc.title_jp}
                </div>
                {loc.modern_location && <div>{loc.modern_location}</div>}
                {loc.cluster && <div className="text-gray-500">{loc.cluster}</div>}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
