'use client'

// 常時表示のボトムナビゲーション。4つの行き先はいずれも「今どこにいても
// すぐ戻れるべき」トップレベルの画面で、往還録の主要な役割にそれぞれ対応する。
//
//   往還（/）    … 次はどこを目指すか（クラスタ一覧・開拓マップ）
//   地図（/map） … 46地点の訪問状況を俯瞰する
//   記録（/records） … これまで書きとめたものを時系列で見返す・新しく記録する
//   設定（/settings） … アカウント（当面はログアウトのみ）
//
// ログインしていないときは表示しない（app/layout.tsxが判定して出し分ける）。

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = {
  href: string
  label: string
  icon: (props: { active: boolean }) => React.ReactNode
}

function OkanIcon({ active }: { active: boolean }) {
  // 「往還」＝行って帰る、を上下2本の矢印で表す
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={active ? 2.1 : 1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8h11l-3-3M18 8l-3 3" />
      <path d="M18 16H7l3 3M6 16l3-3" />
    </svg>
  )
}

function MapIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={active ? 2.1 : 1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4.5 4 6.5v13l5-2 6 2 5-2v-13l-5 2-6-2Z" />
      <path d="M9 4.5v13M15 6.5v13" />
    </svg>
  )
}

function RecordIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={active ? 2.1 : 1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3.5h9l3.5 3.5V20a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5Z" />
      <path d="M9 12h6M9 15.5h6" />
    </svg>
  )
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={active ? 2.1 : 1.7} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 3.5v2.3M12 18.2v2.3M20.5 12h-2.3M5.8 12H3.5M17.7 6.3l-1.6 1.6M7.9 16.1l-1.6 1.6M17.7 17.7l-1.6-1.6M7.9 7.9 6.3 6.3" />
    </svg>
  )
}

const ITEMS: NavItem[] = [
  { href: '/', label: '往還', icon: OkanIcon },
  { href: '/map', label: '地図', icon: MapIcon },
  { href: '/records', label: '記録', icon: RecordIcon },
  { href: '/settings', label: '設定', icon: SettingsIcon },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-line bg-sumi-2">
      <ul className="max-w-[430px] mx-auto grid grid-cols-4">
        {ITEMS.map((item) => {
          // "/"だけは完全一致、それ以外は配下のページ（/locations/[id]など）でも
          // 対応するタブを光らせたいので前方一致で判定する。
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${
                  active ? 'text-kin' : 'text-nami-dim'
                }`}
              >
                <item.icon active={active} />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
