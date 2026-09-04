// 地図の「上に重ねて」表示するもの＝検索ボックスと凡例。
// どちらもLeafletの地図そのものではなく、地図を囲む枠に対して絶対配置している。
// z-[1000] はLeafletのタイル・マーカーより手前に出すため。

import { MAP_THEME } from './map-theme'
import type { LocationPin } from './map-types'

export function MapSearch({
  query,
  onQueryChange,
  results,
  onSelect,
}: {
  query: string
  onQueryChange: (query: string) => void
  results: LocationPin[]
  onSelect: (location: LocationPin) => void
}) {
  return (
    <div className="absolute top-3 right-3 z-[1000] w-60">
      <input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="番号または作品名で検索…"
        className="w-full text-sm px-3 py-2 rounded-lg outline-none"
        style={{
          background: MAP_THEME.overlay.bg,
          border: MAP_THEME.overlay.border,
          color: MAP_THEME.overlay.inputText,
        }}
      />

      {results.length > 0 && (
        <div
          className="mt-1 rounded-lg overflow-hidden max-h-64 overflow-y-auto"
          style={{ background: MAP_THEME.overlay.bgOpaque, border: MAP_THEME.overlay.border }}
        >
          {results.map((l) => (
            <button
              key={l.id}
              onClick={() => onSelect(l)}
              className="w-full text-left px-3 py-2 text-sm flex items-center gap-2"
              style={{
                borderBottom: `1px solid ${MAP_THEME.overlay.rowDivider}`,
                color: MAP_THEME.panel.title,
              }}
            >
              <span className="text-xs" style={{ color: MAP_THEME.panel.muted }}>
                第{l.number}景
              </span>
              {l.title_jp}
              <span className="text-xs ml-auto" style={{ color: MAP_THEME.panel.muted }}>
                {l.prefecture}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function LegendRow({ bg, border, children }: { bg: string; border: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block w-4 h-4 rounded-full" style={{ background: bg, border: `2px solid ${border}` }} />
      {children}
    </div>
  )
}

export function MapLegend() {
  const { visited, unvisited, visit } = MAP_THEME.marker
  return (
    <div
      className="absolute bottom-6 left-3 z-[1000] rounded-lg px-4 py-3 text-sm space-y-2"
      style={{
        background: MAP_THEME.overlay.bgLegend,
        border: MAP_THEME.overlay.border,
        color: MAP_THEME.panel.text,
      }}
    >
      <LegendRow bg={unvisited.bg} border={unvisited.border}>
        未訪問
      </LegendRow>
      <LegendRow bg={visited.bg} border={visited.border}>
        訪問済み
      </LegendRow>
      <LegendRow bg={visit.bg} border={visit.border}>
        実際の訪問地点（📷）
      </LegendRow>
    </div>
  )
}
