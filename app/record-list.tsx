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
    return (
      <div className="border border-line rounded-lg p-6 text-center space-y-3 bg-sumi-2">
        <p className="font-display font-semibold">北斎はどこに立っていたのか</p>
        <p className="text-nami-dim text-sm">46図ぶんの答え合わせが、まるごと残っています。</p>
        <Link
          href="/map"
          className="inline-block bg-hi hover:bg-hi-bright text-nami rounded-full px-4 py-2 text-sm font-display transition-colors"
        >
          地図をひらく
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="font-display font-semibold">記録一覧</h2>
      <ul className="space-y-2">
        {records.map((r) => (
          <li key={r.id} className="border border-line rounded p-3 text-sm bg-sumi-2">
            {/* location_idが設定されている記録はlocationsの正を表示し、
                未設定の記録（5-E⑦）だけlocation_nameの自由入力を使う */}
            <div className="font-medium">{r.locations?.title_jp || r.location_name}</div>
            <div className="text-nami-dim">
              {r.figures?.name}
              {r.work_label ? ` ／ ${r.work_label}` : ''}
            </div>
            <div className="text-nami-dim text-xs">
              {formatDateTime(r.created_at)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
