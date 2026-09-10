import type { ClusterSummary } from '@/lib/clusters'

// 3状態のバッジ。色は機能③「クラスタ別の進捗内訳」の見せ方で、
// 富士の見え方バッジ（lib/labels.ts）とは別の意味の色分けなので独自に持つ。
const STATUS_STYLE: Record<ClusterSummary['status'], { label: string; className: string }> = {
  complete: { label: '踏破済み', className: 'bg-matsu text-nami' },
  partial: { label: '一部記録', className: 'bg-kin-dim text-nami' },
  none: { label: '未踏', className: 'border border-hi text-hi-bright' },
}

export function ClusterList({ summaries }: { summaries: ClusterSummary[] }) {
  if (summaries.length === 0) {
    return <p className="text-nami-dim text-sm">クラスタが未設定です。</p>
  }

  return (
    <ul className="space-y-2">
      {summaries.map((c) => {
        const style = STATUS_STYLE[c.status]
        return (
          <li
            key={c.name}
            className="border border-line rounded-lg p-4 bg-sumi-2 flex items-center justify-between gap-3"
          >
            <div>
              <div className="font-display font-semibold">{c.name}</div>
              <div className="text-nami-dim text-sm">
                {c.total}図・最大{c.maxKm !== null ? `${c.maxKm.toFixed(1)}km` : '―'}
              </div>
            </div>
            <span className={`text-xs rounded-full px-3 py-1 whitespace-nowrap ${style.className}`}>
              {style.label}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
