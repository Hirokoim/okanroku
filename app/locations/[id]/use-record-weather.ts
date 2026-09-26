// 記録編集フォームの天気再取得ロジック。EditRecordForm/RecordWeatherSectionが使う。

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { weatherCodeIcon, type WeatherSnapshot } from '@/lib/weather'
import type { LocationRecord } from './record-types'

export function useRecordWeather(record: LocationRecord, photographedAt: string | null) {
  const router = useRouter()
  const [retrying, setRetrying] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  // 天気の再取得に使う座標。写真ごとにGPSが異なるため、最初に座標を持つ1枚を使う
  // （新規保存時（record-form.tsx）と同じ考え方）。
  const weatherPhoto = record.photos.find((p) => p.latitude !== null && p.longitude !== null)

  async function retry() {
    if (!weatherPhoto || weatherPhoto.latitude === null || weatherPhoto.longitude === null) return
    setRetrying(true)
    setStatus(null)
    const supabase = createClient()

    try {
      // フォーム上で訪問日・時間帯を変更中の場合は、保存前でもその値を優先する
      // （保存済みのrecord.photographed_atのままだと、変更した時間帯の天気が取れない）。
      const datetime = photographedAt ?? weatherPhoto.taken_at ?? new Date().toISOString()
      const res = await fetch('/api/weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: weatherPhoto.latitude, longitude: weatherPhoto.longitude, datetime }),
      })
      if (!res.ok) {
        setStatus('天気の取得に失敗しました')
        return
      }
      const weather = (await res.json()) as WeatherSnapshot
      await supabase.from('records').update({ weather }).eq('id', record.id)
      setStatus(
        `${weatherCodeIcon(weather.weathercode)} 天気を取得しました：${weather.description}${weather.temperature !== null ? `　${weather.temperature}℃` : ''}`
      )
      router.refresh()
    } catch {
      setStatus('天気の取得に失敗しました')
    } finally {
      setRetrying(false)
    }
  }

  return { weatherPhoto, retrying, status, retry }
}
