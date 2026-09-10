'use client'

// ダッシュボードの2つの見せ方（クラスタ選び／記録・地図）を切り替えるタブ。
// データ取得はサーバー側（page.tsx）で済ませ、ここは組み立て済みのJSXを
// 受け取って出し分けるだけ（5-Aの「呼び出される側は自分ではデータを取りに行かない」）。

import { useState } from 'react'

export function DashboardTabs({
  clusterView,
  recordsView,
}: {
  clusterView: React.ReactNode
  recordsView: React.ReactNode
}) {
  const [tab, setTab] = useState<'cluster' | 'records'>('cluster')

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
          onClick={() => setTab('records')}
          className={`text-sm rounded-full px-4 py-2 font-display transition-colors ${
            tab === 'records' ? 'bg-hi text-nami' : 'border border-line text-nami-dim'
          }`}
        >
          記録・地図
        </button>
      </div>

      {tab === 'cluster' ? clusterView : recordsView}
    </div>
  )
}
