'use client'

// カレンダーと一覧をセットで持つ。カレンダーで日付を選ぶと一覧をその日だけに
// 絞り込む、という状態のやり取りはこの1ファイルに閉じる
// （/records/page.tsxはサーバー側でデータを取るだけの薄いページのまま保つ）。

import { useMemo, useState } from 'react'
import { RecordList, type RecordRow } from '../record-list'
import { RecordOrderToggle, useRecordOrder } from '../record-timeline'
import { RecordCalendar } from './record-calendar'
import { dateKey } from '@/lib/format'
import { downloadTextFile, recordsToCsv } from '@/lib/export'

function effectiveDateKey(r: RecordRow): string | null {
  // 「その日に記録したか」を見たいので、保存日時（created_at）ではなく
  // 訪問日時（photographed_at）を優先する。他画面（location-records.tsx等）と
  // 同じ優先順位に揃えている。
  return dateKey(r.photographed_at ?? r.created_at)
}

/** 見出しの下に並べる3つの数字。これまでの往還の量をひと目で見せる */
function RecordStats({ records }: { records: RecordRow[] }) {
  const days = new Set(records.map(effectiveDateKey).filter(Boolean)).size
  const places = new Set(records.map((r) => r.location_id).filter(Boolean)).size
  const stats = [
    { label: '記録', value: records.length, unit: '件' },
    { label: '歩いた日', value: days, unit: '日' },
    { label: '訪れた地点', value: places, unit: '景' },
  ]
  return (
    <dl className="grid grid-cols-3 gap-2">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl bg-sumi-2 px-3 py-2.5 text-center">
          <dt className="text-[11px] text-nami-dim">{s.label}</dt>
          <dd className="mt-0.5">
            <span className="text-2xl font-bold text-hi tabular-nums">{s.value}</span>
            <span className="text-xs text-nami-dim ml-0.5">{s.unit}</span>
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function RecordsView({
  records,
  importPanel,
}: {
  records: RecordRow[]
  /** 数字の下・カレンダーの上に置く「写真からまとめて記録する」 */
  importPanel?: React.ReactNode
}) {
  const [order, setOrder] = useRecordOrder()
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

  function handleDownloadCsv() {
    // フィルタ中でも「全記録」をエクスポートする（機能④）ため、
    // selectedDateで絞り込んだfilteredではなくrecordsをそのまま使う。
    downloadTextFile(`okanroku-records-${dateKey(new Date().toISOString())}.csv`, recordsToCsv(records), 'text/csv', true)
  }

  return (
    <div className="space-y-4">
      {records.length > 0 && <RecordStats records={records} />}

      {importPanel}

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

      {records.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          <RecordOrderToggle order={order} onChange={setOrder} />
          <button type="button" onClick={handleDownloadCsv} className="text-xs text-kin underline">
            全記録をCSVで書き出す
          </button>
        </div>
      )}

      <RecordList records={filtered} order={order} />
    </div>
  )
}
