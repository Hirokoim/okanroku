import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { asRows } from '@/lib/supabase/rows'
import { ImportForm } from '../../import-form'
import type { MatchableLocation } from '@/lib/location-match'

// 「記録する」ボタン（app/record-fab.tsx）の行き先。写真から地点を自動で振り分けて
// 記録を作るので、地点を先に選ばなくても、どの画面からでも同じ流れで始められる。
export default async function NewRecordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 地点候補探しに46図の座標が要る。Phase1はlocationsが北斎のみのため、
  // 代表して1件目からfigure_idを拾えば足りる（app/records/page.tsxと同じ前提）。
  const { data: locations } = user
    ? await supabase.from('locations').select('id, figure_id, number, title_jp, latitude, longitude')
    : { data: null }

  const locationRows = asRows<MatchableLocation & { figure_id: string }>(locations)
  const figureId = locationRows[0]?.figure_id ?? null

  return (
    <main className="max-w-[430px] mx-auto p-6 pb-24 space-y-4 w-full">
      <Link href="/records" className="text-sm text-kin underline">
        ← 記録一覧に戻る
      </Link>
      <div>
        <h1 className="text-xl font-body font-semibold">記録する</h1>
        <p className="text-sm text-nami-dim mt-1">写真を選ぶと、撮影地から地点を自動で振り分けます。</p>
      </div>

      {!user ? (
        <p className="text-nami-dim">記録するにはログインしてください。</p>
      ) : figureId ? (
        <div className="border border-line rounded-lg p-4 bg-sumi-2">
          <ImportForm userId={user.id} figureId={figureId} locations={locationRows} />
        </div>
      ) : (
        <p className="text-nami-dim">地点データが見つかりませんでした。</p>
      )}
    </main>
  )
}
