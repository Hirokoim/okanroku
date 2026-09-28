import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AuthButton } from '../auth-button'
import { signOut } from '../login/actions'
import { FontSizeSetting } from './font-size-setting'

// 設定タブ。当面は文字サイズ・よくある質問・ログアウトを置く（要件定義書5-Aの通り、
// 中身が薄くてもアカウント操作の定位置を先に作っておく。エクスポート等はPhase2で追加）。
//
// 見た目はスマホの設定画面に寄せ、「表示／ヘルプ／アカウント」の見出しごとに
// 行をまとめている。項目が増えたら、該当する見出しの中に行を足す。

/** 見出し付きの項目のまとまり */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs text-nami-dim px-1">{title}</h2>
      <div className="rounded-xl bg-sumi-2 divide-y divide-line overflow-hidden">{children}</div>
    </section>
  )
}

/** アカウントのカード右端に置く、小さな赤富士（ホームの見出し app/gaifu-hero.tsx と同じ図案） */
function MiniFuji() {
  return (
    <svg viewBox="0 0 60 36" className="w-16 h-auto shrink-0" aria-hidden="true">
      <path d="M0 36 L22 12 Q30 5 38 12 L60 36Z" fill="var(--hi)" />
      <path d="M25 9 Q30 5 35 9 L33 12 L30 10 L27 12Z" fill="var(--washi)" />
    </svg>
  )
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Googleアカウントの表示名（無ければメールアドレスの@より前）と、その頭文字
  const name =
    (user?.user_metadata?.full_name as string | undefined) || user?.email?.split('@')[0] || ''
  const initial = name.slice(0, 1).toUpperCase()

  return (
    <main className="max-w-[430px] mx-auto p-6 pb-24 space-y-6 w-full">
      <h1 className="text-xl font-body font-semibold">設定</h1>

      {user ? (
        <div className="rounded-xl bg-sumi-2 p-4 flex items-center gap-3 overflow-hidden">
          <div
            className="w-12 h-12 rounded-full bg-hi text-washi flex items-center justify-center text-lg font-bold shrink-0"
            aria-hidden="true"
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{name}</div>
            <div className="text-xs text-nami-dim truncate">{user.email}</div>
          </div>
          <MiniFuji />
        </div>
      ) : (
        <div className="rounded-xl bg-sumi-2 p-4">
          <AuthButton />
        </div>
      )}

      <Section title="表示">
        <div className="p-4">
          <FontSizeSetting />
        </div>
      </Section>

      <Section title="ヘルプ">
        <Link href="/faq" className="flex items-center gap-3 px-4 py-3.5 text-sm hover:bg-sumi-3 transition-colors">
          <span className="flex-1">よくある質問</span>
          <span className="text-hi text-lg leading-none" aria-hidden="true">
            ›
          </span>
        </Link>
      </Section>

      {user && (
        <Section title="アカウント">
          <form action={signOut}>
            <button
              type="submit"
              className="w-full text-left px-4 py-3.5 text-sm text-hi font-semibold hover:bg-sumi-3 transition-colors"
            >
              ログアウト
            </button>
          </form>
        </Section>
      )}

      <footer className="text-center pt-4 text-nami-dim">
        <div className="font-logo text-lg font-bold tracking-[0.2em] text-nami">往還録</div>
        <div className="text-xs mt-1">歴史上の人物が歩いた道を、もう一度</div>
      </footer>
    </main>
  )
}
