// 地図の上に並ぶ操作バー（表示切替・件数表示）。
// 状態は持たず、押されたことを map-view.tsx へ伝えるだけ。

import { MAP_THEME } from './map-theme'
import { useFigureMeta } from '../figure-context'

// 選択中／未選択で色が入れ替わる丸ボタン。同じ配色の指定が3か所に
// コピーされていたのでここに1つだけ置く。
// 開拓マップの絞り込み（cluster-map.tsx）でも同じ見た目を使う。
export function PillButton({
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
      type="button"
      onClick={onClick}
      aria-pressed={active}
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

export function MapToolbar({
  showFuji,
  onToggleFuji,
  showVisit,
  onToggleVisit,
  shownCount,
}: {
  showFuji: boolean
  onToggleFuji: () => void
  showVisit: boolean
  onToggleVisit: () => void
  shownCount: number
}) {
  const { unit } = useFigureMeta()
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 flex-wrap"
      style={{ borderBottom: `1px solid ${MAP_THEME.panel.divider}` }}
    >
      <PillButton active={showFuji} onClick={onToggleFuji}>
        富士山を表示
      </PillButton>
      <PillButton active={showVisit} onClick={onToggleVisit}>
        📷 訪問地点を表示
      </PillButton>

      {/* 作品名と訪問済みの数は地図の上の進み具合（map-screen.tsx）に出しているので、ここは表示中の数だけ */}
      <span className="text-xs ml-auto" style={{ color: MAP_THEME.panel.muted }}>
        表示 {shownCount}
        {unit}
      </span>
    </div>
  )
}
