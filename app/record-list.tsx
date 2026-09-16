import Link from 'next/link'
import { formatDateTime } from '@/lib/format'

export type RecordRow = {
  id: string
  location_id: string | null
  location_name: string
  work_label: string | null
  created_at: string
  figures: { name: string } | null
  locations: { title_jp: string } | null
}

export function RecordList({ records }: { records: RecordRow[] }) {
  if (records.length === 0) {
    return <p className="text-nami-dim text-sm">まだ記録がありません。地点を選んで書きとめてみましょう。</p>
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {records.map((r) => {
          const title = r.locations?.title_jp || r.location_name
          const body = (
            <>
              {/* location_idが設定されている記録はlocationsの正を表示し、
                  未設定の記録（5-E⑦）だけlocation_nameの自由入力を使う */}
              <div className="font-medium">{title || '（地点未設定）'}</div>
              <div className="text-nami-dim">
                {r.figures?.name}
                {r.work_label ? ` ／ ${r.work_label}` : ''}
              </div>
              <div className="text-nami-dim text-xs mt-1">{formatDateTime(r.created_at)}</div>
            </>
          )

          const cardClass =
            'block border-y border-r border-line border-l-4 border-l-kin-dim rounded-lg p-3 text-sm bg-sumi-3 shadow-[0_2px_6px_rgba(0,0,0,0.35)]'

          return (
            <li key={r.id}>
              {r.location_id ? (
                <Link href={`/locations/${r.location_id}`} className={`${cardClass} hover:bg-sumi-4 transition-colors`}>
                  {body}
                </Link>
              ) : (
                <div className={cardClass}>{body}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
