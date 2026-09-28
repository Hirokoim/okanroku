import { createClient } from '@/lib/supabase/server'
import { asRows } from '@/lib/supabase/rows'
import type { RecordListItem, RecordRow } from '../record-list'
import { createPhotoUrls } from '@/lib/storage'
import type { WeatherSnapshot } from '@/lib/weather'
import { RecordsView } from './records-view'
import { ImportPanel } from '../import-panel'
import type { MatchableLocation } from '@/lib/location-match'

// 記録タブ。地点横断で時系列に見返す一覧と、写真からまとめて記録する入口
// （要件定義書4-C・機能②）をここに置く。ダッシュボード（/）からは
// 「次はどこを目指すか」とは役割が異なるため、別のタブにしている。
export default async function RecordsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: records } = user
    ? await supabase
        .from('records')
        .select(
          'id, location_id, location_name, work_label, photographed_at, created_at, weather, figures(name), locations(title_jp)'
        )
        .order('created_at', { ascending: false })
    : { data: null }

  // 一括取り込み（ImportPanel）は地点候補探しに46図の座標が要る。
  // Phase1はlocationsが北斎のみのため、代表して1件目からfigure_idを拾えば足りる
  // （app/page.tsxの元の実装と同じ前提）。
  const { data: locations } = user
    ? await supabase.from('locations').select('id, figure_id, number, title_jp, latitude, longitude')
    : { data: null }

  // 一覧のカードに出す写真。全記録ぶんを並べる画面なので、表示用の署名付きURLは
  // 各記録の1枚目（sort_orderが最小のもの）だけ発行し、残りは枚数だけ数える。
  // record_photosはuser_idを持たず、records経由でRLSが効く（docs/requirements.md 5-B）。
  const recordRows = asRows<RecordRow & { weather: unknown }>(records)
  const recordIds = recordRows.map((r) => r.id)
  const { data: photoRows } = recordIds.length > 0
    ? await supabase
        .from('record_photos')
        .select('record_id, storage_path')
        .in('record_id', recordIds)
        .order('sort_order')
    : { data: null }

  const coverPathByRecordId = new Map<string, string>()
  const photoCountByRecordId = new Map<string, number>()
  for (const row of photoRows ?? []) {
    if (!coverPathByRecordId.has(row.record_id)) coverPathByRecordId.set(row.record_id, row.storage_path)
    photoCountByRecordId.set(row.record_id, (photoCountByRecordId.get(row.record_id) ?? 0) + 1)
  }
  const coverUrls = await createPhotoUrls(supabase, [...coverPathByRecordId.values()])

  const listItems: RecordListItem[] = recordRows.map((r) => {
    const coverPath = coverPathByRecordId.get(r.id)
    return {
      ...r,
      // weatherの形は地点詳細（app/locations/[id]/page.tsx）と同じ理由でWeatherSnapshotとして読む
      weather: r.weather as WeatherSnapshot | null,
      cover: coverPath
        ? {
            url: coverUrls.get(coverPath) ?? null,
            // HEIC変換を入れる前（2026-09-08以前）に保存された写真はブラウザで表示できない
            unsupportedFormat: /\.hei[cf]$/i.test(coverPath),
          }
        : null,
      photoCount: photoCountByRecordId.get(r.id) ?? 0,
    }
  })

  const locationRows = asRows<MatchableLocation & { figure_id: string }>(locations)
  const figureId = locationRows[0]?.figure_id ?? null

  return (
    <main className="max-w-[430px] mx-auto p-6 pb-24 space-y-4 w-full">
      <h1 className="text-xl font-body font-semibold">記録</h1>

      {user ? (
        <RecordsView
          records={listItems}
          importPanel={figureId && <ImportPanel userId={user.id} figureId={figureId} locations={locationRows} />}
        />
      ) : (
        <p className="text-nami-dim">記録を見るにはログインしてください。</p>
      )}
    </main>
  )
}
