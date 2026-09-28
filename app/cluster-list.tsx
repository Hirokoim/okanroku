'use client'

// 往還タブのクラスタ一覧。クラスタ名「令制国・場所」の「・」で分け、
// 国ごとの見出しの下に、場所のタイルを2列で並べる（docs/clusters.md の
// 「UIで「・」で分ければ、上位のまとまりとしても扱える」の考え方）。
// 28件を同じ形で1列に並べると長く、近場と遠出の区別も付かないため。
//
// 各タイルには、図の数だけ丸を巡回順に並べ、訪れた図を赤茶で塗る（足跡の丸）。
// 制覇したクラスタはタイルごと赤茶にする（開拓マップの「赤く染まる」と同じ考え方）。

import type { ClusterSummary } from '@/lib/clusters'
import { useClusterJourney } from './cluster-journey'

type Province = { name: string; clusters: ClusterSummary[] }

/** 「江戸・日本橋」→ 国「江戸」・場所「日本橋」。「・」が無い名前は、国も場所もその名前にする */
function splitName(name: string): { province: string; place: string } {
  const i = name.indexOf('・')
  return i < 0 ? { province: name, place: name } : { province: name.slice(0, i), place: name.slice(i + 1) }
}

/** 国ごとにまとめる。国の並びは、その国のクラスタが最初に出てくる順（巡礼順）を保つ */
function groupByProvince(summaries: ClusterSummary[]): Province[] {
  const provinces: Province[] = []
  for (const c of summaries) {
    const { province } = splitName(c.name)
    const found = provinces.find((p) => p.name === province)
    if (found) found.clusters.push(c)
    else provinces.push({ name: province, clusters: [c] })
  }
  return provinces
}

function ClusterTile({ cluster: c, onSelect }: { cluster: ClusterSummary; onSelect: () => void }) {
  const { place } = splitName(c.name)
  const complete = c.status === 'complete'

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${c.name}、${c.total}図中${c.visited}図を訪問${complete ? '（制覇）' : ''}`}
      className={`w-full h-full text-left rounded-xl px-3 py-2.5 transition-colors ${
        complete ? 'bg-hi text-washi hover:bg-hi-hover' : 'bg-sumi-2 hover:bg-sumi-3'
      }`}
    >
      <div className="font-body font-semibold text-sm leading-snug">
        {place}
        {complete && <span aria-hidden="true"> ✓</span>}
      </div>
      <div className={`text-[11px] mt-0.5 ${complete ? 'text-washi' : 'text-nami-dim'}`}>
        {c.total}図{c.maxKm !== null && c.total > 1 ? `・${c.maxKm.toFixed(1)}km` : ''}
      </div>
      {/* 足跡の丸。巡回順（lib/clusters.ts の route_order 順）に並ぶ */}
      <div className="flex flex-wrap gap-1 mt-2" aria-hidden="true">
        {c.locations.map((l) => (
          <span
            key={l.id}
            className={`w-2.5 h-2.5 rounded-full border-[1.5px] ${
              complete ? 'bg-odo border-odo' : l.visited ? 'bg-hi border-hi' : 'border-hi'
            }`}
          />
        ))}
      </div>
    </button>
  )
}

export function ClusterList({ summaries }: { summaries: ClusterSummary[] }) {
  const { start, overlay } = useClusterJourney()

  if (summaries.length === 0) {
    return <p className="text-nami-dim text-sm">クラスタが未設定です。</p>
  }

  const provinces = groupByProvince(summaries)

  return (
    <>
      <div className="space-y-5">
        {provinces.map((p) => {
          const total = p.clusters.reduce((sum, c) => sum + c.total, 0)
          const visited = p.clusters.reduce((sum, c) => sum + c.visited, 0)
          return (
            <section key={p.name} aria-label={p.name}>
              <h3 className="flex items-baseline gap-2 px-1 mb-2">
                <span className="font-body font-bold">{p.name}</span>
                <span className="text-xs text-nami-dim">
                  {p.clusters.length}か所・{total}図
                </span>
                {visited > 0 && (
                  <span className="ml-auto text-xs text-hi font-semibold tabular-nums">
                    {visited}/{total}
                  </span>
                )}
              </h3>
              <ul className="grid grid-cols-2 gap-2">
                {p.clusters.map((c) => (
                  <li key={c.name}>
                    <ClusterTile cluster={c} onSelect={() => start(c)} />
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      {overlay}
    </>
  )
}
