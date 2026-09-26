'use client'

// 保存済みの記録1件を編集するフォーム。location-records.tsxの一覧内でトグル表示する。
// 天気・写真・記録削除の各ロジックはuse-record-weather/use-record-photos/DeleteRecordButtonに
// 分離してあり、ここはフォーム全体の基本編集・送信と、各パーツの組み立てだけを担う。

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { weatherLabelToCode } from '@/lib/weather'
import type { Database } from '@/lib/supabase/database.types'
import { dateKey } from '@/lib/format'
import { datePeriodToIso, timePeriodFromDatetime, TIME_PERIOD_OPTIONS, type TimePeriodKey } from '@/lib/time-period'
import type { LocationRecord } from './record-types'
import { useRecordWeather } from './use-record-weather'
import { useRecordPhotos } from './use-record-photos'
import { RecordWeatherSection } from './record-weather-section'
import { RecordPhotoManager } from './record-photo-manager'
import { DeleteRecordButton } from './delete-record-button'

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

  // 天気の再取得（下のuseRecordWeather）は保存前の値も使えるよう、
  // フォームのdefaultValueではなく制御された状態として持つ。
  const [photographedDate, setPhotographedDate] = useState(dateKey(record.photographed_at) ?? '')
  const [timePeriod, setTimePeriod] = useState<TimePeriodKey | ''>(
    timePeriodFromDatetime(record.photographed_at) ?? ''
  )
  const currentPhotographedAt =
    photographedDate && timePeriod ? datePeriodToIso(photographedDate, timePeriod) : null

  const weather = useRecordWeather(record, currentPhotographedAt)
  const photos = useRecordPhotos(record.id, userId, record.photos)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const weatherOverrideLabel = formData.get('weather_override') as string
    const weatherTemperatureRaw = formData.get('weather_temperature') as string
    const supabase = createClient()

    try {
      const update: Database['public']['Tables']['records']['Update'] = {
        photographed_at: currentPhotographedAt,
        access_note: (formData.get('access_note') as string) || null,
        voice_transcript: (formData.get('voice_transcript') as string) || null,
        edit_intent: (formData.get('edit_intent') as string) || null,
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

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-3 border border-line rounded bg-sumi-4 shadow-[0_2px_8px_rgba(0,0,0,0.4)] space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          訪問日
          <input
            name="photographed_date"
            type="date"
            value={photographedDate}
            onChange={(e) => setPhotographedDate(e.target.value)}
            className="w-full border border-line rounded p-2 mt-1 bg-sumi-2 text-nami"
          />
        </label>
        <label className="block text-sm">
          時間帯
          <select
            name="time_period"
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value as TimePeriodKey | '')}
            className="w-full border border-line rounded p-2 mt-1 bg-sumi-2 text-nami"
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

      <label className="block text-sm">
        気づきメモ
        <textarea
          name="voice_transcript"
          defaultValue={record.voice_transcript ?? ''}
          className="w-full border border-line rounded p-2 mt-1 bg-sumi-2 text-nami"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          編集意図（1行）
          <input
            name="edit_intent"
            defaultValue={record.edit_intent ?? ''}
            className="w-full border border-line rounded p-2 mt-1 bg-sumi-2 text-nami"
          />
        </label>
        <label className="block text-sm">
          アクセス情報
          <input
            name="access_note"
            defaultValue={record.access_note ?? ''}
            className="w-full border border-line rounded p-2 mt-1 bg-sumi-2 text-nami"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input name="is_public" type="checkbox" defaultChecked={record.is_public} />
        この記録を公開する
      </label>

      <RecordWeatherSection
        record={record}
        weatherPhoto={weather.weatherPhoto}
        retrying={weather.retrying}
        status={weather.status}
        onRetry={weather.retry}
      />

      <RecordPhotoManager
        photos={record.photos}
        adding={photos.adding}
        error={photos.error}
        locatingPhotoId={photos.locatingPhotoId}
        onSetLocatingPhotoId={photos.setLocatingPhotoId}
        onAddPhotos={photos.addPhotos}
        onUpdateLocation={photos.updateLocation}
        onRemove={photos.remove}
      />

      {error && <p className="text-hi-bright text-sm"><span aria-hidden="true">⚠ </span>{error}</p>}

      <div className="pt-1 space-y-3">
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-hi hover:bg-hi-hover text-nami rounded-full px-3 py-2.5 text-sm font-body font-semibold disabled:opacity-50 transition-colors"
          >
            {submitting ? '保存中...' : '保存する'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm text-nami-dim border border-line rounded-full"
          >
            キャンセル
          </button>
        </div>
        <DeleteRecordButton record={record} onDeleted={onClose} />
      </div>
    </form>
  )
}
