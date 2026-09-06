'use client'

// 地点詳細から開く「ここで記録する」フォーム。
// 入力欄の並びと保存処理だけを持ち、写真まわりは2つのファイルに分けてある。
//
//   use-photo-entries.ts … 添付写真の状態（追加・EXIF読み取り・現在地・削除）
//   photo-picker.tsx     … 添付写真の見た目

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadPhoto } from '@/lib/storage'
import { PhotoPicker } from './photo-picker'
import { usePhotoEntries } from './use-photo-entries'

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
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { photos, addPhotos, applyCurrentLocation, removePhoto, updateCoordinate, clearPhotos } =
    usePhotoEntries(setError)

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
          // datetime-localはタイムゾーン情報を持たないため、端末のローカル時刻として解釈する
          taken_at: photo.takenAt ? new Date(photo.takenAt).toISOString() : null,
          sort_order: i,
        })
        if (photoError) throw photoError
      }

      form.reset()
      clearPhotos()
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

        <PhotoPicker
          photos={photos}
          onAdd={addPhotos}
          onRemove={removePhoto}
          onCoordinateChange={updateCoordinate}
          onUseCurrentLocation={applyCurrentLocation}
        />

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
