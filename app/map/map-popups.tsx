// マーカーをクリックしたときに出る吹き出しの中身。
// Leafletの吹き出しは白背景なので、地図パネル本体（暗い配色）とは別に
// MAP_THEME.popup の暗い文字色を使う。

import Link from 'next/link'
import { accessibilityStyle } from '@/lib/labels'
import { formatDate } from '@/lib/format'
import { MAP_THEME } from './map-theme'
import type { LocationPin, VisitPoint } from './map-types'

function Badge({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: bg, color }}>
      {children}
    </span>
  )
}

/** 比定地（locations）のマーカー用 */
export function LocationPopupBody({ location, visited }: { location: LocationPin; visited: boolean }) {
  const accessibility = accessibilityStyle(location.accessibility_class)

  return (
    <div className="text-sm" style={{ color: MAP_THEME.popup.text }}>
      {location.image_url && (
        // eslint-disable-next-line @next/next/no-img-element -- 取得元ドメインが行ごとに異なりnext/imageに事前登録できない
        <img
          src={location.image_url}
          alt={location.title_jp}
          style={{ width: '100%', borderRadius: 6, marginBottom: 6, display: 'block' }}
        />
      )}

      <div className="text-xs" style={{ color: MAP_THEME.popup.sub }}>
        第{location.number}景
      </div>
      <div className="font-medium">{location.title_jp}</div>
      {location.title_en && (
        <div className="text-xs" style={{ color: MAP_THEME.popup.sub }}>
          {location.title_en}
        </div>
      )}

      <div className="text-xs mt-1" style={{ color: MAP_THEME.popup.meta }}>
        {location.prefecture}
        {location.modern_location && <br />}
        {location.modern_location}
      </div>

      <div className="flex flex-wrap gap-1 mt-2">
        {location.series && (
          <Badge bg={MAP_THEME.popup.seriesBg} color={MAP_THEME.popup.seriesText}>
            {location.series}
          </Badge>
        )}
        {accessibility && (
          <Badge bg={accessibility.bg} color={accessibility.color}>
            {accessibility.label}
          </Badge>
        )}
      </div>

      <div className="mt-2">
        {visited ? (
          <Badge bg={MAP_THEME.popup.visitedBg} color={MAP_THEME.popup.visitedText}>
            訪問済み
          </Badge>
        ) : (
          <Badge bg={MAP_THEME.popup.unvisitedBg} color={MAP_THEME.popup.unvisitedText}>
            未訪問
          </Badge>
        )}
      </div>

      <div className="mt-2">
        <Link href={`/locations/${location.id}`} className="text-xs underline" style={{ color: MAP_THEME.popup.link }}>
          詳細を見る ↗
        </Link>
      </div>
    </div>
  )
}

/** 富士山マーカー用 */
export function FujiPopupBody() {
  return (
    <div className="text-sm" style={{ color: MAP_THEME.popup.text }}>
      <div className="font-medium">富士山</div>
      <div className="text-xs" style={{ color: MAP_THEME.popup.meta }}>
        標高3,776m・静岡県／山梨県
      </div>
    </div>
  )
}

/** 実際に撮影した地点（record_photos）のマーカー用 */
export function VisitPopupBody({ point }: { point: VisitPoint }) {
  return (
    <div className="text-sm" style={{ color: MAP_THEME.popup.text }}>
      <div className="text-xs" style={{ color: MAP_THEME.popup.sub }}>
        第{point.number}景・実際の訪問地点
      </div>
      <div className="font-medium">{point.title_jp}</div>
      <div className="text-xs mt-1" style={{ color: MAP_THEME.popup.meta }}>
        GPS: {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
      </div>
      {point.taken_at && (
        <div className="text-xs" style={{ color: MAP_THEME.popup.meta }}>
          {formatDate(point.taken_at)}
        </div>
      )}
    </div>
  )
}
