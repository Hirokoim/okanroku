'use client'

// ダッシュボードの入口。記録がまだ1件もない最初だけ、
// オープニングのカードを挟んでから「クラスター／記録・地図」のタブに入る。
// 一度でも記録があれば、次回からは最初からタブ画面に入る（毎回オープニングを
// 見せると、機能⑥が求める「スキップ可・読み返し可」の趣旨から外れるため）。

import { useState } from 'react'
import { DashboardTabs } from './dashboard-tabs'

export function DashboardHome({
  hasRecords,
  clusterView,
  recordsView,
}: {
  hasRecords: boolean
  clusterView: React.ReactNode
  recordsView: React.ReactNode
}) {
  const [started, setStarted] = useState(hasRecords)

  if (!started) {
    return (
      <div className="border border-line rounded-lg p-6 text-center space-y-3 bg-sumi-2">
        <p className="font-display font-semibold">北斎はどこに立っていたのか</p>
        <p className="text-nami-dim text-sm">46図ぶんの答え合わせが、まるごと残っています。</p>
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="inline-block bg-hi hover:bg-hi-bright text-nami rounded-full px-4 py-2 text-sm font-display transition-colors"
        >
          往還をはじめる
        </button>
      </div>
    )
  }

  return (
    <>
      <h2 className="font-display font-semibold">次はどこを目指しますか</h2>
      <DashboardTabs clusterView={clusterView} recordsView={recordsView} />
    </>
  )
}
