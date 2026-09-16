'use client'

// カレンダーと一覧をセットで持つ。カレンダーで日付を選ぶと一覧をその日だけに
// 絞り込む、という状態のやり取りはこの1ファイルに閉じる
// （/records/page.tsxはサーバー側でデータを取るだけの薄いページのまま保つ）。

import { useMemo, useState } from 'react'
import { RecordList, type RecordRow } from '../record-list'
import { RecordCalendar } from './record-calendar'
import { dateKey } from '@/lib/format'

function effectiveDateKey(r: RecordRow): string | null {
  // 「その日に記録したか」を見たいので、保存日時（created_at）ではなく
  // 訪問日時（photographed_at）を優先する。他画面（location-records.tsx等）と
  // 同じ優先順位に揃えている。
  return dateKey(r.photographed_at ?? r.created_at)
}

export function RecordsView({ records }: { records: RecordRow[] }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const dateCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of records) {
      const key = effectiveDateKey(r)
      if (!key) continue
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [records])

  const filtered = useMemo(
    () => (selectedDate ? records.filter((r) => effectiveDateKey(r) === selectedDate) : records),
    [records, selectedDate]
  )

  function goToPrevMonth() {
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }))
  }

  function goToNextMonth() {
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }))
  }

  return (
    <div className="space-y-4">
      <RecordCalendar
        year={cursor.year}
        month={cursor.month}
        dateCounts={dateCounts}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onPrevMonth={goToPrevMonth}
        onNextMonth={goToNextMonth}
      />

      {selectedDate && (
        <div className="flex items-center justify-between text-sm px-1">
          <span className="text-nami-dim">
            {selectedDate.replace(/-/g, '/')}の記録（{filtered.length}件）
          </span>
          <button type="button" onClick={() => setSelectedDate(null)} className="text-kin underline text-xs">
            すべて表示
          </button>
        </div>
      )}

      <RecordList records={filtered} />
    </div>
  )
}
