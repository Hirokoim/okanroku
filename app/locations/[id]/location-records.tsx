'use client'

// 地点詳細の「自分の記録」一覧。同じ日の記録を1日分にまとめ、日付印を点線で
// つないだタイムラインとして見せる。同じ日に何度も記録した＝その日に何度も
// 迷って確かめた、という往還の跡が見えるようにするため。
//
// 署名付きURLの発行はサーバー側（page.tsx）で済ませてあり、
// ここは受け取った内容を並べるだけ。記録ごとの編集フォームの開閉と、
// 座標を見せている写真の選択だけ状態を持つ。

import { useState } from 'react'
import { dateKey, formatDate } from '@/lib/format'
import { timePeriodFromDatetime, timePeriodLabel } from '@/lib/time-period'
import { weatherCodeIcon } from '@/lib/weather'
import { downloadTextFile, locationRecordsToMarkdown } from '@/lib/export'
import { EditRecordForm } from './edit-record-form'
import type { LocationRecord, RecordPhoto } from './record-types'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

const ORDER_OPTIONS: { value: 'newest' | 'oldest'; label: string }[] = [
  { value: 'newest', label: '新しい順' },
  { value: 'oldest', label: '古い順' },
]

/** 記録の日時。訪問日時が無い古い記録は作成日時で代用する（他の画面と同じ扱い） */
function recordDatetime(r: LocationRecord): string {
  return r.photographed_at ?? r.created_at
}

type DayGroup = { key: string; date: Date; records: LocationRecord[] }

/** 記録を日付ごとにまとめる。並び順は受け取った順（page.tsxで新しい順に並べてある）を保つ */
function groupByDay(records: LocationRecord[]): DayGroup[] {
  const groups: DayGroup[] = []
  for (const r of records) {
    const key = dateKey(recordDatetime(r)) ?? 'unknown'
    const last = groups[groups.length - 1]
    if (last && last.key === key) {
      last.records.push(r)
    } else {
      groups.push({ key, date: new Date(recordDatetime(r)), records: [r] })
    }
  }
  return groups
}

/** タイムラインの左側に並ぶ、赤茶の丸い日付印 */
function DateStamp({ date }: { date: Date }) {
  const valid = !isNaN(date.getTime())
  return (
    <div
      className="w-11 h-11 rounded-full bg-hi text-washi flex flex-col items-center justify-center leading-none shrink-0"
      aria-hidden="true"
    >
      <span className="text-[10px]">{valid ? `${date.getMonth() + 1}月` : ''}</span>
      <span className="text-lg font-bold">{valid ? date.getDate() : '?'}</span>
    </div>
  )
}

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

function DaySection({ group, isLast, userId }: { group: DayGroup; isLast: boolean; userId: string }) {
  const valid = !isNaN(group.date.getTime())
  const count = group.records.length
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <DateStamp date={group.date} />
        {/* 次の日付印へつなぐ点線。最後の日には引かない */}
        {!isLast && (
          <div
            className="w-0.5 flex-1 mt-1"
            style={{ background: 'repeating-linear-gradient(var(--hi) 0 3px, transparent 3px 8px)' }}
          />
        )}
      </div>
      <div className="flex-1 min-w-0 pb-6">
        <h3 className="text-xs text-nami-dim pt-3">
          {valid ? `${formatDate(group.date.toISOString())}（${WEEKDAYS[group.date.getDay()]}）` : '日付不明'}
          {count > 1 && <span className="text-hi font-semibold">・{count}回の記録</span>}
        </h3>
        <ul className="space-y-2 mt-2">
          {group.records.map((r) => (
            <RecordEntry key={r.id} record={r} userId={userId} />
          ))}
        </ul>
      </div>
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
  // records は page.tsx で新しい順に並んで届く。古い順は日付の並びも1日の中の並びも逆にする
  const [order, setOrder] = useState<'newest' | 'oldest'>('newest')

  if (records.length === 0) {
    return <p className="text-nami-dim text-sm">まだこの地点の記録がありません。</p>
  }

  const groups = groupByDay(order === 'newest' ? records : [...records].reverse())

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
        <div className="flex gap-1" role="group" aria-label="記録の並び順">
          {ORDER_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={order === o.value}
              onClick={() => setOrder(o.value)}
              className={`text-xs rounded-full px-3 py-1 transition-colors ${
                order === o.value ? 'bg-hi text-washi' : 'border border-line text-nami-dim'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={handleDownloadMarkdown} className="text-xs text-kin underline">
          Markdownで書き出す
        </button>
      </div>
      <ol>
        {groups.map((g, i) => (
          <DaySection key={g.key + i} group={g} isLast={i === groups.length - 1} userId={userId} />
        ))}
      </ol>
    </div>
  )
}
