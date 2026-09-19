'use client'

// 46景を、元の絵（浮世絵）のカードで2列に並べて見る画面。
// 地図と同じ地点データを「空間ではなく絵で」見せるもので、地図タブの中の
// 切り替え表示として置く（map-screen.tsx）。カードを押すと地点詳細へ進む。
// 訪問済みかどうかは色だけでなく「✓ 訪問済み」の文字でも示す。

import { useState } from 'react'
import Link from 'next/link'
import type { LocationPin } from './map-types'

type Filter = 'all' | 'visited' | 'unvisited'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '全景' },
  { value: 'visited', label: '訪問済み' },
  { value: 'unvisited', label: '未訪問' },
]

export function LocationGallery({
  locations,
  visitedLocationIds,
}: {
  locations: LocationPin[]
  visitedLocationIds: string[]
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const visited = new Set(visitedLocationIds)
  const shown = locations.filter((l) =>
    filter === 'all' ? true : filter === 'visited' ? visited.has(l.id) : !visited.has(l.id)
  )

  return (
    <section aria-label="作品一覧" className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`text-sm rounded-full px-4 py-2 font-body font-semibold transition-colors ${
              filter === f.value ? 'bg-hi text-nami' : 'border border-line text-nami-dim'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-nami-dim">
        全{locations.length}景・訪問済み {locations.filter((l) => visited.has(l.id)).length}景
        {filter !== 'all' && `（${shown.length}景を表示中）`}
      </p>

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
                  className="block h-full border border-line rounded-lg overflow-hidden bg-sumi-2 hover:bg-sumi-3 transition-colors"
                >
                  <div className="relative aspect-[3/4] bg-sumi-3">
                    {l.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element -- 取得元ドメインが行ごとに異なりnext/imageに事前登録できない
                      <img src={l.image_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    )}
                    <span
                      className={`absolute top-2 right-2 text-xs font-semibold rounded-full px-2 py-0.5 ${
                        isVisited ? 'bg-matsu text-sumi' : 'bg-sumi/90 border border-line text-nami-dim'
                      }`}
                    >
                      {isVisited ? '✓ 訪問済み' : '未訪問'}
                    </span>
                  </div>
                  <div className="p-3 space-y-0.5">
                    <div className="text-xs text-kin-dim">第{l.number}景</div>
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
