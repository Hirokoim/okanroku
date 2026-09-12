'use client'

// 「写真から入る」記録入力（要件定義書4-C・機能②、roadmap.md Phase1タスク(D)）。
// 地点詳細を経由せず、複数枚の写真をまとめて取り込み、GPSから地点ごとに
// グループ化してから、地点ごとに1件ずつ記録（records）を作る。
// 写真の状態管理・見た目は地点詳細の記録フォームと共通（app/photos/）。

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadPhoto } from '@/lib/storage'
import { fetchAndApplyWeather } from '@/lib/weather'
import { findNearestLocations, type MatchableLocation } from '@/lib/location-match'
import { PhotoPicker } from './photos/photo-picker'
import { MAX_IMPORT_PHOTOS, usePhotoEntries, type PhotoEntry } from './photos/use-photo-entries'

// 「地点未設定」のグループを表す。locationsのidはuuidなので衝突しない。
const UNSET = '__unset__'

type GroupResult = {
  label: string
  count: number
  status: 'ok' | 'error'
  message: string
}

function photoCoords(photo: PhotoEntry): { latitude: number; longitude: number } | null {
  return photo.latitude && photo.longitude ? { latitude: Number(photo.latitude), longitude: Number(photo.longitude) } : null
}

export function ImportForm({
  userId,
  figureId,
  locations,
}: {
  userId: string
  figureId: string
  locations: MatchableLocation[]
}) {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [results, setResults] = useState<GroupResult[] | null>(null)

  const { photos, addPhotos, applyCurrentLocation, removePhoto, updateCoordinate, clearPhotos } =
    usePhotoEntries(setError, MAX_IMPORT_PHOTOS)

  // 「この写真をどの地点にするか」のユーザーによる明示的な選択。
  // 未選択の写真は、GPSから出した自動候補（1位）を既定値として使う。
  const [manualAssignments, setManualAssignments] = useState<Record<string, string>>({})

  const convertingPhotos = photos.some((p) => p.convertingHeic)

  function handleRemovePhoto(key: string) {
    removePhoto(key)
    setManualAssignments((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function candidatesFor(photo: PhotoEntry) {
    return findNearestLocations(photoCoords(photo), locations)
  }

  function assignmentFor(photo: PhotoEntry): string {
    if (photo.key in manualAssignments) return manualAssignments[photo.key]
    return candidatesFor(photo)[0]?.location.id ?? UNSET
  }

  // 地点idごとに写真をまとめる。UNSETは「地点未設定」の1グループとしてまとめる
  // （1枚ずつ未設定レコードを作るのではなく、まとめて1件にする＝機能②の想定通り）。
  const groups = new Map<string, PhotoEntry[]>()
  for (const photo of photos) {
    const key = assignmentFor(photo)
    const list = groups.get(key) ?? []
    list.push(photo)
    groups.set(key, list)
  }

  function groupLabel(locationId: string): string {
    if (locationId === UNSET) return '地点未設定'
    const loc = locations.find((l) => l.id === locationId)
    return loc ? `第${loc.number}景・${loc.title_jp}` : '地点未設定'
  }

  async function handleImport() {
    setSubmitting(true)
    setError(null)
    setResults(null)
    const supabase = createClient()
    const outcomes: GroupResult[] = []

    try {
      for (const [locationId, groupPhotos] of groups) {
        const label = groupLabel(locationId)
        try {
          const takenAts = groupPhotos.map((p) => p.takenAt).filter((v): v is string => v !== '')
          const earliest = takenAts.length > 0 ? takenAts.sort()[0] : null

          const { data: record, error: insertError } = await supabase
            .from('records')
            .insert({
              user_id: userId,
              figure_id: figureId,
              location_id: locationId === UNSET ? null : locationId,
              location_name: '',
              photographed_at: earliest ? new Date(earliest).toISOString() : null,
              is_public: isPublic,
              photo_urls: [],
            })
            .select('id')
            .single()

          if (insertError) throw insertError

          for (let i = 0; i < groupPhotos.length; i++) {
            const photo = groupPhotos[i]
            const storagePath = await uploadPhoto(photo.file, userId)
            const { error: photoError } = await supabase.from('record_photos').insert({
              record_id: record.id,
              storage_path: storagePath,
              latitude: photo.latitude ? Number(photo.latitude) : null,
              longitude: photo.longitude ? Number(photo.longitude) : null,
              taken_at: photo.takenAt ? new Date(photo.takenAt).toISOString() : null,
              sort_order: i,
            })
            if (photoError) throw photoError
          }

          const weatherPhoto = groupPhotos.find((p) => p.latitude && p.longitude)
          const datetime = earliest ? new Date(earliest).toISOString() : new Date().toISOString()
          const weatherMessage = await fetchAndApplyWeather(supabase, record.id, weatherPhoto ? photoCoords(weatherPhoto) : null, datetime)

          outcomes.push({ label, count: groupPhotos.length, status: 'ok', message: weatherMessage })
        } catch (err) {
          outcomes.push({
            label,
            count: groupPhotos.length,
            status: 'error',
            message: err instanceof Error ? err.message : '保存に失敗しました',
          })
        }
      }

      setResults(outcomes)
      if (outcomes.every((o) => o.status === 'ok')) {
        clearPhotos()
        setManualAssignments({})
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (results) {
    return (
      <div className="space-y-4">
        <p className="font-display font-semibold">
          {results.filter((r) => r.status === 'ok').length}件の記録を作成しました
          {results.some((r) => r.status === 'error') && '（一部失敗しました）'}
        </p>
        <ul className="space-y-2">
          {results.map((r, i) => (
            <li key={i} className="border border-line rounded-lg p-3 bg-sumi-2 text-sm">
              <div className="font-display font-semibold flex items-center gap-2">
                {r.status === 'error' && <span className="text-hi-bright">⚠</span>}
                {r.label}（{r.count}枚）
              </div>
              <p className="text-nami-dim text-xs mt-1">{r.message}</p>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setResults(null)}
          className="border border-line rounded-full px-4 py-2 text-sm text-nami"
        >
          続けて取り込む
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PhotoPicker
        photos={photos}
        maxPhotos={MAX_IMPORT_PHOTOS}
        onAdd={addPhotos}
        onRemove={handleRemovePhoto}
        onCoordinateChange={updateCoordinate}
        onUseCurrentLocation={applyCurrentLocation}
      />

      {photos.length > 0 && (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-display font-semibold">地点への振り分け</p>
            <p className="text-xs text-nami-dim">
              GPSに近い地点を自動で選んでいます。違う場合や複数候補がある場合は選び直してください。
            </p>
          </div>

          <ul className="space-y-2">
            {photos.map((photo, i) => {
              const candidates = candidatesFor(photo)
              const current = assignmentFor(photo)
              return (
                <li key={photo.key} className="flex items-center gap-2 text-sm">
                  <span className="text-nami-dim text-xs w-14 shrink-0">写真{i + 1}</span>
                  <select
                    value={current}
                    onChange={(e) => setManualAssignments((prev) => ({ ...prev, [photo.key]: e.target.value }))}
                    className="flex-1 border border-line rounded p-2 bg-sumi-3 text-nami text-sm"
                  >
                    <option value={UNSET}>地点未設定</option>
                    {candidates.map((c) => (
                      <option key={c.location.id} value={c.location.id}>
                        第{c.location.number}景・{c.location.title_jp}（{c.distanceKm.toFixed(1)}km）
                      </option>
                    ))}
                  </select>
                </li>
              )
            })}
          </ul>

          <div className="border border-line rounded-lg p-3 bg-sumi-2 text-sm">
            <p className="font-display font-semibold mb-1">
              {photos.length}枚の写真は{groups.size}地点ぶんのようです
            </p>
            <p className="text-nami-dim text-xs">
              {[...groups.entries()].map(([locationId, ps]) => `${groupLabel(locationId)}(${ps.length}枚)`).join('／')}
              　で記録を作りますか？
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            これらの記録をすべて公開する
            <span className="text-nami-dim text-xs">（既定は非公開。公開時の他ユーザー閲覧はPhase2から）</span>
          </label>
        </div>
      )}

      {error && <p className="text-hi-bright text-sm">{error}</p>}

      <button
        type="button"
        onClick={handleImport}
        disabled={photos.length === 0 || submitting || convertingPhotos}
        className="bg-hi hover:bg-hi-bright text-nami rounded-full px-4 py-2 text-sm font-display disabled:opacity-50 transition-colors"
      >
        {submitting
          ? '取り込んでいます...'
          : convertingPhotos
            ? '写真を変換中...'
            : `記録を作成する（${groups.size || 0}件）`}
      </button>
    </div>
  )
}
