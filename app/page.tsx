import { createClient } from '@/lib/supabase/server'
import { asRows } from '@/lib/supabase/rows'
import { buildClusterSummaries, type ClusterLocation } from '@/lib/clusters'
import { fetchVisitedLocationIds } from '@/lib/visited-locations'
import { getCurrentFigure } from '@/lib/current-figure'
import { ClusterList } from './cluster-list'
import { ClusterMapPanel } from './map/cluster-map-panel'
import { DashboardHome } from './dashboard-home'
import { AuthButton } from './auth-button'
import { GaifuHero } from './gaifu-hero'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // オープニングを見せるかどうかの判定にしか使わないため、行の中身は取らず件数だけ数える。
  // 一覧そのものは/recordsが持つ。
  const { count: recordCount } = user
    ? await supabase.from('records').select('id', { count: 'exact', head: true })
    : { count: 0 }

  // いま選んでいる人物（/figures で選ぶ）。クラスタ一覧・開拓マップはこの人物の地点だけで数える
  const figure = await getCurrentFigure()

  // クラスタ別の進捗（機能③「クラスタ別の進捗内訳」）に使う地点マスタ。
  // 人物マスタが読めず figure.id が無いときは、絞り込まずに全件を使う（従来どおり）
  let locationQuery = supabase.from('locations').select('id, number, title_jp, cluster, route_order, latitude, longitude')
  if (figure.id) locationQuery = locationQuery.eq('figure_id', figure.id)
  const { data: locations } = user ? await locationQuery : { data: null }

  const visitedLocationIds = await fetchVisitedLocationIds(supabase, Boolean(user))

  const locationRows = asRows<ClusterLocation>(locations)
  const clusterSummaries = buildClusterSummaries(locationRows, visitedLocationIds)

  return (
    <main className="max-w-[430px] mx-auto p-6 pb-24 space-y-8 w-full">
      {/* 見出しの絵は人物ごとに変わる。未ログインでも絵は出し、人物の札だけ出さない */}
      <GaifuHero theme={figure.meta.theme} figure={user ? { name: figure.meta.name, work: figure.meta.work } : undefined} />

      {user ? (
        <DashboardHome
          hasRecords={(recordCount ?? 0) > 0}
          locationCount={locationRows.length}
          clusterView={<ClusterList summaries={clusterSummaries} />}
          mapView={<ClusterMapPanel clusters={clusterSummaries} />}
        />
      ) : (
        <div className="space-y-3">
          <p className="text-nami-dim">記録を見るにはログインしてください。</p>
          <AuthButton />
        </div>
      )}
    </main>
  )
}
