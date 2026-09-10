import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { asRows } from '@/lib/supabase/rows'
import { buildClusterSummaries, type ClusterLocation } from '@/lib/clusters'
import { AuthButton } from './auth-button'
import { RecordList, type RecordRow } from './record-list'
import { ClusterList } from './cluster-list'
import { ClusterMapPanel } from './map/cluster-map-panel'
import { DashboardHome } from './dashboard-home'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: records } = user
    ? await supabase
        .from('records')
        .select('id, location_id, location_name, work_label, created_at, figures(name), locations(title_jp)')
        .order('created_at', { ascending: false })
    : { data: null }

  // クラスタ別の進捗（機能③「クラスタ別の進捗内訳」）に使う最小限の列だけを引く。
  // /map と同様、訪問済みは「その地点(location_id)に自分の記録があるか」で判定する。
  const { data: locations } = user
    ? await supabase.from('locations').select('id, number, title_jp, cluster, latitude, longitude')
    : { data: null }

  const { data: myRecords } = user
    ? await supabase.from('records').select('location_id').not('location_id', 'is', null)
    : { data: null }
  const visitedLocationIds = new Set((myRecords ?? []).map((r) => r.location_id as string))

  const clusterSummaries = buildClusterSummaries(asRows<ClusterLocation>(locations), visitedLocationIds)

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
              {/* 記録の作成は地点詳細（/locations/[id]）から行う（要件定義書 4-A・4-C）。
                  asRowsが何をしているかは lib/supabase/rows.ts を参照 */}
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
