'use client'

// クラスタ一覧（cluster-list.tsx）でクラスタを選んだときの、選択後の演出。
// 「①全画面フラッシュで地名が浮かぶ→②下シートで行き先を確認→③承諾で地図へ」
// という3段階を持つ。見た目はUXプロトタイプ（往還録プロトタイプ）の
// transition/confirm画面を踏襲している。
//
// 状態そのものはここでは持たない。cluster-list.tsxが「今どのクラスタを、
// どの段階で選んでいるか」を持ち、このコンポーネントは受け取って描くだけ。

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ClusterSummary } from '@/lib/clusters'

export type JourneyPhase = 'transition' | 'confirm'

// トランジション（フラッシュ演出）を見せておく最短時間。
// クリックした瞬間に確認シートへ飛ぶと演出が一瞬で終わり効果が出ないため、
// 短い時間だけ強制的に待たせる（UXプロトタイプの遷移画面と同じ考え方）。
const TRANSITION_MS = 650

/** クラスタ一覧・開拓マップの両方から使う「選ぶ→演出→確認→地図へ」の流れ */
export function useClusterJourney() {
  const router = useRouter()
  const [selected, setSelected] = useState<ClusterSummary | null>(null)
  const [phase, setPhase] = useState<JourneyPhase | null>(null)

  function start(c: ClusterSummary) {
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

  const overlay =
    selected && phase ? (
      <ClusterJourneyOverlay cluster={selected} phase={phase} onCancel={cancel} onConfirm={confirm} />
    ) : null

  return { start, overlay }
}

// useClusterJourneyが自分で組み立てて返すため、外から直接使うことはない。
function ClusterJourneyOverlay({
  cluster,
  phase,
  onCancel,
  onConfirm,
}: {
  cluster: ClusterSummary
  phase: JourneyPhase
  onCancel: () => void
  onConfirm: () => void
}) {
  // クラスタ名は「令制国・場所」の形（docs/clusters.md）。フラッシュ演出では
  // 「場所」側だけを大きく見せたいため、・以降を取り出す（無ければ全体を使う）。
  const shortName = cluster.name.split('・')[1] ?? cluster.name

  if (phase === 'transition') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-sumi" aria-hidden="true">
        <div
          className="okr-transition-flash absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 50% 50%, var(--hi-bright), var(--hi) 40%, var(--ai-deep) 100%)',
          }}
        />
        <div className="okr-transition-word relative font-body font-semibold text-3xl tracking-[0.3em] text-nami">
          {shortName}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="クラスタ選択の確認">
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, var(--ai-deep) 0%, var(--sumi) 75%)' }}
        onClick={onCancel}
      />
      <div className="relative rounded-t-3xl bg-sumi-3 border-t border-line p-6 pb-8 space-y-4">
        <div className="text-xs tracking-widest text-kin-dim">{cluster.name}</div>
        <h2 className="font-body font-semibold text-xl">{cluster.name}へ</h2>
        <p className="text-sm text-nami-dim leading-relaxed">
          {cluster.total}図・最大{cluster.maxKm !== null ? `${cluster.maxKm.toFixed(1)}km` : '―'}
          。おすすめの回り方を地図で見られます。
        </p>
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 border border-line rounded-full py-3 text-sm text-nami-dim"
          >
            いいえ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 bg-hi hover:bg-hi-hover text-nami rounded-full py-3 text-sm font-body font-semibold transition-colors"
          >
            ここへ、行きます
          </button>
        </div>
      </div>
    </div>
  )
}
