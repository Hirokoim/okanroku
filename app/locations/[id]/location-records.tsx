'use client'

// 地点詳細の「自分の記録」一覧。日付ごとのタイムライン（app/record-timeline.tsx）で見せる。
//
// 署名付きURLの発行はサーバー側（page.tsx）で済ませてあり、
// ここは受け取った内容を並べるだけ。記録ごとの編集フォームの開閉と、
// 座標を見せている写真の選択だけ状態を持つ。

import { useState } from 'react'
import { timePeriodFromDatetime, timePeriodLabel } from '@/lib/time-period'
import { weatherCodeIcon } from '@/lib/weather'
import { downloadTextFile, locationRecordsToMarkdown } from '@/lib/export'
import { EditRecordForm } from './edit-record-form'
import type { LocationRecord, RecordPhoto } from './record-types'
import { RecordOrderToggle, TimelineDay, groupByDay, useRecordOrder } from '../../record-timeline'

/** 写真1枚ぶんのボタン。タップすると撮影位置の表示を切り替える */
function PhotoButton({
  photo,
  selected,
  large,
  onToggle,
}: {
  photo: RecordPhoto
  selected: boolean
  /** 1枚目はカードの横幅いっぱいに大きく出す */
  large: boolean
  onToggle: () => void
}) {
  const size = large ? 'w-full aspect-[4/3] rounded-xl' : 'w-[4.5rem] h-[4.5rem] rounded-lg'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      aria-label="写真の撮影位置を表示"
      className={`${size} block border-2 overflow-hidden ${selected ? 'border-hi' : 'border-white'}`}
    >
      {photo.unsupportedFormat ? (
        <span className="w-full h-full bg-sumi-3 grid place-items-center text-nami-dim text-[10px] leading-tight px-1">
          HEICのため表示不可
        </span>
      ) : photo.url ? (
        // eslint-disable-next-line @next/next/no-img-element -- 有効期限付きの署名URLのためnext/imageの最適化対象にしない
        <img src={photo.url} alt="" className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <span className="w-full h-full bg-sumi-3 grid place-items-center text-nami-dim text-[10px] leading-tight px-1">
          読み込めませんでした
        </span>
      )}
    </button>
  )
}

function RecordPhotos({ photos }: { photos: RecordPhoto[] }) {
  // 座標は一覧では出さず、写真をタップしたときだけ見せる（一覧を記録らしく見せるため）
  const [selectedId, setSelectedId] = useState<string | null>(null)
  if (photos.length === 0) return null
  const selected = photos.find((p) => p.id === selectedId)
  const [first, ...rest] = photos
  const toggle = (id: string) => setSelectedId(selectedId === id ? null : id)

  return (
    <div className="mt-2">
      <PhotoButton photo={first} selected={first.id === selectedId} large onToggle={() => toggle(first.id)} />
      {rest.length > 0 && (
        <ul className="flex flex-wrap gap-2 mt-2">
          {rest.map((photo) => (
            <li key={photo.id}>
              <PhotoButton
                photo={photo}
                selected={photo.id === selectedId}
                large={false}
                onToggle={() => toggle(photo.id)}
              />
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <div className="text-nami-dim text-xs mt-1.5 tabular-nums">
          {selected.latitude !== null && selected.longitude !== null
            ? `撮影位置 ${selected.latitude.toFixed(5)}, ${selected.longitude.toFixed(5)}`
            : 'この写真には位置情報がありません'}
        </div>
      )}
    </div>
  )
}

function RecordEntry({ record: r, userId }: { record: LocationRecord; userId: string }) {
  const [editing, setEditing] = useState(false)
  const period = timePeriodLabel(timePeriodFromDatetime(r.photographed_at))

  return (
    <li className="rounded-xl bg-sumi-2 p-3 text-sm">
      <div className="flex items-center gap-2 text-xs text-nami-dim">
        {period && <span>{period}</span>}
        {r.weather && (
          <span className="rounded-full border border-ai bg-sumi-4 text-ai-deep px-2 py-0.5">
            {weatherCodeIcon(r.weather.weathercode)} {r.weather.description}
            {r.weather.temperature !== null && ` ${r.weather.temperature}℃`}
          </span>
        )}
        {!editing && (
          <button onClick={() => setEditing(true)} className="ml-auto text-kin underline shrink-0">
            編集
          </button>
        )}
      </div>
      {r.edit_intent && <p className="mt-2 leading-relaxed font-medium">「{r.edit_intent}」</p>}
      {r.voice_transcript && <p className="mt-1 leading-relaxed text-nami-dim">{r.voice_transcript}</p>}
      {r.access_note && <p className="mt-1 text-xs text-nami-dim">{r.access_note}</p>}
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
  const [order, setOrder] = useRecordOrder()

  if (records.length === 0) {
    return <p className="text-nami-dim text-sm">まだこの地点の記録がありません。</p>
  }

  const groups = groupByDay(records, order)

  function handleDownloadMarkdown() {
    // note下書きの土台として使う想定（機能④）。ファイル名に地点名をそのまま使うと
    // OS側で使えない記号（/など）を含む地点名があり得るため、日本語はそのまま許容しつつ
    // ファイルシステムで問題になりやすい記号だけ置換する。
    const safeTitle = locationTitle.replace(/[\\/:*?"<>|]/g, '_')
    downloadTextFile(`${safeTitle}.md`, locationRecordsToMarkdown(locationTitle, records), 'text/markdown')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <RecordOrderToggle order={order} onChange={setOrder} />
        <button type="button" onClick={handleDownloadMarkdown} className="text-xs text-kin underline">
          Markdownで書き出す
        </button>
      </div>
      <ol>
        {groups.map((g, i) => (
          <TimelineDay key={g.key + i} date={g.date} count={g.records.length} isLast={i === groups.length - 1}>
            {g.records.map((r) => (
              <RecordEntry key={r.id} record={r} userId={userId} />
            ))}
          </TimelineDay>
        ))}
      </ol>
    </div>
  )
}
