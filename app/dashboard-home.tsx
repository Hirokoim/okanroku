'use client'

// ダッシュボードの入口。記録がまだ1件もない最初だけ、
// オープニングのカードを挟んでから「クラスター／記録・地図」のタブに入る。
// 一度でも記録があれば、次回からは最初からタブ画面に入る（毎回オープニングを
// 見せると、機能⑥が求める「スキップ可・読み返し可」の趣旨から外れるため）。

import { useState } from 'react'
import { DashboardTabs } from './dashboard-tabs'
import { useFigureMeta } from './figure-context'

export function DashboardHome({
  hasRecords,
  locationCount,
  clusterView,
  mapView,
}: {
  hasRecords: boolean
  /** いま選んでいる人物の地点（作品）の数。オープニングの「◯図ぶん」に使う */
  locationCount: number
  clusterView: React.ReactNode
  mapView: React.ReactNode
}) {
  const figure = useFigureMeta()
  const [started, setStarted] = useState(hasRecords)

  if (!started) {
    return (
      <div className="border border-line rounded-lg p-6 text-center space-y-3 bg-sumi-2">
        <p className="font-body font-semibold">{figure.short}はどこに立っていたのか</p>
        <p className="text-nami-dim text-sm">{locationCount}図ぶんの答え合わせが、まるごと残っています。</p>
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="inline-block bg-hi hover:bg-hi-hover text-washi rounded-full px-4 py-2 text-sm font-body font-semibold transition-colors"
        >
          往還をはじめる
        </button>
      </div>
    )
  }

  // 記録一覧はここに含めない。この画面のタブは「次はどこを目指しますか」への
  // 2通りの答え方（一覧で選ぶ／地図で見る）であり、これまでの記録は
  // その問いの答えではないため（要件定義書4-Aの画面2と画面14の違い）。
  return (
    <div className="space-y-4">
      <h2 className="font-body font-semibold">次はどこを目指しますか</h2>
      <DashboardTabs clusterView={clusterView} mapView={mapView} />
    </div>
  )
}
