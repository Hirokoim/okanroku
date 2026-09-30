import { createClient } from '@/lib/supabase/server'
import { getCurrentFigure } from '@/lib/current-figure'
import { FigureAvatar } from '../figure-avatar'
import { selectFigure } from './actions'

// 人物を選ぶ画面。figures（人物マスタ）の全員を、丸い肖像の2列で並べる。
// ホームの見出しにある人物の札（app/gaifu-hero.tsx）から来る。
//
// 地点データ（locations）がある人物だけ選べる。まだ無い人物も「準備中」として
// シルエットで並べておく（どんな人物が控えているかが見えるように。要件定義書の
// 「figuresは全ユーザーに公開する。どの人物が存在するかが見えないと選びようがない」）。
//
// 選ぶと、その人物をCookieに覚えてホームへ戻る（app/figures/actions.ts）。
// ホーム・地図・作品一覧は、選んだ人物の地点だけを出す（lib/current-figure.ts）。

type FigureRow = { id: string; slug: string; name: string; theme: string | null }

export default async function FiguresPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="max-w-[430px] mx-auto p-6 pb-24 w-full">
        <p className="text-nami-dim">人物を選ぶにはログインしてください。</p>
      </main>
    )
  }

  const [{ data: figures }, { data: locations }, current] = await Promise.all([
    supabase.from('figures').select('id, slug, name, theme').order('created_at'),
    supabase.from('locations').select('figure_id'),
    getCurrentFigure(),
  ])

  // 人物ごとの地点の数。0の人物は「準備中」にする
  const locationCount = new Map<string, number>()
  for (const l of locations ?? []) {
    locationCount.set(l.figure_id, (locationCount.get(l.figure_id) ?? 0) + 1)
  }

  // 選べる人物を先に並べる（同じ条件の中では登録順のまま）
  const rows: FigureRow[] = [...(figures ?? [])].sort(
    (a, b) => Number((locationCount.get(b.id) ?? 0) > 0) - Number((locationCount.get(a.id) ?? 0) > 0)
  )

  return (
    <main className="max-w-[430px] mx-auto p-6 pb-24 space-y-5 w-full">
      <div>
        <h1 className="text-xl font-body font-semibold">誰の足跡をたどりますか</h1>
        <p className="text-sm text-nami-dim mt-1">歴史上の人物が歩いた道を、ひとりずつ。</p>
      </div>

      <ul className="grid grid-cols-2 gap-3">
        {rows.map((f) => {
          const count = locationCount.get(f.id) ?? 0
          const ready = count > 0
          const selected = ready && f.name === current.meta.name
          const body = (
            <>
              <FigureAvatar name={f.name} decorative className="w-28 h-28 mx-auto" />
              <div className="mt-3 text-center">
                <div className="font-body font-bold">{f.name}</div>
                <div className="text-xs text-nami-dim mt-0.5">
                  {ready ? `${f.theme ? `${f.theme}・` : ''}${count}地点` : '準備中'}
                </div>
                {selected && <div className="text-xs text-hi font-semibold mt-1">たどっている人物</div>}
              </div>
            </>
          )
          return (
            <li key={f.id}>
              {ready ? (
                // 選んだ人物をCookieに書くため、リンクではなくフォームのボタンにする
                // （Cookieの書き込みはServer Actionでしかできない）
                <form action={selectFigure} className="h-full">
                  <input type="hidden" name="name" value={f.name} />
                  <button
                    type="submit"
                    aria-current={selected ? 'true' : undefined}
                    className={`block w-full h-full rounded-xl bg-sumi-2 hover:bg-sumi-3 transition-colors px-3 py-4 ${
                      selected ? 'ring-2 ring-hi' : ''
                    }`}
                  >
                    {body}
                  </button>
                </form>
              ) : (
                <div className="h-full rounded-xl bg-sumi-2 px-3 py-4 opacity-70" aria-disabled="true">
                  {body}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </main>
  )
}
