import { createClient } from '@/lib/supabase/server'
import { asRows } from '@/lib/supabase/rows'
import type { RecordListItem, RecordRow } from '../record-list'
import { createPhotoUrls } from '@/lib/storage'
import type { WeatherSnapshot } from '@/lib/weather'
import { RecordsView } from './records-view'
import Link from 'next/link'

// 記録タブ。地点横断で時系列に見返す一覧と、写真から記録する画面（/records/new）への
// 入口（要件定義書4-C・機能②）をここに置く。ダッシュボード（/）からは
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

  return (
    <main className="max-w-[430px] mx-auto p-6 pb-24 space-y-4 w-full">
      <h1 className="text-xl font-body font-semibold">記録</h1>

      {user ? (
        <RecordsView
          records={listItems}
          entry={
            // 写真から記録する画面（/records/new）への入口。カメラの絵で、文字を読む前に伝える
            <Link
              href="/records/new"
              className="flex items-center gap-3 rounded-xl px-4 py-3 bg-sumi-2 hover:bg-sumi-3 transition-colors"
            >
              <span className="w-9 h-9 rounded-full bg-hi text-washi flex items-center justify-center shrink-0" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 8h3l1.5-2h7L17 8h3v11H4Z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-body font-semibold text-sm">写真から記録する</span>
                <span className="block text-xs text-nami-dim">撮った写真から、まとめて書きとめる</span>
              </span>
              <span className="text-hi text-lg leading-none" aria-hidden="true">
                ›
              </span>
            </Link>
          }
        />
      ) : (
        <p className="text-nami-dim">記録を見るにはログインしてください。</p>
      )}
    </main>
  )
}
