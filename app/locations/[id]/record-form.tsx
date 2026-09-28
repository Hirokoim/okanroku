'use client'

// 地点詳細で、右下の「記録する」ボタン（app/record-fab.tsx）から開くポップアップの記録フォーム。
// 入力欄の並びと保存処理だけを持ち、写真まわりとテキストの下書きは別ファイルに分けてある。
//
//   app/photos/use-photo-entries.ts … 添付写真の状態（追加・EXIF読み取り・現在地・削除）
//   app/photos/photo-picker.tsx     … 添付写真の見た目
//   record-draft.ts                 … 文字欄の一時保持（localStorage）

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fetchAndApplyWeather } from '@/lib/weather'
import { datePeriodToIso, TIME_PERIOD_OPTIONS } from '@/lib/time-period'
import { PhotoPicker } from '../../photos/photo-picker'
import { MAX_PHOTOS, usePhotoEntries } from '../../photos/use-photo-entries'
import { saveRecordPhotos } from '../../photos/save-record-photos'
import { OPEN_RECORD_FORM_EVENT } from '../../record-fab'
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
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  // 保存直後に「天気が実際に取れたか」をその場で確認できるようにするための表示専用の状態。
  // records.weatherの値自体は既に保存されているが、一覧まで見に行かなくても確認できるように。
  const [weatherStatus, setWeatherStatus] = useState<string | null>(null)

  const {
    photos,
    addPhotos,
    applyCurrentLocation,
    removePhoto,
    updateCoordinate,
    clearPhotos,
    pendingLocation,
    setPendingLocation,
  } = usePhotoEntries(setError)

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration後に一度だけlocalStorageの下書きを読む想定通りの用法
    setDraft(restored)
    if (restored.pending_location) setPendingLocation(restored.pending_location)
    // 下書きが残っていても、ポップアップを勝手には開かない（開いたときに入力が戻っている）
    setDraftReady(true)
  }, [locationId, setPendingLocation])

  // 右下の「記録する」ボタンが押されたら開く。前回の保存直後の表示は残さず、新しい記録から始める
  useEffect(() => {
    function openForm() {
      setSaved(false)
      setOpen(true)
    }
    window.addEventListener(OPEN_RECORD_FORM_EVENT, openForm)
    return () => window.removeEventListener(OPEN_RECORD_FORM_EVENT, openForm)
  }, [])

  // <dialog>のshowModal()を使う。背景の操作を止め、Escで閉じられ、フォーカスも中に閉じ込められる
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // 選んだ地点は写真側（usePhotoEntries）が持っているので、保存するときに合わせて書く
  useEffect(() => {
    if (!draftReady) return
    saveDraft(locationId, { ...draft, pending_location: pendingLocation })
  }, [draft, draftReady, locationId, pendingLocation])

  // HEIC→JPEG変換が終わる前に保存されると、変換前のHEICのままアップロードされて
  // しまう（use-photo-entries.tsがfileを差し替えるのは変換完了後のため）。
  const convertingPhotos = photos.some((p) => p.convertingHeic)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setWeatherStatus(null)

    const form = e.currentTarget
    const photographedAt =
      draft.photographed_date && draft.time_period
        ? datePeriodToIso(draft.photographed_date, draft.time_period)
        : null
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
          photographed_at: photographedAt,
          access_note: draft.access_note || null,
          voice_transcript: draft.voice_transcript || null,
          edit_intent: draft.edit_intent || null,
          is_public: draft.is_public,
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      await saveRecordPhotos(supabase, record.id, userId, photos)

      const weatherPhoto = photos.find((p) => p.latitude && p.longitude)
      const datetime = photographedAt ?? new Date().toISOString()
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
      setPendingLocation(null)
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
    <dialog
      ref={dialogRef}
      aria-labelledby="record-form-title"
      onClose={() => setOpen(false)}
      // 背景（ダイアログの外側）を押したら閉じる
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-[430px] max-h-[85dvh] overflow-y-auto rounded-2xl border border-line bg-sumi-2 text-nami p-0 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop:bg-black/60"
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-4 py-3 bg-sumi-2 border-b border-line">
        <div>
          <h2 id="record-form-title" className="font-body font-semibold">
            見えたものを、そのまま
          </h2>
          <p className="text-xs text-nami-dim">この地点に紐づけて保存されます</p>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="閉じる"
          className="shrink-0 w-10 h-10 -mr-2 -mt-1 rounded-full text-2xl leading-none text-nami-dim hover:text-nami"
        >
          ×
        </button>
      </div>

      {saved ? (
        <div className="p-4 space-y-3 bg-sumi-2">
          <p className="font-body font-semibold">記録しました</p>
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
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="text-sm text-kin underline"
            >
              閉じる
            </button>
          </div>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="p-4 space-y-4 bg-sumi-2">
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            訪問日
            <input
              name="photographed_date"
              type="date"
              value={draft.photographed_date}
              onChange={(e) => setDraft((d) => ({ ...d, photographed_date: e.target.value }))}
              className="w-full border border-line rounded p-2 mt-1 bg-sumi-3 text-nami"
            />
          </label>
          <label className="block text-sm">
            時間帯
            <select
              name="time_period"
              value={draft.time_period}
              onChange={(e) => setDraft((d) => ({ ...d, time_period: e.target.value as typeof d.time_period }))}
              className="w-full border border-line rounded p-2 mt-1 bg-sumi-3 text-nami"
            >
              <option value="">選択なし</option>
              {TIME_PERIOD_OPTIONS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <PhotoPicker
          photos={photos}
          maxPhotos={MAX_PHOTOS}
          onAdd={addPhotos}
          onRemove={removePhoto}
          onCoordinateChange={updateCoordinate}
          onUseCurrentLocation={applyCurrentLocation}
          pendingLocation={pendingLocation}
          onSetPendingLocation={setPendingLocation}
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

        {error && <p className="text-hi-bright text-sm"><span aria-hidden="true">⚠ </span>{error}</p>}

        <button
          type="submit"
          disabled={submitting || convertingPhotos}
          className="w-full bg-hi hover:bg-hi-hover text-nami rounded-full px-4 py-3 text-base font-body font-semibold disabled:opacity-50 transition-colors"
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
    </dialog>
  )
}
