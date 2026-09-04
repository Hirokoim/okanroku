// 地図の上に並ぶ操作バー（シリーズ絞り込み・表示切替・件数表示）。
// 状態は持たず、押されたことを map-view.tsx へ伝えるだけ。

import { MAP_THEME } from './map-theme'
import type { SeriesFilter } from './map-types'

const FILTERS: SeriesFilter[] = ['all', '正景', '裏富士']

// 選択中／未選択で色が入れ替わる丸ボタン。同じ配色の指定が3か所に
// コピーされていたのでここに1つだけ置く。
function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-3 py-1 rounded-full border"
      style={
        active
          ? {
              background: MAP_THEME.panel.activeBg,
              color: MAP_THEME.panel.activeText,
              borderColor: MAP_THEME.panel.activeBg,
            }
          : {
              background: 'transparent',
              color: MAP_THEME.panel.text,
              borderColor: MAP_THEME.panel.line,
            }
      }
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5" style={{ background: MAP_THEME.panel.divider }} />
}

export function MapToolbar({
  filter,
  onFilterChange,
  showFuji,
  onToggleFuji,
  showVisit,
  onToggleVisit,
  shownCount,
  visitedCount,
}: {
  filter: SeriesFilter
  onFilterChange: (filter: SeriesFilter) => void
  showFuji: boolean
  onToggleFuji: () => void
  showVisit: boolean
  onToggleVisit: () => void
  shownCount: number
  visitedCount: number
}) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 flex-wrap"
      style={{ borderBottom: `1px solid ${MAP_THEME.panel.divider}` }}
    >
      <span className="text-sm mr-2" style={{ color: MAP_THEME.panel.title, letterSpacing: '0.1em' }}>
        富嶽三十六景 訪問地図
      </span>

      <Divider />
      {FILTERS.map((f) => (
        <PillButton key={f} active={filter === f} onClick={() => onFilterChange(f)}>
          {f === 'all' ? '全景' : f}
        </PillButton>
      ))}

      <Divider />
      <PillButton active={showFuji} onClick={onToggleFuji}>
        富士山を表示
      </PillButton>
      <PillButton active={showVisit} onClick={onToggleVisit}>
        📷 訪問地点を表示
      </PillButton>

      <span className="text-xs ml-auto" style={{ color: MAP_THEME.panel.muted }}>
        表示 {shownCount}景 ／ 訪問済み {visitedCount}景
      </span>
    </div>
  )
}
