// 地点詳細の「自分の記録」一覧。
// 署名付きURLの発行はサーバー側（page.tsx）で済ませてあり、
// ここは受け取った内容を並べるだけ。

import { formatDate } from '@/lib/format'

export type RecordPhoto = {
  id: string
  /** 署名付きURL。発行に失敗した場合はnull */
  url: string | null
  latitude: number | null
  longitude: number | null
  taken_at: string | null
}

export type LocationRecord = {
  id: string
  photographed_at: string | null
  created_at: string
  edit_intent: string | null
  voice_transcript: string | null
  access_note: string | null
  photos: RecordPhoto[]
}

function RecordPhotos({ photos }: { photos: RecordPhoto[] }) {
  if (photos.length === 0) return null

  return (
    <ul className="grid grid-cols-3 gap-2 mt-2">
      {photos.map((photo) => (
        <li key={photo.id}>
          {photo.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- 有効期限付きの署名URLのためnext/imageの最適化対象にしない
            <img
              src={photo.url}
              alt=""
              className="w-full aspect-[4/3] object-cover rounded border"
              loading="lazy"
            />
          ) : (
            <div className="w-full aspect-[4/3] rounded border grid place-items-center text-gray-400 text-[10px] text-center px-1">
              写真を読み込めませんでした
            </div>
          )}
          {photo.latitude !== null && photo.longitude !== null && (
            <div className="text-gray-400 text-[10px] mt-0.5">
              {photo.latitude.toFixed(5)}, {photo.longitude.toFixed(5)}
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

export function LocationRecords({ records }: { records: LocationRecord[] }) {
  if (records.length === 0) {
    return <p className="text-gray-500 text-sm">まだこの地点の記録がありません。</p>
  }

  return (
    <ul className="space-y-2">
      {records.map((r) => (
        <li key={r.id} className="border rounded p-3 text-sm">
          <div className="text-gray-400 text-xs">{formatDate(r.photographed_at ?? r.created_at)}</div>
          {r.edit_intent && <div className="font-medium">{r.edit_intent}</div>}
          {r.voice_transcript && <div className="text-gray-600">{r.voice_transcript}</div>}
          {r.access_note && <div className="text-gray-500 text-xs mt-1">{r.access_note}</div>}
          <RecordPhotos photos={r.photos} />
        </li>
      ))}
    </ul>
  )
}
