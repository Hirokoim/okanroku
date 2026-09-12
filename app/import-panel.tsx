'use client'

// ダッシュボードに畳んでおく「写真からまとめて記録する」の開閉だけを持つ。
// 見た目・保存処理は import-form.tsx が担当する（地点詳細のLocationRecordFormと同じ分担）。

import { useState } from 'react'
import { ImportForm } from './import-form'
import type { MatchableLocation } from '@/lib/location-match'

export function ImportPanel({
  userId,
  figureId,
  locations,
}: {
  userId: string
  figureId: string
  locations: MatchableLocation[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <details
      className="border border-line rounded-lg overflow-hidden"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="cursor-pointer select-none px-4 py-3 bg-sumi-2 font-display font-semibold text-sm flex items-center justify-between">
        写真からまとめて記録する
        <span className="text-xs text-nami-dim font-normal">帰宅後にまとめて</span>
      </summary>
      <div className="p-4 border-t border-line bg-sumi-2">
        <ImportForm userId={userId} figureId={figureId} locations={locations} />
      </div>
    </details>
  )
}
