import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MapPanel } from './map-panel'
import type { LocationPin } from './map-view'

export default async function MapPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // locationsのRLSは「ログイン済みユーザーのみ読める」設定のため、
  // 未ログインだと0件が返る。地図だけ出て中身が空だと原因が分からないので、
  // ログインを促す表示に切り替える。
  const { data: locations } = user
    ? await supabase
        .from('locations')
        .select('id, number, title_jp, modern_location, cluster, latitude, longitude')
        .order('number')
    : { data: null }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-4 w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">地図</h1>
        <Link href="/" className="text-sm text-blue-600 underline">
          記録に戻る
        </Link>
      </div>

      {user ? (
        <>
          <p className="text-gray-600 text-sm">{locations?.length ?? 0}件の地点</p>
          <MapPanel locations={(locations ?? []) as LocationPin[]} />
        </>
      ) : (
        <p className="text-gray-600">地図を見るにはログインしてください。</p>
      )}
    </main>
  )
}
