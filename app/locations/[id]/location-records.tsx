'use client'

// 地点詳細の「自分の記録」一覧。
// 署名付きURLの発行はサーバー側（page.tsx）で済ませてあり、
// ここは受け取った内容を並べるだけ。記録ごとの編集フォームの開閉だけ状態を持つ。

import { useState } from 'react'
import { formatDate } from '@/lib/format'
import { weatherCodeIcon } from '@/lib/weather'
import { downloadTextFile, locationRecordsToMarkdown } from '@/lib/export'
import { EditRecordForm } from './edit-record-form'
import type { LocationRecord, RecordPhoto } from './record-types'

function RecordPhotos({ photos }: { photos: RecordPhoto[] }) {
  if (photos.length === 0) return null

  return (
    <ul className="grid grid-cols-3 gap-2 mt-2">
      {photos.map((photo) => (
        <li key={photo.id}>
          {photo.unsupportedFormat ? (
            <div className="w-full aspect-[4/3] rounded border border-line bg-sumi-2 grid place-items-center text-nami-dim text-[10px] text-center px-1 leading-relaxed">
              この写真はHEIC形式のため
              <br />
              表示できません
            </div>
          ) : photo.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- 有効期限付きの署名URLのためnext/imageの最適化対象にしない
            <img
              src={photo.url}
              alt=""
              className="w-full aspect-[4/3] object-cover rounded border border-line"
              loading="lazy"
            />
          ) : (
            <div className="w-full aspect-[4/3] rounded border border-line bg-sumi-2 grid place-items-center text-nami-dim text-[10px] text-center px-1">
              写真を読み込めませんでした
            </div>
          )}
          {photo.latitude !== null && photo.longitude !== null && (
            <div className="text-nami-dim text-[10px] mt-0.5">
              {photo.latitude.toFixed(5)}, {photo.longitude.toFixed(5)}
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

function RecordItem({ record: r, userId }: { record: LocationRecord; userId: string }) {
  const [editing, setEditing] = useState(false)

  return (
    <li className="border-y border-r border-line border-l-4 border-l-kin-dim rounded-lg p-3 text-sm bg-sumi-3 shadow-[0_2px_6px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-2">
        <div className="text-nami-dim text-xs flex items-center gap-2">
          {formatDate(r.photographed_at ?? r.created_at)}
          {r.weather && (
            <span>
              {weatherCodeIcon(r.weather.weathercode)} {r.weather.description}
              {r.weather.temperature !== null && `　${r.weather.temperature}℃`}
            </span>
          )}
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-xs text-kin underline shrink-0">
            編集
          </button>
        )}
      </div>
      {r.edit_intent && <div className="font-medium">{r.edit_intent}</div>}
      {r.voice_transcript && <div className="text-nami-dim">{r.voice_transcript}</div>}
      {r.access_note && <div className="text-nami-dim text-xs mt-1">{r.access_note}</div>}
      <RecordPhotos photos={r.photos} />
      {editing && <EditRecordForm record={r} userId={userId} onClose={() => setEditing(false)} />}
    </li>
  )
}

export function LocationRecords({
  records,
  userId,
  locationTitle,
}: {
  records: LocationRecord[]
  userId: string
  locationTitle: string
}) {
  if (records.length === 0) {
    return <p className="text-nami-dim text-sm">まだこの地点の記録がありません。</p>
  }

  function handleDownloadMarkdown() {
    // note下書きの土台として使う想定（機能④）。ファイル名に地点名をそのまま使うと
    // OS側で使えない記号（/など）を含む地点名があり得るため、日本語はそのまま許容しつつ
    // ファイルシステムで問題になりやすい記号だけ置換する。
    const safeTitle = locationTitle.replace(/[\\/:*?"<>|]/g, '_')
    downloadTextFile(`${safeTitle}.md`, locationRecordsToMarkdown(locationTitle, records), 'text/markdown')
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button type="button" onClick={handleDownloadMarkdown} className="text-xs text-kin underline">
          この地点の記録をMarkdownで書き出す
        </button>
      </div>
      <ul className="space-y-3">
        {records.map((r) => (
          <RecordItem key={r.id} record={r} userId={userId} />
        ))}
      </ul>
    </div>
  )
}
