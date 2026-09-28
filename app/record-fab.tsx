'use client'

// どの画面からでも記録を始められる、右下の丸い「記録する」ボタン。
// 記録タブの一番下にある入口は見落としやすいため、常に同じ場所に置く。
//
//   地点詳細（/locations/[id]）… その地点の記録フォームを開いて移動する
//   それ以外                    … 写真からまとめて記録する画面（/records/new）へ
//
// ボトムナビの「記録」タブ（一覧）と区別するため、ラベルは動詞の「記録する」にし、
// アイコンだけでなく文字も添える。ログイン時のみ表示（app/layout.tsxが判定）。

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const RECORD_FORM_HASH = 'record-form'

function BrushIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M19.5 3.5 12 11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="M12 11c-1.9-1-4.2-.1-4.9 2.2-.8 2.6-2.5 4.5-3.6 5.4 2.7.3 6.8-.6 8.7-3.1 1.3-1.7 1.1-3.6-.2-4.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function RecordFab() {
  const pathname = usePathname()
  if (pathname === '/records/new') return null

  const onLocationPage = pathname.startsWith('/locations/')
  // 地図画面では右下に地図の出典表示が来るため、ボタンを少し上げて重ならないようにする
  const lifted = pathname.startsWith('/map')

  return (
    // 幅430pxのアプリ本体の右端に揃える（広い画面でも画面の端に離れすぎないように）
    <div
      className="fixed z-40 pointer-events-none inset-x-0"
      style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${lifted ? 128 : 80}px)` }}
    >
      <div className="max-w-[430px] mx-auto flex justify-end px-4">
        <Link
          href={onLocationPage ? `#${RECORD_FORM_HASH}` : '/records/new'}
          className="pointer-events-auto flex flex-col items-center justify-center gap-0.5 w-16 h-16 rounded-full bg-hi hover:bg-hi-hover text-nami border-2 border-kin shadow-[0_4px_14px_rgba(0,0,0,0.5)] transition-colors"
        >
          <BrushIcon />
          <span className="text-[0.6875rem] font-semibold leading-none">記録する</span>
        </Link>
      </div>
    </div>
  )
}
