'use client'

// 記録タブの月間カレンダー。「その日に記録したかどうか」を一覧より先に、
// パッと見て判断できるようにする（一覧は日付順の羅列で、抜けている日を
// 目で数えるのは向かないため）。
//
// 記録データそのものは持たない。日付ごとの件数（dateCounts）だけを受け取り、
// 選んだ日をrecords-view.tsxへ伝えるだけの見た目役。

import { dateKey } from '@/lib/format'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function buildMonthCells(year: number, month: number): (number | null)[] {
  const startWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function RecordCalendar({
  year,
  month, // 0-indexed（JSのDateと合わせる）
  dateCounts,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: {
  year: number
  month: number
  dateCounts: Map<string, number>
  selectedDate: string | null
  onSelectDate: (date: string | null) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}) {
  const cells = buildMonthCells(year, month)
  const todayKey = dateKey(new Date().toISOString())

  return (
    <div className="border border-line rounded-lg p-4 bg-sumi-2">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={onPrevMonth}
          aria-label="前の月"
          className="w-8 h-8 rounded-full border border-line text-nami-dim flex items-center justify-center"
        >
          ‹
        </button>
        <div className="font-body font-semibold">
          {year}年{month + 1}月
        </div>
        <button
          type="button"
          onClick={onNextMonth}
          aria-label="次の月"
          className="w-8 h-8 rounded-full border border-line text-nami-dim flex items-center justify-center"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-nami-dim mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />

          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const count = dateCounts.get(key) ?? 0
          const hasRecord = count > 0
          const isSelected = selectedDate === key
          const isToday = todayKey === key

          return (
            <button
              key={i}
              type="button"
              disabled={!hasRecord}
              onClick={() => onSelectDate(isSelected ? null : key)}
              className={`aspect-square rounded-md flex items-center justify-center text-xs font-bold transition-colors ${
                isSelected
                  ? 'bg-hi text-nami'
                  : hasRecord
                    ? 'bg-kin text-sumi hover:bg-kin-dim'
                    : 'text-nami-dim/60'
              } ${isToday && !isSelected ? 'ring-2 ring-kin' : ''}`}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
