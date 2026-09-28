'use client'

// 記録タブの一覧。地点をまたいだすべての記録を、日付ごとのタイムライン
// （app/record-timeline.tsx）で見せる。地点詳細の記録一覧と同じ見た目・同じ並び順設定。

import Link from 'next/link'
import { timePeriodFromDatetime, timePeriodLabel } from '@/lib/time-period'
import { weatherCodeIcon, type WeatherSnapshot } from '@/lib/weather'
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

/** 一覧のカードに出す分の情報を足した記録（CSVの書き出しはRecordRowの項目だけを使う） */
export type RecordListItem = RecordRow & {
  weather: WeatherSnapshot | null
  /** 1枚目の写真。写真が無い記録はnull */
  cover: { url: string | null; unsupportedFormat: boolean } | null
  photoCount: number
}

/** カード左の写真。枚数が2枚以上なら右下に枚数を添える */
function CoverThumb({ cover, count }: { cover: RecordListItem['cover']; count: number }) {
  const frame = 'relative w-16 h-16 rounded-lg border-2 border-white overflow-hidden shrink-0 bg-sumi-3'
  if (!cover) {
    // 写真の無い記録も、カードの並びが揃うように同じ大きさの枠を置く
    return (
      <div className={`${frame} grid place-items-center text-nami-dim`} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3.5h9l3.5 3.5V20a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5Z" />
          <path d="M9 12h6M9 15.5h6" />
        </svg>
      </div>
    )
  }
  return (
    <div className={frame}>
      {cover.url && !cover.unsupportedFormat ? (
        // eslint-disable-next-line @next/next/no-img-element -- 有効期限付きの署名URLのためnext/imageの最適化対象にしない
        <img src={cover.url} alt="" className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <span className="w-full h-full grid place-items-center text-nami-dim text-[10px] leading-tight text-center px-1">
          {cover.unsupportedFormat ? 'HEIC' : '読込不可'}
        </span>
      )}
      {count > 1 && (
        <span className="absolute right-0.5 bottom-0.5 rounded-full bg-nami/70 text-washi text-[10px] leading-none px-1.5 py-0.5">
          {count}枚
        </span>
      )}
    </div>
  )
}

function RecordCard({ record: r }: { record: RecordListItem }) {
  // location_idが設定されている記録はlocationsの正を表示し、
  // 未設定の記録（5-E⑦）だけlocation_nameの自由入力を使う
  const title = r.locations?.title_jp || r.location_name
  const period = timePeriodLabel(timePeriodFromDatetime(r.photographed_at))

  const body = (
    <>
      <CoverThumb cover={r.cover} count={r.photoCount} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold">{title || '（地点未設定）'}</div>
        <div className="text-xs text-nami-dim mt-0.5">
          {[period, r.figures?.name, r.work_label].filter(Boolean).join('・')}
        </div>
        {r.weather && (
          <div className="text-xs text-ai-deep mt-1">
            {weatherCodeIcon(r.weather.weathercode)} {r.weather.description}
            {r.weather.temperature !== null && ` ${r.weather.temperature}℃`}
          </div>
        )}
      </div>
      {r.location_id && (
        <span className="text-hi text-lg leading-none shrink-0" aria-hidden="true">
          ›
        </span>
      )}
    </>
  )

  const cardClass = 'flex items-center gap-3 rounded-xl bg-sumi-2 p-2.5 text-sm'

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

export function RecordList({ records, order }: { records: RecordListItem[]; order: RecordOrder }) {
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
