import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MapPanel } from './map-panel'
import type { LocationPin, VisitPoint } from './map-view'

export default async function MapPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // locations・records・record_photosのRLSはいずれも「ログイン済みユーザーのみ」
  // （recordsとrecord_photosはさらに自分の行のみ）が前提のため、未ログインなら
  // 全て0件になる。地図だけ出て中身が空だと原因が分からないので、
  // ログインを促す表示に切り替える。
  const { data: locations } = user
    ? await supabase
        .from('locations')
        .select(
          'id, number, title_jp, title_en, series, prefecture, modern_location, cluster, latitude, longitude, accessibility_class'
        )
        .order('number')
    : { data: null }

  // 「訪問済み」＝自分の記録がその地点(location_id)に紐づいているかどうか。
  // locationsは全ユーザー共有だが、訪問したかどうかは自分の記録からしか分からない。
  const { data: myRecords } = user
    ? await supabase.from('records').select('location_id').not('location_id', 'is', null)
    : { data: null }
  const visitedLocationIds = new Set((myRecords ?? []).map((r) => r.location_id as string))

  // 実際に撮影した座標（record_photos）。地点の比定地とは別に、
  // 「訪問地点を表示」トグルで重ねて出す。
  // record_photosはuser_idを持たないため、records経由でRLSが判定される
  // （lib: docs/requirements.md 5-B）。ここでは records.location_id と
  // locations.title_jp を一緒に引くため、supabaseのネスト取得を使う。
  const { data: photoRows } = user
    ? await supabase
        .from('record_photos')
        .select('id, latitude, longitude, taken_at, records!inner(location_id, locations(number, title_jp))')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
    : { data: null }

  type PhotoRow = {
    id: string
    latitude: number | null
    longitude: number | null
    taken_at: string | null
    records: { location_id: string | null; locations: { number: number; title_jp: string } | null } | null
  }

  const visitPoints: VisitPoint[] = ((photoRows ?? []) as unknown as PhotoRow[])
    .filter((p) => p.latitude !== null && p.longitude !== null && p.records?.locations)
    .map((p) => ({
      id: p.id,
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
      taken_at: p.taken_at,
      number: p.records!.locations!.number,
      title_jp: p.records!.locations!.title_jp,
    }))

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-4 w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">地図</h1>
        <Link href="/" className="text-sm text-blue-600 underline">
          記録に戻る
        </Link>
      </div>

      {user ? (
        <MapPanel
          locations={(locations ?? []) as LocationPin[]}
          visitedLocationIds={[...visitedLocationIds]}
          visitPoints={visitPoints}
        />
      ) : (
        <p className="text-gray-600">地図を見るにはログインしてください。</p>
      )}
    </main>
  )
}
