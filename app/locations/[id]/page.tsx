import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { asRow } from '@/lib/supabase/rows'
import { accessibilityLabel, confidenceLabel } from '@/lib/labels'
import { createPhotoUrls } from '@/lib/storage'
import { LocationRecords, type LocationRecord, type RecordPhoto } from './location-records'
import { LocationRecordForm } from './record-form'

// 2カラムのラベル＋値レイアウトは、MulmoClaudeのfugaku-36コレクションが
// schema.jsonから自動生成している詳細モーダルの見せ方を参考にした
// （~/mulmoclaude/data/skills/fugaku-36/schema.json）。
// あちらは汎用エンジンによる自動生成でコードの流用はできないため、
// フィールドの並び・2カラム構成だけを踏襲している。

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  )
}

export default async function LocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="max-w-2xl mx-auto p-6">
        <p className="text-gray-600">この画面を見るにはログインしてください。</p>
      </main>
    )
  }

  const { data: location } = await supabase
    .from('locations')
    .select(
      'id, figure_id, number, title_jp, title_en, series, prefecture, modern_location, cluster, route_order, accessibility_class, accessibility_confidence, accessibility_reason, location_confidence, location_source, image_url, image_source, image_license, figures(name)'
    )
    .eq('id', id)
    .maybeSingle()

  if (!location) notFound()

  // 自分の記録のみ（RLSにより自動的にそう絞られるが、location_idでも明示的に絞る）
  const { data: records } = await supabase
    .from('records')
    .select('id, photographed_at, edit_intent, voice_transcript, access_note, is_public, created_at')
    .eq('location_id', id)
    .order('photographed_at', { ascending: false })

  // 記録に添付された写真。photosバケットは非公開なので、パスをそのまま
  // <img src>に渡しても表示できない。ここで署名付きURLに変換してから渡す。
  // record_photosはuser_idを持たず、records経由でRLSが効く（docs/requirements.md 5-B）。
  const recordIds = (records ?? []).map((r) => r.id)
  const { data: photoRows } = recordIds.length > 0
    ? await supabase
        .from('record_photos')
        .select('id, record_id, storage_path, latitude, longitude, taken_at')
        .in('record_id', recordIds)
        .order('sort_order')
    : { data: null }

  const photoUrls = await createPhotoUrls(supabase, (photoRows ?? []).map((p) => p.storage_path))

  const photosByRecordId = new Map<string, RecordPhoto[]>()
  for (const row of photoRows ?? []) {
    const photos = photosByRecordId.get(row.record_id) ?? []
    photos.push({
      id: row.id,
      url: photoUrls.get(row.storage_path) ?? null,
      latitude: row.latitude,
      longitude: row.longitude,
      taken_at: row.taken_at,
    })
    photosByRecordId.set(row.record_id, photos)
  }

  const recordsWithPhotos: LocationRecord[] = (records ?? []).map((r) => ({
    ...r,
    photos: photosByRecordId.get(r.id) ?? [],
  }))

  // figuresはlocationsから見て多対1の関係（詳しくは lib/supabase/rows.ts）
  const figureName = asRow<{ figures: { name: string } | null }>(location).figures?.name

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <Link href="/map" className="text-sm text-blue-600 underline">
          ← 地図に戻る
        </Link>
      </div>

      <div>
        <div className="text-sm text-gray-500">第{location.number}景{figureName ? `・${figureName}` : ''}</div>
        <h1 className="text-2xl font-bold">{location.title_jp}</h1>
        {location.title_en && <p className="text-gray-500">{location.title_en}</p>}
      </div>

      {location.image_url ? (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element -- 外部URL(Met/Wikimedia等)は
              取得元が地点ごとに異なりドメインを事前登録できないため、next/imageではなくimgを使う */}
          <img src={location.image_url} alt={location.title_jp} className="w-full rounded-lg border" />
          {(location.image_source || location.image_license) && (
            <figcaption className="text-xs text-gray-400 mt-1">
              {location.image_source}
              {location.image_license && ` （${location.image_license}）`}
            </figcaption>
          )}
        </figure>
      ) : (
        <div className="border rounded-lg p-6 text-center text-gray-400 text-sm">
          元絵の画像は未登録です
        </div>
      )}

      <div className="border rounded-lg p-4 grid grid-cols-2 gap-4">
        <Field label="都道府県" value={location.prefecture} />
        <Field label="現代の地名" value={location.modern_location} />
        <Field label="シリーズ" value={location.series} />
        <Field label="クラスタ" value={location.cluster} />
        <Field label="富士の見え方" value={accessibilityLabel(location.accessibility_class)} />
        <Field label="分類確度" value={confidenceLabel(location.accessibility_confidence)} />
      </div>

      {location.accessibility_reason && (
        <div>
          <div className="text-xs text-gray-500 mb-1">分類根拠</div>
          <p className="text-sm text-gray-700">{location.accessibility_reason}</p>
        </div>
      )}

      {location.location_source && (
        <div>
          <div className="text-xs text-gray-500 mb-1">
            比定地の出典
            {location.location_confidence && (
              <span className="ml-2">
                （{confidenceLabel(location.location_confidence) ?? location.location_confidence}）
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700">{location.location_source}</p>
        </div>
      )}

      <div className="border-t pt-4">
        <h2 className="font-semibold mb-2">自分の記録（{recordsWithPhotos.length}件）</h2>
        <LocationRecords records={recordsWithPhotos} />

        <LocationRecordForm locationId={location.id} figureId={location.figure_id} userId={user.id} />
      </div>
    </main>
  )
}
