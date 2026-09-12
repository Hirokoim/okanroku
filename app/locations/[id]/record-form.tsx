'use client'

// 地点詳細から開く「ここで記録する」フォーム。
// 入力欄の並びと保存処理だけを持ち、写真まわりとテキストの下書きは別ファイルに分けてある。
//
//   app/photos/use-photo-entries.ts … 添付写真の状態（追加・EXIF読み取り・現在地・削除）
//   app/photos/photo-picker.tsx     … 添付写真の見た目
//   record-draft.ts                 … 文字欄の一時保持（localStorage）

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadPhoto } from '@/lib/storage'
import { fetchAndApplyWeather } from '@/lib/weather'
import { PhotoPicker } from '../../photos/photo-picker'
import { MAX_PHOTOS, usePhotoEntries } from '../../photos/use-photo-entries'
import { clearDraft, emptyDraft, loadDraft, saveDraft, type RecordDraft } from './record-draft'

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
  const [saved, setSaved] = useState(false)
  // 保存直後に「天気が実際に取れたか」をその場で確認できるようにするための表示専用の状態。
  // records.weatherの値自体は既に保存されているが、一覧まで見に行かなくても確認できるように。
  const [weatherStatus, setWeatherStatus] = useState<string | null>(null)

  const { photos, addPhotos, applyCurrentLocation, removePhoto, updateCoordinate, clearPhotos } =
    usePhotoEntries(setError)

  // 入力途中のテキスト欄をlocalStorageへ一時保持する（roadmap.md Phase1タスク(G)）。
  // 写真ファイルは対象外（EXIF再読み込みで足りるため、持たせるとかえって複雑になる）。
  // useStateの初期値は必ず空にする：ここでlocalStorageを読むとサーバー側の描画
  // （常に空）とクライアント側の初回描画が食い違い、hydrationのズレが起きるため。
  // 実際の下書きはマウント後（＝hydration後）にeffectで読み込む。
  const [draft, setDraft] = useState<RecordDraft>(emptyDraft)
  const [draftReady, setDraftReady] = useState(false)

  useEffect(() => {
    const restored = loadDraft(locationId)
    // マウント後に一度だけ外部（localStorage）から読み込む、想定通りの使い方だが、
    // react-hooks/set-state-in-effectはeffect内の直接setStateを一律に警告するため抑止する。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(restored)
    setDraftReady(true)
    // 下書きが残っていたことに気づけるよう、その場合だけ開いておく
    if (Object.values(restored).some((v) => (typeof v === 'boolean' ? v : v !== ''))) {
      setOpen(true)
    }
  }, [locationId])

  useEffect(() => {
    if (!draftReady) return
    saveDraft(locationId, draft)
  }, [draft, draftReady, locationId])

  // HEIC→JPEG変換が終わる前に保存されると、変換前のHEICのままアップロードされて
  // しまう（use-photo-entries.tsがfileを差し替えるのは変換完了後のため）。
  const convertingPhotos = photos.some((p) => p.convertingHeic)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setWeatherStatus(null)

    const form = e.currentTarget
    const photographedAtRaw = draft.photographed_at
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
          access_note: draft.access_note || null,
          voice_transcript: draft.voice_transcript || null,
          edit_intent: draft.edit_intent || null,
          is_public: draft.is_public,
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

      const weatherPhoto = photos.find((p) => p.latitude && p.longitude)
      const datetime = photographedAtRaw ? new Date(photographedAtRaw).toISOString() : new Date().toISOString()
      setWeatherStatus(
        await fetchAndApplyWeather(
          supabase,
          record.id,
          weatherPhoto ? { latitude: Number(weatherPhoto.latitude), longitude: Number(weatherPhoto.longitude) } : null,
          datetime
        )
      )

      form.reset()
      clearPhotos()
      clearDraft(locationId)
      setDraft(emptyDraft)
      setSaved(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <details
      className="border border-line rounded-lg overflow-hidden mt-3"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="cursor-pointer select-none px-4 py-3 bg-sumi-2 font-display font-semibold text-sm flex items-center justify-between">
        見えたものを、そのまま
        <span className="text-xs text-nami-dim font-normal">この地点に紐づけて保存されます</span>
      </summary>

      {saved ? (
        <div className="p-4 space-y-3 border-t border-line bg-sumi-2">
          <p className="font-display font-semibold">記録しました</p>
          <p className="text-sm text-nami-dim">今日のここでの一日が、原本に一行増えました。</p>
          {weatherStatus && <p className="text-nami-dim text-sm">{weatherStatus}</p>}
          <div className="flex gap-3 items-center">
            <button
              type="button"
              onClick={() => setSaved(false)}
              className="border border-line rounded-full px-4 py-2 text-sm text-nami"
            >
              続けて記録する
            </button>
            <Link href="/map" className="text-sm text-kin underline">
              地図に戻る
            </Link>
          </div>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="p-4 space-y-4 border-t border-line bg-sumi-2">
        <label className="block text-sm">
          訪問日時
          <input
            name="photographed_at"
            type="datetime-local"
            value={draft.photographed_at}
            onChange={(e) => setDraft((d) => ({ ...d, photographed_at: e.target.value }))}
            className="w-full border border-line rounded p-2 mt-1 bg-sumi-3 text-nami"
          />
        </label>

        <PhotoPicker
          photos={photos}
          maxPhotos={MAX_PHOTOS}
          onAdd={addPhotos}
          onRemove={removePhoto}
          onCoordinateChange={updateCoordinate}
          onUseCurrentLocation={applyCurrentLocation}
        />

        <label className="block text-sm">
          気づきメモ
          <textarea
            name="voice_transcript"
            placeholder="絵と違ったところ、同じだったところ"
            value={draft.voice_transcript}
            onChange={(e) => setDraft((d) => ({ ...d, voice_transcript: e.target.value }))}
            className="w-full border border-line rounded p-2 mt-1 bg-sumi-3 text-nami placeholder:text-nami-dim"
          />
          <p className="text-xs text-nami-dim mt-1">あとから直せます。いまは一行で十分です。</p>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            編集意図（1行）
            <input
              name="edit_intent"
              value={draft.edit_intent}
              onChange={(e) => setDraft((d) => ({ ...d, edit_intent: e.target.value }))}
              className="w-full border border-line rounded p-2 mt-1 bg-sumi-3 text-nami"
            />
          </label>
          <label className="block text-sm">
            アクセス情報
            <input
              name="access_note"
              value={draft.access_note}
              onChange={(e) => setDraft((d) => ({ ...d, access_note: e.target.value }))}
              className="w-full border border-line rounded p-2 mt-1 bg-sumi-3 text-nami"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            name="is_public"
            type="checkbox"
            checked={draft.is_public}
            onChange={(e) => setDraft((d) => ({ ...d, is_public: e.target.checked }))}
          />
          この記録を公開する
          <span className="text-nami-dim text-xs">（既定は非公開。公開時の他ユーザー閲覧はPhase2から）</span>
        </label>

        <p className="text-xs text-nami-dim">
          天気は保存後に自動で取得されます。取得できなくても保存は失敗しません。
        </p>

        {error && <p className="text-hi-bright text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting || convertingPhotos}
          className="bg-hi hover:bg-hi-bright text-nami rounded-full px-4 py-2 text-sm font-display disabled:opacity-50 transition-colors"
        >
          {submitting
            ? '書きとめています...'
            : convertingPhotos
              ? '写真を変換中...'
              : photos.length > 0
                ? `書きとめる（写真${photos.length}枚）`
                : '書きとめる'}
        </button>
      </form>
      )}
    </details>
  )
}
