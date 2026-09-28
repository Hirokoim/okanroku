'use client'

// 記録タブの一覧。地点をまたいだすべての記録を、日付ごとのタイムライン
// （app/record-timeline.tsx）で見せる。地点詳細の記録一覧と同じ見た目・同じ並び順設定。

import Link from 'next/link'
import { timePeriodFromDatetime, timePeriodLabel } from '@/lib/time-period'
import { TimelineDay, groupByDay, type RecordOrder } from './record-timeline'

export type RecordRow = {
  id: string
  location_id: string | null
  location_name: string
  work_label: string | null
  photographed_at: string | null
  created_at: string
  figures: { name: string } | null
  locations: { title_jp: string } | null
}

function RecordCard({ record: r }: { record: RecordRow }) {
  // location_idが設定されている記録はlocationsの正を表示し、
  // 未設定の記録（5-E⑦）だけlocation_nameの自由入力を使う
  const title = r.locations?.title_jp || r.location_name
  const period = timePeriodLabel(timePeriodFromDatetime(r.photographed_at))

  const body = (
    <>
      <div className="flex-1 min-w-0">
        <div className="font-semibold">{title || '（地点未設定）'}</div>
        <div className="text-xs text-nami-dim mt-0.5">
          {[period, r.figures?.name, r.work_label].filter(Boolean).join('・')}
        </div>
      </div>
      {r.location_id && (
        <span className="text-hi text-lg leading-none shrink-0" aria-hidden="true">
          ›
        </span>
      )}
    </>
  )

  const cardClass = 'flex items-center gap-3 rounded-xl bg-sumi-2 px-3 py-3 text-sm'

  return (
    <li>
      {r.location_id ? (
        <Link href={`/locations/${r.location_id}`} className={`${cardClass} hover:bg-sumi-3 transition-colors`}>
          {body}
        </Link>
      ) : (
        <div className={cardClass}>{body}</div>
      )}
    </li>
  )
}

export function RecordList({ records, order }: { records: RecordRow[]; order: RecordOrder }) {
  if (records.length === 0) {
    return <p className="text-nami-dim text-sm">まだ記録がありません。地点を選んで書きとめてみましょう。</p>
  }

  const groups = groupByDay(records, order)

  return (
    <ol>
      {groups.map((g, i) => (
        <TimelineDay key={g.key + i} date={g.date} count={g.records.length} isLast={i === groups.length - 1}>
          {g.records.map((r) => (
            <RecordCard key={r.id} record={r} />
          ))}
        </TimelineDay>
      ))}
    </ol>
  )
}
