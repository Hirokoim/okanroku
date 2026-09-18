import { createClient } from '@/lib/supabase/server'
import { asRows } from '@/lib/supabase/rows'
import type { RecordRow } from '../record-list'
import { RecordsView } from './records-view'
import { ImportPanel } from '../import-panel'
import type { MatchableLocation } from '@/lib/location-match'

// 記録タブ。地点横断で時系列に見返す一覧と、写真からまとめて記録する入口
// （要件定義書4-C・機能②）をここに置く。ダッシュボード（/）からは
// 「次はどこを目指すか」の問いと直接関係しないため2026-09-16に分離した
// （dashboard-home.tsxに以前あった経緯コメント参照）。
export default async function RecordsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: records } = user
    ? await supabase
        .from('records')
        .select(
          'id, location_id, location_name, work_label, photographed_at, created_at, figures(name), locations(title_jp)'
        )
        .order('created_at', { ascending: false })
    : { data: null }

  // 一括取り込み（ImportPanel）は地点候補探しに46図の座標が要る。
  // Phase1はlocationsが北斎のみのため、代表して1件目からfigure_idを拾えば足りる
  // （app/page.tsxの元の実装と同じ前提）。
  const { data: locations } = user
    ? await supabase.from('locations').select('id, figure_id, number, title_jp, latitude, longitude')
    : { data: null }

  const locationRows = asRows<MatchableLocation & { figure_id: string }>(locations)
  const figureId = locationRows[0]?.figure_id ?? null

  return (
    <main className="max-w-[430px] mx-auto p-6 pb-24 space-y-4 w-full">
      <h1 className="text-xl font-body font-semibold">
        記録
        {user && <span className="text-sm font-normal text-nami-dim ml-2">{(records ?? []).length}件</span>}
      </h1>

      {user ? (
        <div className="space-y-4">
          {figureId && <ImportPanel userId={user.id} figureId={figureId} locations={locationRows} />}
          <RecordsView records={asRows<RecordRow>(records)} />
        </div>
      ) : (
        <p className="text-nami-dim">記録を見るにはログインしてください。</p>
      )}
    </main>
  )
}
