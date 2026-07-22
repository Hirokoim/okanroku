export type RecordRow = {
  id: string
  location_name: string
  work_label: string | null
  diff_type: string | null
  created_at: string
  figures: { name: string } | null
}

const diffLabel: { [key: string]: string } = {
  unchanged: '変わらない',
  changed: '変わった',
  lost: '消失',
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
            <div className="font-medium">{r.location_name}</div>
            <div className="text-gray-600">
              {r.figures?.name}
              {r.work_label ? ` ／ ${r.work_label}` : ''}
              {r.diff_type ? ` ／ ${diffLabel[r.diff_type]}` : ''}
            </div>
            <div className="text-gray-400 text-xs">
              {new Date(r.created_at).toLocaleString('ja-JP')}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
