import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { asRows } from '@/lib/supabase/rows'
import { buildClusterSummaries, type ClusterLocation } from '@/lib/clusters'
import { AuthButton } from './auth-button'
import { RecordList, type RecordRow } from './record-list'
import { ClusterList } from './cluster-list'
import { ClusterMapPanel } from './map/cluster-map-panel'
import { DashboardHome } from './dashboard-home'
import { ImportPanel } from './import-panel'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: records } = user
    ? await supabase
        .from('records')
        .select('id, location_id, location_name, work_label, created_at, figures(name), locations(title_jp)')
        .order('created_at', { ascending: false })
    : { data: null }

  // クラスタ別の進捗（機能③「クラスタ別の進捗内訳」）と、一括取り込み（機能②・
  // 4-C）の地点候補探しの両方に使う。5-Aの方針通り、このマスタの取得は1本にまとめ、
  // 機能ごとに取り直さない。figure_idは一括取り込みが記録を作るときに使う
  // （Phase1はlocationsが北斎の46図のみのため、代表して1件目から拾えば足りる）。
  const { data: locations } = user
    ? await supabase.from('locations').select('id, figure_id, number, title_jp, cluster, latitude, longitude')
    : { data: null }

  const { data: myRecords } = user
    ? await supabase.from('records').select('location_id').not('location_id', 'is', null)
    : { data: null }
  const visitedLocationIds = new Set((myRecords ?? []).map((r) => r.location_id as string))

  const locationRows = asRows<ClusterLocation & { figure_id: string }>(locations)
  const clusterSummaries = buildClusterSummaries(locationRows, visitedLocationIds)
  // 46図はすべて北斎なので、どの1件からfigure_idを拾っても同じになる（Phase1の前提）。
  const figureId = locationRows[0]?.figure_id ?? null

  return (
    <main className="max-w-[430px] mx-auto p-6 space-y-8 w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-display font-semibold tracking-wide">往還録</h1>
        <AuthButton />
      </div>

      {user ? (
        <DashboardHome
          hasRecords={(records ?? []).length > 0}
          clusterView={<ClusterList summaries={clusterSummaries} />}
          mapView={<ClusterMapPanel clusters={clusterSummaries} />}
          recordsView={
            <div className="space-y-3">
              <Link href="/map" className="text-sm text-kin underline">
                訪問地図を見る
              </Link>
              {/* 記録の作成には2つの入口がある（要件定義書4-C）：地点詳細（/locations/[id]）
                  から作る経路と、ここでの一括取り込み。5-Aの「ルートは5つに収める」方針に
                  従い、一括取り込みは新しいルートを作らず / に畳んで置く。
                  asRowsが何をしているかは lib/supabase/rows.ts を参照 */}
              {figureId && <ImportPanel userId={user.id} figureId={figureId} locations={locationRows} />}
              <RecordList records={asRows<RecordRow>(records)} />
            </div>
          }
        />
      ) : (
        <p className="text-nami-dim">記録を見るにはログインしてください。</p>
      )}
    </main>
  )
}
