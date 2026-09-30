// 地図の「上に重ねて」表示するもの＝検索ボックスと凡例。
// どちらもLeafletの地図そのものではなく、地図を囲む枠に対して絶対配置している。
// z-[1000] はLeafletのタイル・マーカーより手前に出すため。

import { useEffect, useState } from 'react'
import { MAP_THEME } from './map-theme'
import { useFigureMeta } from '../figure-context'
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
  const { unit } = useFigureMeta()
  return (
    <div className="absolute top-3 right-3 z-[1000] w-60">
      <input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="番号または作品名で検索…"
        aria-label="番号または作品名で検索"
        className="w-full text-sm px-3 py-2 rounded-lg"
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
              type="button"
              onClick={() => onSelect(l)}
              className="w-full text-left px-3 py-2 text-sm flex items-center gap-2"
              style={{
                borderBottom: `1px solid ${MAP_THEME.overlay.rowDivider}`,
                color: MAP_THEME.panel.title,
              }}
            >
              <span className="text-xs" style={{ color: MAP_THEME.panel.muted }}>
                第{l.number}
                {unit}
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

// 現在地ボタン。Leafletの標準ズームボタン（左上、+/−の2段）のすぐ下に
// 重ねて置く、地図アプリでおなじみの位置・見た目に寄せた（ユーザー指定の
// 参考画像どおり）。
//
// 大きさ・位置は固定値ではなく、実際に描画されたズームボタンの「外枠」
// （.leaflet-control-zoom。白い角丸の見た目そのもの）をDOMから測って
// 合わせている。タッチ環境では外枠に2px分の境界線が付き、中のボタン本体
// （.leaflet-control-zoom-in）より一回り大きくなる（node_modules/leaflet/
// dist/leaflet.cssの.leaflet-touch .leaflet-bar）。外枠とボタン本体を
// 混ぜて測ると、2〜4px分の見えないズレが出るため、常に外枠だけを基準にする。
const GAP_BELOW_ZOOM = 12

export function LocateButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  const [rect, setRect] = useState<{ top: number; left: number; size: number } | null>(null)

  useEffect(() => {
    // ズームボタンはMapContainerの初期化と同じコミットでDOMに入るため、
    // このeffectが走る時点（マウント後）にはすでに存在している。
    //
    // offsetTop/offsetLeftは使わない。値が「最も近い position:relative等の
    // 先祖（offsetParent）」からの相対位置になり、それがこのボタンの絶対配置の
    // 基準（.leaflet-containerを直接くるむ親div）と一致する保証が無いため。
    // 代わりにgetBoundingClientRectで画面上の実座標を取り、地図の実座標との
    // 差分を計算する（この差分は基準がどこであっても正しい）。
    const container = document.querySelector<HTMLElement>('.leaflet-container')
    const zoomBar = document.querySelector<HTMLElement>('.leaflet-control-zoom')
    if (container && zoomBar) {
      const containerRect = container.getBoundingClientRect()
      const barRect = zoomBar.getBoundingClientRect()
      // マウント後に一度だけ、外部（実際のDOM寸法）を読んで反映する、想定通りの
      // 使い方。record-form.tsxのlocalStorage読み込みと同じ理由で抑止する。
      // eslint-disable-next-line react-hooks/set-state-in-effect -- マウント後に一度だけ実際のDOM寸法を読んで反映する想定通りの用法
      setRect({
        top: barRect.bottom - containerRect.top + GAP_BELOW_ZOOM,
        left: barRect.left - containerRect.left,
        size: barRect.width,
      })
    }
  }, [])

  // 測れるまでは仮の位置に置く（一瞬だけ）。無いよりはある方がよい。
  const { top, left, size } = rect ?? { top: 84, left: 10, size: 30 }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? '現在地の追跡を止める' : '現在地を表示する'}
      aria-pressed={active}
      className="absolute z-[1000] flex items-center justify-center"
      style={{
        top,
        left,
        width: size,
        height: size,
        // ズームボタン（globals.cssの.leaflet-barの上書き）と同じ生成りの角丸に揃える
        background: 'var(--washi)',
        borderRadius: 10,
        border: '2px solid rgba(0,0,0,.2)',
        backgroundClip: 'padding-box',
      }}
    >
      <svg viewBox="0 0 24 24" width="16" height="16">
        <g stroke={active ? MAP_THEME.marker.here.dot : '#5f6368'} strokeWidth="2" fill="none">
          <line x1="12" y1="1" x2="12" y2="4" />
          <line x1="12" y1="20" x2="12" y2="23" />
          <line x1="1" y1="12" x2="4" y2="12" />
          <line x1="20" y1="12" x2="23" y2="12" />
          <circle cx="12" cy="12" r="6.5" />
        </g>
        <circle cx="12" cy="12" r="3" fill={active ? MAP_THEME.marker.here.dot : '#5f6368'} />
      </svg>
    </button>
  )
}

function LegendRow({
  bg,
  border,
  square = false,
  children,
}: {
  bg: string
  border: string
  /** 東海道の宿場のように、地図上で角丸の四角として描くもの */
  square?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      {/* 外側の細い影は、白いふち（開拓マップの円）が明るい凡例の地に溶けないようにするため */}
      <span
        className={`inline-block w-4 h-4 ${square ? 'rounded' : 'rounded-full'}`}
        style={{ background: bg, border: `2px solid ${border}`, boxShadow: '0 0 0 1px rgba(43,29,23,.25)' }}
      />
      {children}
    </div>
  )
}

/** 開拓マップ（クラスタ円）を出しているときの凡例。円の塗り分けと黄土のふちの意味を示す */
export function ClusterLegend() {
  const { none, noneRim, partial, fill, rim, gold } = MAP_THEME.cluster
  return (
    <div
      className="absolute bottom-6 left-3 z-[1000] rounded-lg px-4 py-3 text-sm space-y-2"
      style={{
        background: MAP_THEME.overlay.bgLegend,
        border: MAP_THEME.overlay.border,
        color: MAP_THEME.panel.text,
      }}
    >
      <LegendRow bg={none} border={noneRim}>
        未踏
      </LegendRow>
      <LegendRow bg={`radial-gradient(circle, ${fill} 0 45%, ${partial} 46%)`} border={rim}>
        開拓中
      </LegendRow>
      <LegendRow bg={fill} border={gold}>
        制覇（黄土のふち）
      </LegendRow>
    </div>
  )
}

export function MapLegend({ showTokaido = false }: { showTokaido?: boolean }) {
  const { visited, unvisited, visit } = MAP_THEME.marker
  const tokaido = MAP_THEME.tokaido
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
      {/* 宿場の層は既定でオフ。出していないときに凡例だけあると何のことか分からないため、オンのときだけ足す */}
      {showTokaido && (
        <LegendRow bg={tokaido.bg} border={tokaido.border} square>
          東海道の宿場
        </LegendRow>
      )}
    </div>
  )
}
