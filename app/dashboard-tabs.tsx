'use client'

// 「次はどこを目指しますか」に対する2つの答え方（クラスタの一覧／開拓マップ）を
// 切り替えるタブ。データ取得はサーバー側（page.tsx）で済ませ、ここは組み立て済みの
// JSXを受け取って出し分けるだけ（5-Aの「呼び出される側は自分ではデータを取りに行かない」）。

import { useState } from 'react'

export function DashboardTabs({
  clusterView,
  mapView,
}: {
  clusterView: React.ReactNode
  mapView: React.ReactNode
}) {
  const [tab, setTab] = useState<'cluster' | 'map'>('cluster')

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('cluster')}
          className={`text-sm rounded-full px-4 py-2 font-display transition-colors ${
            tab === 'cluster' ? 'bg-hi text-nami' : 'border border-line text-nami-dim'
          }`}
        >
          次へ・クラスター
        </button>
        <button
          type="button"
          onClick={() => setTab('map')}
          className={`text-sm rounded-full px-4 py-2 font-display transition-colors ${
            tab === 'map' ? 'bg-hi text-nami' : 'border border-line text-nami-dim'
          }`}
        >
          開拓マップ
        </button>
      </div>

      {tab === 'cluster' ? clusterView : mapView}
    </div>
  )
}
