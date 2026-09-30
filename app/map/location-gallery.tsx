'use client'

// いま選んでいる人物の作品（北斎46景・広重55図など）を、元の絵（浮世絵）のカードで2列に並べて見る画面。
// 地図と同じ地点データを「空間ではなく絵で」見せるもので、地図タブの中の
// 切り替え表示として置く（map-screen.tsx）。カードを押すと地点詳細へ進む。
// 訪問済みかどうかは色だけでなく「✓ 訪問済み」の文字でも示す。

import { useState } from 'react'
import Link from 'next/link'
import { useFigureMeta } from '../figure-context'
import type { LocationPin } from './map-types'

type Filter = 'all' | 'visited' | 'unvisited'

// 「全景」の「景」は人物ごとの数え方に置き換える（広重なら「全図」）
function filters(unit: string): { value: Filter; label: string }[] {
  return [
    { value: 'all', label: `全${unit}` },
    { value: 'visited', label: '訪問済み' },
    { value: 'unvisited', label: '未訪問' },
  ]
}

export function LocationGallery({
  locations,
  visitedLocationIds,
  clusterFilter,
  onClearClusterFilter,
}: {
  locations: LocationPin[]
  visitedLocationIds: string[]
  /** 地図側で選んだクラスタ。指定時は、渡されたlocationsがそのクラスタに絞り込み済み */
  clusterFilter: string | null
  onClearClusterFilter: () => void
}) {
  const { unit } = useFigureMeta()
  const [filter, setFilter] = useState<Filter>('all')
  const visited = new Set(visitedLocationIds)
  const shown = locations.filter((l) =>
    filter === 'all' ? true : filter === 'visited' ? visited.has(l.id) : !visited.has(l.id)
  )

  return (
    <section aria-label="作品一覧" className="space-y-3">
      {clusterFilter && (
        <div className="flex items-center gap-2 flex-wrap text-sm rounded-xl px-3 py-2 bg-sumi-2">
          <span className="text-hi font-semibold">クラスタ：{clusterFilter}</span>
          <span className="text-nami-dim">で絞り込み中</span>
          <button
            type="button"
            onClick={onClearClusterFilter}
            className="ml-auto text-xs px-3 py-1 rounded-full bg-sumi-4 border border-line text-nami"
          >
            全{unit}に戻る
          </button>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {filters(unit).map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`text-sm rounded-full px-4 py-2 font-body font-semibold transition-colors ${
              filter === f.value ? 'bg-hi text-washi' : 'border border-line text-nami-dim'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 46景全体の進み具合は地図タブの上（map-screen.tsx）に出しているので、ここはクラスタで
          絞り込んだとき（そのクラスタの数）と、訪問済み／未訪問で絞ったときの件数だけ出す */}
      {(clusterFilter || filter !== 'all') && (
        <p className="text-sm text-nami-dim">
          {clusterFilter &&
            `${locations.length}${unit}・訪問済み ${locations.filter((l) => visited.has(l.id)).length}${unit}`}
          {filter !== 'all' && `（${shown.length}${unit}を表示中）`}
        </p>
      )}

      {shown.length === 0 ? (
        <p className="text-sm text-nami-dim">該当する作品がありません。</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {shown.map((l) => {
            const isVisited = visited.has(l.id)
            return (
              <li key={l.id}>
                <Link
                  href={`/locations/${l.id}`}
                  className="block h-full rounded-xl overflow-hidden bg-sumi-2 hover:bg-sumi-3 transition-colors"
                >
                  <div className="relative aspect-[3/4] bg-sumi-3">
                    {l.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element -- 取得元ドメインが行ごとに異なりnext/imageに事前登録できない
                      <img src={l.image_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    )}
                    {/* 番号は日付印と同じ赤茶の丸い印にする */}
                    <span
                      className="absolute top-2 left-2 w-8 h-8 rounded-full bg-hi text-washi border-2 border-white flex items-center justify-center text-xs font-bold"
                      aria-hidden="true"
                    >
                      {l.number}
                    </span>
                    <span
                      className={`absolute top-2 right-2 text-xs font-semibold rounded-full px-2 py-0.5 ${
                        isVisited ? 'bg-matsu text-washi' : 'bg-washi/90 text-nami-dim'
                      }`}
                    >
                      {isVisited ? '✓ 訪問済み' : '未訪問'}
                    </span>
                  </div>
                  <div className="p-3 space-y-0.5">
                    <div className="text-xs text-hi">
                      第{l.number}
                      {unit}
                    </div>
                    <div className="text-sm font-body font-semibold leading-snug">{l.title_jp}</div>
                    {l.prefecture && <div className="text-xs text-nami-dim">{l.prefecture}</div>}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
