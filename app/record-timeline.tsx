'use client'

// 記録を「日付ごとのタイムライン」で見せるための共通部品。
// 地点詳細の記録一覧（app/locations/[id]/location-records.tsx）と
// 記録タブの一覧（app/record-list.tsx）の両方が使う。
//
// 同じ日の記録を1日分にまとめ、赤茶の日付印を点線でつなぐ。同じ日に何度も
// 記録した＝その日に何度も迷って確かめた、という往還の跡が見えるようにするため。

import { useEffect, useState } from 'react'
import { dateKey, formatDate } from '@/lib/format'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export type RecordOrder = 'newest' | 'oldest'

// 並び順はアプリ全体で共通の好みとして覚えておく（画面・地点ごとには分けない）
const ORDER_STORAGE_KEY = 'okr-record-order'

const ORDER_OPTIONS: { value: RecordOrder; label: string }[] = [
  { value: 'newest', label: '新しい順' },
  { value: 'oldest', label: '古い順' },
]

/** 前回選んだ並び順を覚えておく。最初は新しい順 */
export function useRecordOrder(): [RecordOrder, (value: RecordOrder) => void] {
  const [order, setOrder] = useState<RecordOrder>('newest')

  // useStateの初期値で読むとサーバー側の描画と食い違うため、マウント後に一度だけ読む
  // （app/settings/font-size-setting.tsxと同じ考え方）。
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ORDER_STORAGE_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- マウント後に一度だけlocalStorageを読んで並び順を合わせる想定通りの用法
      if (saved === 'newest' || saved === 'oldest') setOrder(saved)
    } catch {
      // プライベートブラウジング等でlocalStorageが使えない場合は新しい順のまま
    }
  }, [])

  function change(value: RecordOrder) {
    setOrder(value)
    try {
      localStorage.setItem(ORDER_STORAGE_KEY, value)
    } catch {
      // 保存できなくても、今の画面の並びは変わっているので致命的ではない
    }
  }

  return [order, change]
}

/** 「新しい順」「古い順」の切り替えボタン */
export function RecordOrderToggle({
  order,
  onChange,
}: {
  order: RecordOrder
  onChange: (value: RecordOrder) => void
}) {
  return (
    <div className="flex gap-1" role="group" aria-label="記録の並び順">
      {ORDER_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={order === o.value}
          onClick={() => onChange(o.value)}
          className={`text-xs rounded-full px-3 py-1 transition-colors ${
            order === o.value ? 'bg-hi text-washi' : 'border border-line text-nami-dim'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

type Dated = { photographed_at: string | null; created_at: string }

/** 記録の日時。訪問日時が無い古い記録は作成日時で代用する（他の画面と同じ扱い） */
export function recordDatetime(r: Dated): string {
  return r.photographed_at ?? r.created_at
}

export type DayGroup<T> = { key: string; date: Date; records: T[] }

/**
 * 記録を日時で並べ替えてから、日付ごとにまとめる。
 * 呼び出し元の並び（保存日時順など）に頼らず、ここで訪問日時の順に揃える。
 */
export function groupByDay<T extends Dated>(records: T[], order: RecordOrder): DayGroup<T>[] {
  const time = (r: T) => new Date(recordDatetime(r)).getTime() || 0
  const sorted = [...records].sort((a, b) => (order === 'newest' ? time(b) - time(a) : time(a) - time(b)))

  const groups: DayGroup<T>[] = []
  for (const r of sorted) {
    const key = dateKey(recordDatetime(r)) ?? 'unknown'
    const last = groups[groups.length - 1]
    if (last && last.key === key) {
      last.records.push(r)
    } else {
      groups.push({ key, date: new Date(recordDatetime(r)), records: [r] })
    }
  }
  return groups
}

/** タイムラインの左側に並ぶ、赤茶の丸い日付印 */
function DateStamp({ date }: { date: Date }) {
  const valid = !isNaN(date.getTime())
  return (
    <div
      className="w-11 h-11 rounded-full bg-hi text-washi flex flex-col items-center justify-center leading-none shrink-0"
      aria-hidden="true"
    >
      <span className="text-[10px]">{valid ? `${date.getMonth() + 1}月` : ''}</span>
      <span className="text-lg font-bold">{valid ? date.getDate() : '?'}</span>
    </div>
  )
}

/** 1日分の区切り。日付印・日付の見出し・その日の記録（children）を並べる */
export function TimelineDay({
  date,
  count,
  isLast,
  children,
}: {
  date: Date
  count: number
  isLast: boolean
  children: React.ReactNode
}) {
  const valid = !isNaN(date.getTime())
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <DateStamp date={date} />
        {/* 次の日付印へつなぐ点線。最後の日には引かない */}
        {!isLast && (
          <div
            className="w-0.5 flex-1 mt-1"
            style={{ background: 'repeating-linear-gradient(var(--hi) 0 3px, transparent 3px 8px)' }}
          />
        )}
      </div>
      <div className="flex-1 min-w-0 pb-6">
        <h3 className="text-xs text-nami-dim pt-3">
          {valid ? `${formatDate(date.toISOString())}（${WEEKDAYS[date.getDay()]}）` : '日付不明'}
          {count > 1 && <span className="text-hi font-semibold">・{count}回の記録</span>}
        </h3>
        <ul className="space-y-2 mt-2">{children}</ul>
      </div>
    </li>
  )
}
