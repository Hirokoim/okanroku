import { createClient } from '@/lib/supabase/server'
import { asRows } from '@/lib/supabase/rows'
import { buildClusterSummaries, type ClusterLocation } from '@/lib/clusters'
import { ClusterList } from './cluster-list'
import { ClusterMapPanel } from './map/cluster-map-panel'
import { DashboardHome } from './dashboard-home'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // オープニングを見せるかどうかの判定にしか使わないため、行の中身は取らず件数だけ数える。
  // 一覧そのものは/recordsが持つ（2026-09-16、ボトムナビ導入にあわせて分離）。
  const { count: recordCount } = user
    ? await supabase.from('records').select('id', { count: 'exact', head: true })
    : { count: 0 }

  // クラスタ別の進捗（機能③「クラスタ別の進捗内訳」）に使う地点マスタ。
  const { data: locations } = user
    ? await supabase.from('locations').select('id, number, title_jp, cluster, route_order, latitude, longitude')
    : { data: null }

  const { data: myRecords } = user
    ? await supabase.from('records').select('location_id').not('location_id', 'is', null)
    : { data: null }
  const visitedLocationIds = new Set((myRecords ?? []).map((r) => r.location_id as string))

  const locationRows = asRows<ClusterLocation>(locations)
  const clusterSummaries = buildClusterSummaries(locationRows, visitedLocationIds)

  return (
    <main className="max-w-[430px] mx-auto p-6 pb-24 space-y-8 w-full">
      <h1 className="text-xl font-display font-semibold tracking-wide">往還録</h1>

      {user ? (
        <DashboardHome
          hasRecords={(recordCount ?? 0) > 0}
          clusterView={<ClusterList summaries={clusterSummaries} />}
          mapView={<ClusterMapPanel clusters={clusterSummaries} />}
        />
      ) : (
        <p className="text-nami-dim">記録を見るにはログインしてください。</p>
      )}
    </main>
  )
}
