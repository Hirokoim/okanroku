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
    return <p className="text-gray-500 text-sm">まだ記録がありません。</p>
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold">記録一覧</h2>
      <ul className="space-y-2">
        {records.map((r) => (
          <li key={r.id} className="border rounded p-3 text-sm">
            {/* location_idが設定されている記録はlocationsの正を表示し、
                未設定の記録（5-E⑦）だけlocation_nameの自由入力を使う */}
            <div className="font-medium">{r.locations?.title_jp || r.location_name}</div>
            <div className="text-gray-600">
              {r.figures?.name}
              {r.work_label ? ` ／ ${r.work_label}` : ''}
            </div>
            <div className="text-gray-400 text-xs">
              {formatDateTime(r.created_at)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
