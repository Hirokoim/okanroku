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
      className="rounded-xl overflow-hidden bg-sumi-2"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="cursor-pointer select-none list-none px-4 py-3 flex items-center gap-3 [&::-webkit-details-marker]:hidden">
        {/* カメラの絵。写真から記録を起こす入口であることを、文字を読む前に伝える */}
        <span className="w-9 h-9 rounded-full bg-hi text-washi flex items-center justify-center shrink-0" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8h3l1.5-2h7L17 8h3v11H4Z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-body font-semibold text-sm">写真からまとめて記録する</span>
          <span className="block text-xs text-nami-dim">帰宅後に、撮った写真からまとめて</span>
        </span>
        <span className={`text-hi text-lg leading-none transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden="true">
          ›
        </span>
      </summary>
      <div className="p-4 border-t border-line">
        <ImportForm userId={userId} figureId={figureId} locations={locations} />
      </div>
    </details>
  )
}
