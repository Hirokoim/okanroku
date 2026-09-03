'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadPhoto } from '@/lib/storage'
import { newId } from '@/lib/id'

const MAX_PHOTOS = 5

type PhotoEntry = {
  key: string
  file: File
  previewUrl: string
  latitude: string
  longitude: string
}

// EXIFからのGPS自動抽出（機能②・タスクC）は未実装。当面は撮影地点を手入力する。
// 取得できない写真も珍しくない前提のため、この手入力欄自体が代替入力になる。
function newPhotoEntry(file: File): PhotoEntry {
  return {
    key: newId(),
    file,
    previewUrl: URL.createObjectURL(file),
    latitude: '',
    longitude: '',
  }
}

export function LocationRecordForm({
  locationId,
  figureId,
  userId,
}: {
  locationId: string
  figureId: string
  userId: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return

    // input.files が返す FileList は「生きた」オブジェクトで、直後に input.value = '' で
    // 選択を解除すると同じオブジェクトの中身が空になる。setStateの更新関数は遅延実行される
    // ため、その中で FileList を読むと空になった後を見てしまい、写真が1枚も追加されない
    // （エラーも出ないので気づけない）。ここで同期的に配列へ写しきってから state に渡す。
    const room = MAX_PHOTOS - photos.length
    if (room <= 0) return

    try {
      const added = Array.from(files).slice(0, room).map(newPhotoEntry)
      setPhotos((prev) => [...prev, ...added])
    } catch (err) {
      setError(err instanceof Error ? err.message : '写真の読み込みに失敗しました')
    }
  }

  function removePhoto(key: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.key === key)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((p) => p.key !== key)
    })
  }

  function updatePhoto(key: string, field: 'latitude' | 'longitude', value: string) {
    setPhotos((prev) => prev.map((p) => (p.key === key ? { ...p, [field]: value } : p)))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const form = e.currentTarget
    const formData = new FormData(form)
    const photographedAtRaw = formData.get('photographed_at') as string
    const supabase = createClient()

    try {
      const { data: record, error: insertError } = await supabase
        .from('records')
        .insert({
          user_id: userId,
          figure_id: figureId,
          location_id: locationId,
          // location_id が設定されているため location_name/work_label は使わない（5-E⑦）
          location_name: '',
          // datetime-localはタイムゾーン情報を持たないため、端末のローカル時刻として解釈して保存する
          photographed_at: photographedAtRaw ? new Date(photographedAtRaw).toISOString() : null,
          access_note: formData.get('access_note') || null,
          voice_transcript: formData.get('voice_transcript') || null,
          edit_intent: formData.get('edit_intent') || null,
          is_public: formData.get('is_public') === 'on',
          photo_urls: [],
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i]
        const storagePath = await uploadPhoto(photo.file, userId)
        const { error: photoError } = await supabase.from('record_photos').insert({
          record_id: record.id,
          storage_path: storagePath,
          latitude: photo.latitude ? Number(photo.latitude) : null,
          longitude: photo.longitude ? Number(photo.longitude) : null,
          sort_order: i,
        })
        if (photoError) throw photoError
      }

      form.reset()
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl))
      setPhotos([])
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <details
      className="border rounded-lg overflow-hidden mt-3"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="cursor-pointer select-none px-4 py-3 bg-gray-50 font-semibold text-sm flex items-center justify-between">
        ここで記録する
        <span className="text-xs text-gray-400 font-normal">この地点に紐づけて保存されます</span>
      </summary>

      <form onSubmit={handleSubmit} className="p-4 space-y-4 border-t">
        <label className="block text-sm">
          訪問日時
          <input name="photographed_at" type="datetime-local" className="w-full border rounded p-2 mt-1" />
        </label>

        <div>
          <label className="block text-sm mb-1">
            写真{' '}
            {photos.length > 0 ? (
              <span className="text-xs font-medium text-green-700">
                {photos.length}枚を添付中（保存はまだです）
              </span>
            ) : (
              <span className="text-gray-400 text-xs">最大{MAX_PHOTOS}枚</span>
            )}
          </label>

          {photos.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 mb-2">
              {photos.map((photo) => (
                <li key={photo.key} className="border rounded-lg p-2 text-xs space-y-1">
                  {/* eslint-disable-next-line @next/next/no-img-element -- ローカルのobject URLのためnext/imageは使わない */}
                  <img src={photo.previewUrl} alt="" className="w-full aspect-[4/3] object-cover rounded" />
                  <div className="grid grid-cols-2 gap-1">
                    <input
                      type="number"
                      step="any"
                      placeholder="緯度"
                      value={photo.latitude}
                      onChange={(e) => updatePhoto(photo.key, 'latitude', e.target.value)}
                      className="border rounded p-1 w-full"
                    />
                    <input
                      type="number"
                      step="any"
                      placeholder="経度"
                      value={photo.longitude}
                      onChange={(e) => updatePhoto(photo.key, 'longitude', e.target.value)}
                      className="border rounded p-1 w-full"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.key)}
                    className="text-red-600 text-xs"
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          )}

          {photos.length < MAX_PHOTOS && (
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                addPhotos(e.target.files)
                e.target.value = ''
              }}
              className="w-full text-sm"
            />
          )}
          <p className="text-xs text-gray-400 mt-1">
            座標の自動取得（EXIF）は未対応です。分かる範囲で手入力してください。空欄のままでも保存できます。
          </p>
        </div>

        <label className="block text-sm">
          気づきメモ
          <textarea
            name="voice_transcript"
            placeholder="なぜここをこう切ったか、現地で感じた仮説を書く"
            className="w-full border rounded p-2 mt-1"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            編集意図（1行）
            <input name="edit_intent" className="w-full border rounded p-2 mt-1" />
          </label>
          <label className="block text-sm">
            アクセス情報
            <input name="access_note" className="w-full border rounded p-2 mt-1" />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input name="is_public" type="checkbox" />
          この記録を公開する
          <span className="text-gray-400 text-xs">（既定は非公開。公開時の他ユーザー閲覧はPhase2から）</span>
        </label>

        <p className="text-xs text-gray-400">
          天気は保存後に自動で取得されます。取得できなくても保存は失敗しません。
        </p>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
        >
          {submitting
            ? '保存中...'
            : photos.length > 0
              ? `記録を保存する（写真${photos.length}枚）`
              : '記録を保存する'}
        </button>
      </form>
    </details>
  )
}
