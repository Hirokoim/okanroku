'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ClusterSummary } from '@/lib/clusters'
import { ClusterJourneyOverlay, type JourneyPhase } from './cluster-journey'

// 3状態のバッジ。色は機能③「クラスタ別の進捗内訳」の見せ方で、
// 富士の見え方バッジ（lib/labels.ts）とは別の意味の色分けなので独自に持つ。
const STATUS_STYLE: Record<ClusterSummary['status'], { label: string; className: string }> = {
  complete: { label: '踏破済み', className: 'bg-matsu text-sumi' },
  partial: { label: '一部記録', className: 'bg-kin-dim text-sumi' },
  none: { label: '未踏', className: 'border border-hi-bright text-hi-bright' },
}

// トランジション（フラッシュ演出）を見せておく最短時間。
// クリックした瞬間に確認シートへ飛ぶと演出が一瞬で終わり効果が出ないため、
// 短い時間だけ強制的に待たせる（UXプロトタイプの遷移画面と同じ考え方）。
const TRANSITION_MS = 650

export function ClusterList({ summaries }: { summaries: ClusterSummary[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<ClusterSummary | null>(null)
  const [phase, setPhase] = useState<JourneyPhase | null>(null)

  function selectCluster(c: ClusterSummary) {
    setSelected(c)
    setPhase('transition')
    window.setTimeout(() => setPhase('confirm'), TRANSITION_MS)
  }

  function cancel() {
    setSelected(null)
    setPhase(null)
  }

  function confirm() {
    if (!selected) return
    router.push(`/map?cluster=${encodeURIComponent(selected.name)}`)
  }

  if (summaries.length === 0) {
    return <p className="text-nami-dim text-sm">クラスタが未設定です。</p>
  }

  return (
    <>
      <ul className="space-y-2">
        {summaries.map((c) => {
          const style = STATUS_STYLE[c.status]
          return (
            <li key={c.name}>
              <button
                type="button"
                onClick={() => selectCluster(c)}
                className="w-full text-left border border-line rounded-lg p-4 bg-sumi-2 hover:bg-sumi-3 transition-colors flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-body font-semibold">{c.name}</div>
                  <div className="text-nami-dim text-sm">
                    {c.total}図・最大{c.maxKm !== null ? `${c.maxKm.toFixed(1)}km` : '―'}
                  </div>
                </div>
                <span className={`text-xs rounded-full px-3 py-1 whitespace-nowrap ${style.className}`}>
                  {style.label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {selected && phase && (
        <ClusterJourneyOverlay cluster={selected} phase={phase} onCancel={cancel} onConfirm={confirm} />
      )}
    </>
  )
}
