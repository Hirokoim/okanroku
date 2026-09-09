'use client'

// 保存済みの記録1件を編集するフォーム。location-records.tsxの一覧内でトグル表示する。
// 天気の手動選択・写真の追加削除・記録そのものの削除もここに集約する。

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadPhoto } from '@/lib/storage'
import { readExif } from '@/lib/exif'
import { toDisplayableImage } from '@/lib/heic'
import { weatherCodeIcon, weatherLabelToCode, WEATHER_LABELS } from '@/lib/weather'
import type { LocationRecord } from './location-records'

const MAX_PHOTOS = 5

function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function EditRecordForm({
  record,
  userId,
  onClose,
}: {
  record: LocationRecord
  userId: string
  onClose: () => void
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryingWeather, setRetryingWeather] = useState(false)
  const [weatherStatus, setWeatherStatus] = useState<string | null>(null)
  const [addingPhotos, setAddingPhotos] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // 天気の再取得に使う座標。写真ごとにGPSが異なるため、最初に座標を持つ1枚を使う
  // （新規保存時（record-form.tsx）と同じ考え方）。
  const weatherPhoto = record.photos.find((p) => p.latitude !== null && p.longitude !== null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const photographedAtRaw = formData.get('photographed_at') as string
    const weatherOverrideLabel = formData.get('weather_override') as string
    const weatherTemperatureRaw = formData.get('weather_temperature') as string
    const supabase = createClient()

    try {
      const update: Record<string, unknown> = {
        photographed_at: photographedAtRaw ? new Date(photographedAtRaw).toISOString() : null,
        access_note: formData.get('access_note') || null,
        voice_transcript: formData.get('voice_transcript') || null,
        edit_intent: formData.get('edit_intent') || null,
        is_public: formData.get('is_public') === 'on',
      }

      // 「変更しない」以外が選ばれていたときだけ、天気を手動値で上書きする。
      if (weatherOverrideLabel) {
        update.weather = {
          temperature: weatherTemperatureRaw ? Number(weatherTemperatureRaw) : null,
          weathercode: weatherLabelToCode(weatherOverrideLabel),
          precipitation: null,
          description: weatherOverrideLabel,
          source: 'manual',
          fetchedAt: new Date().toISOString(),
        }
      }

      const { error: updateError } = await supabase.from('records').update(update).eq('id', record.id)
      if (updateError) throw updateError

      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRetryWeather() {
    if (!weatherPhoto || weatherPhoto.latitude === null || weatherPhoto.longitude === null) return
    setRetryingWeather(true)
    setWeatherStatus(null)
    const supabase = createClient()

    try {
      const datetime = record.photographed_at ?? weatherPhoto.taken_at ?? new Date().toISOString()
      const res = await fetch('/api/weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: weatherPhoto.latitude, longitude: weatherPhoto.longitude, datetime }),
      })
      if (!res.ok) {
        setWeatherStatus('天気の取得に失敗しました')
        return
      }
      const weather = await res.json()
      await supabase.from('records').update({ weather }).eq('id', record.id)
      setWeatherStatus(
        `${weatherCodeIcon(weather.weathercode)} 天気を取得しました：${weather.description}${weather.temperature !== null ? `　${weather.temperature}℃` : ''}`
      )
      router.refresh()
    } catch {
      setWeatherStatus('天気の取得に失敗しました')
    } finally {
      setRetryingWeather(false)
    }
  }

  async function handleAddPhotos(files: FileList | null) {
    if (!files || files.length === 0) return
    setPhotoError(null)

    const room = MAX_PHOTOS - record.photos.length
    if (room <= 0) {
      setPhotoError(`写真は最大${MAX_PHOTOS}枚までです`)
      return
    }

    setAddingPhotos(true)
    const supabase = createClient()

    try {
      const toAdd = Array.from(files).slice(0, room)
      for (let i = 0; i < toAdd.length; i++) {
        const original = toAdd[i]
        const exif = await readExif(original)
        const displayable = await toDisplayableImage(original)
        const storagePath = await uploadPhoto(displayable, userId)
        const { error: insertError } = await supabase.from('record_photos').insert({
          record_id: record.id,
          storage_path: storagePath,
          latitude: exif.latitude,
          longitude: exif.longitude,
          taken_at: exif.takenAt,
          sort_order: record.photos.length + i,
        })
        if (insertError) throw insertError
      }
      router.refresh()
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : '写真の追加に失敗しました')
    } finally {
      setAddingPhotos(false)
    }
  }

  async function handleRemovePhoto(photoId: string, storagePath: string) {
    setPhotoError(null)
    const supabase = createClient()

    try {
      const { error: deleteError } = await supabase.from('record_photos').delete().eq('id', photoId)
      if (deleteError) throw deleteError
      // Storage側のファイル本体も削除を試みる。行の削除自体は上で完了しているため、
      // ここが失敗しても記録上は「削除済み」として扱うが、原因調査のため画面には出す。
      const { error: storageError } = await supabase.storage.from('photos').remove([storagePath])
      if (storageError) {
        console.error('写真ファイルの削除に失敗しました', storageError)
        setPhotoError(`写真の行は削除しましたが、ファイル本体の削除に失敗しました：${storageError.message}`)
      }
      router.refresh()
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : '写真の削除に失敗しました')
    }
  }

  async function handleDeleteRecord() {
    if (!window.confirm('この記録を削除します。本当に削除しますか？（元に戻せません）')) return
    setDeleting(true)
    setError(null)
    const supabase = createClient()

    try {
      // 写真本体（Storage）もあわせて削除を試みる。失敗しても記録の削除は続行する
      // （孤立ファイルが残るより、記録が消せない方が困るため）。
      const paths = record.photos.map((p) => p.storage_path)
      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage.from('photos').remove(paths)
        if (storageError) {
          console.error('写真ファイルの削除に失敗しました', storageError)
        }
      }
      const { error: deleteError } = await supabase.from('records').delete().eq('id', record.id)
      if (deleteError) throw deleteError
      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました')
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-3 border rounded bg-gray-50 space-y-3">
      <label className="block text-sm">
        訪問日時
        <input
          name="photographed_at"
          type="datetime-local"
          defaultValue={isoToLocalInput(record.photographed_at)}
          className="w-full border rounded p-2 mt-1"
        />
      </label>

      <label className="block text-sm">
        気づきメモ
        <textarea
          name="voice_transcript"
          defaultValue={record.voice_transcript ?? ''}
          className="w-full border rounded p-2 mt-1"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          編集意図（1行）
          <input name="edit_intent" defaultValue={record.edit_intent ?? ''} className="w-full border rounded p-2 mt-1" />
        </label>
        <label className="block text-sm">
          アクセス情報
          <input name="access_note" defaultValue={record.access_note ?? ''} className="w-full border rounded p-2 mt-1" />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input name="is_public" type="checkbox" defaultChecked={record.is_public} />
        この記録を公開する
      </label>

      <div className="border-t pt-3 space-y-2">
        <div className="text-xs text-gray-500">
          天気：
          {record.weather
            ? `${weatherCodeIcon(record.weather.weathercode)} ${record.weather.description}${record.weather.temperature !== null ? `　${record.weather.temperature}℃` : ''}`
            : '未取得'}
        </div>

        {weatherPhoto ? (
          <button
            type="button"
            onClick={handleRetryWeather}
            disabled={retryingWeather}
            className="text-xs text-blue-600 underline disabled:opacity-50"
          >
            {retryingWeather ? '取得中...' : '天気を再取得する'}
          </button>
        ) : (
          <p className="text-xs text-gray-400">座標情報のある写真がないため、天気は再取得できません</p>
        )}
        {weatherStatus && <p className="text-xs text-gray-600">{weatherStatus}</p>}

        <label className="block text-xs text-gray-500">
          天気を手動で選ぶ（自動取得が外れていた場合の修正用）
          <div className="flex gap-2 mt-1">
            <select name="weather_override" defaultValue="" className="border rounded p-1.5 text-sm flex-1">
              <option value="">変更しない（自動取得のまま）</option>
              {WEATHER_LABELS.map((label) => (
                <option key={label} value={label}>
                  {weatherCodeIcon(weatherLabelToCode(label))} {label}
                </option>
              ))}
            </select>
            <input
              name="weather_temperature"
              type="number"
              step="0.1"
              placeholder="気温（℃・任意）"
              defaultValue={record.weather?.temperature ?? ''}
              className="border rounded p-1.5 text-sm w-32"
            />
          </div>
        </label>
      </div>

      <div className="border-t pt-3 space-y-2">
        <div className="text-xs text-gray-500">写真（{record.photos.length}/{MAX_PHOTOS}枚）</div>
        {record.photos.length > 0 && (
          <ul className="grid grid-cols-3 gap-2">
            {record.photos.map((photo) => (
              <li key={photo.id} className="relative">
                {photo.unsupportedFormat ? (
                  <div className="w-full aspect-[4/3] rounded border grid place-items-center text-gray-400 text-[10px] text-center px-1">
                    HEIC形式のため表示不可
                  </div>
                ) : photo.url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 署名URLのためnext/imageは使わない
                  <img src={photo.url} alt="" className="w-full aspect-[4/3] object-cover rounded border" />
                ) : (
                  <div className="w-full aspect-[4/3] rounded border grid place-items-center text-gray-400 text-[10px]">
                    読み込めません
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(photo.id, photo.storage_path)}
                  className="absolute top-1 right-1 bg-white/90 border rounded px-1.5 text-[10px] text-red-600"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
        {record.photos.length < MAX_PHOTOS && (
          <label className="block text-xs text-blue-600 underline cursor-pointer w-fit">
            {addingPhotos ? '追加中...' : '＋ 写真を追加する'}
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={addingPhotos}
              className="hidden"
              onChange={(e) => {
                handleAddPhotos(e.target.files)
                e.target.value = ''
              }}
            />
          </label>
        )}
        {photoError && <p className="text-red-600 text-xs">{photoError}</p>}
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex items-center justify-between pt-1">
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="bg-black text-white rounded px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {submitting ? '保存中...' : '保存する'}
          </button>
          <button type="button" onClick={onClose} className="text-sm text-gray-500 underline">
            キャンセル
          </button>
        </div>
        <button
          type="button"
          onClick={handleDeleteRecord}
          disabled={deleting}
          className="text-xs text-red-600 underline disabled:opacity-50"
        >
          {deleting ? '削除中...' : 'この記録を削除する'}
        </button>
      </div>
    </form>
  )
}
