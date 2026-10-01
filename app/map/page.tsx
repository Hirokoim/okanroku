import { createClient } from '@/lib/supabase/server'
import { asRows } from '@/lib/supabase/rows'
import { createPhotoUrls } from '@/lib/storage'
import { fetchVisitedLocationIds } from '@/lib/visited-locations'
import { getCurrentFigure } from '@/lib/current-figure'
import { MapScreen } from './map-screen'
import { parseMapView } from './map-url'
import type { LocationPin, VisitPoint } from './map-types'

// record_photos を、地点名まで一緒に引いたときの行の形。
// records・locations は多対1の関連なので実際は単一オブジェクトで返る
// （詳しくは lib/supabase/rows.ts）。
type PhotoRow = {
  id: string
  storage_path: string
  latitude: number | null
  longitude: number | null
  taken_at: string | null
  records: {
    location_id: string | null
    locations: { number: number; title_jp: string; figure_id: string } | null
  } | null
}

export default async function MapPage({
  searchParams,
}: {
  // ?cluster=クラスタ名 … クラスタ一覧から「ここへ行く」を選んだとき、または地点詳細から戻ったとき
  // ?view=gallery    … 作品一覧を表示していた状態から戻ったとき（app/map/map-url.ts）
  searchParams: Promise<{ cluster?: string; view?: string }>
}) {
  const { cluster: initialCluster, view } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // locations・records・record_photosのRLSはいずれも「ログイン済みユーザーのみ」
  // （recordsとrecord_photosはさらに自分の行のみ）が前提のため、未ログインなら
  // 全て0件になる。地図だけ出て中身が空だと原因が分からないので、
  // ログインを促す表示に切り替える。
  //
  // 地点は、いま選んでいる人物（/figures で選ぶ）のものだけを出す。
  // 人物マスタが読めず figure.id が無いときは、絞り込まずに全件を出す（従来どおり）。
  const figure = await getCurrentFigure()
  let locationQuery = supabase
    .from('locations')
    .select(
      'id, number, title_jp, title_en, series, prefecture, modern_location, cluster, route_order, latitude, longitude, accessibility_class, image_url'
    )
    .order('number')
  if (figure.id) locationQuery = locationQuery.eq('figure_id', figure.id)
  const { data: locations } = user ? await locationQuery : { data: null }

  const visitedLocationIds = await fetchVisitedLocationIds(supabase, Boolean(user))

  // 実際に撮影した座標（record_photos）。地点の比定地とは別に、
  // 「訪問地点を表示」トグルで重ねて出す。
  // record_photosはuser_idを持たないため、records経由でRLSが判定される
  // （docs/requirements.md 5-B）。ここでは records.location_id と
  // locations.title_jp を一緒に引くため、supabaseのネスト取得を使う。
  const { data: photoRows } = user
    ? await supabase
        .from('record_photos')
        .select(
          'id, storage_path, latitude, longitude, taken_at, records!inner(location_id, locations(number, title_jp, figure_id))'
        )
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
    : { data: null }

  // 訪問地点も、選んでいる人物の地点に紐づく写真だけにする（地点のピンと揃えるため）。
  // 絞り込みは署名付きURLを発行する前に行い、出さない写真の分まで発行しないようにする。
  const placedPhotos = asRows<PhotoRow>(photoRows).filter(
    (p) =>
      p.latitude !== null &&
      p.longitude !== null &&
      p.records?.locations &&
      (!figure.id || p.records.locations.figure_id === figure.id)
  )

  // photosバケットは非公開なので、パスをそのまま<img src>に渡しても表示できない。
  // 吹き出しでその場の写真を出すため、ここで署名付きURLに変換しておく
  // （地点詳細 app/locations/[id]/page.tsx と同じ手順）。
  const photoUrls = await createPhotoUrls(supabase, placedPhotos.map((p) => p.storage_path))

  const visitPoints: VisitPoint[] = placedPhotos.map((p) => ({
    id: p.id,
    latitude: Number(p.latitude),
    longitude: Number(p.longitude),
    taken_at: p.taken_at,
    number: p.records!.locations!.number,
    title_jp: p.records!.locations!.title_jp,
    url: photoUrls.get(p.storage_path) ?? null,
    // HEIC変換を入れる前（2026-09-08以前）に保存された写真はHEICのまま
    unsupportedFormat: /\.hei[cf]$/i.test(p.storage_path),
  }))

  return (
    <main className="max-w-[430px] mx-auto p-6 pb-24 space-y-4 w-full">
      <h1 className="text-xl font-body font-semibold">地図</h1>

      {user ? (
        <MapScreen
          locations={asRows<LocationPin>(locations)}
          visitedLocationIds={[...visitedLocationIds]}
          visitPoints={visitPoints}
          initialCluster={initialCluster ?? null}
          initialView={parseMapView(view)}
        />
      ) : (
        <p className="text-nami-dim">地図を見るにはログインしてください。</p>
      )}
    </main>
  )
}
