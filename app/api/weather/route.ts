// 記録保存後の天気取得だけを担うAPIルート。
//
// キーが不要なOpen-Meteoを使うため、ここに秘密の管理は発生しないが、
// 「ブラウザから外部APIを直接叩かない」構成は保つ（external-api-integration スキル）。
// 失敗しても記録の保存自体は失敗させない設計（5-E⑥）のため、ここでのエラーは
// すべて非200で返すだけにとどめ、呼び出し側（record-form.tsx）が無言で捨てる。

import { NextRequest, NextResponse } from 'next/server'
import { weatherCodeLabel, type WeatherSnapshot } from '@/lib/weather'

const FETCH_TIMEOUT_MS = 5000
const NOW_THRESHOLD_MS = 60 * 60 * 1000 // 訪問日時が現在時刻から1時間以内なら「現地での即時記録」とみなす

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function fetchJson(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (!res.ok) throw new Error(`weather api responded ${res.status}`)
  return res.json()
}

async function fetchCurrentWeather(latitude: number, longitude: number): Promise<WeatherSnapshot> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=UTC`
  const data = await fetchJson(url)
  const cw = data.current_weather
  return {
    temperature: typeof cw?.temperature === 'number' ? cw.temperature : null,
    weathercode: typeof cw?.weathercode === 'number' ? cw.weathercode : null,
    precipitation: null,
    description: weatherCodeLabel(cw?.weathercode ?? null),
    source: 'current',
    fetchedAt: new Date().toISOString(),
  }
}

// 指定日時に最も近い1時間ぶんを、hourly配列から拾う。
// forecast APIは直近92日程度までhourly値を過去にも遡って返せるため、まずこちらを試し、
// それより古い日付（400が返る）だけarchive APIへ切り替える。
async function fetchHourlyWeather(latitude: number, longitude: number, datetime: Date): Promise<WeatherSnapshot> {
  const date = toDateOnly(datetime)
  const params = `latitude=${latitude}&longitude=${longitude}&start_date=${date}&end_date=${date}&hourly=temperature_2m,weathercode,precipitation&timezone=UTC`

  let data
  try {
    data = await fetchJson(`https://api.open-meteo.com/v1/forecast?${params}`)
  } catch {
    data = await fetchJson(`https://archive-api.open-meteo.com/v1/archive?${params}`)
  }

  const times: string[] = data.hourly?.time ?? []
  if (times.length === 0) throw new Error('no hourly data')

  let closestIndex = 0
  let closestDiff = Infinity
  const target = datetime.getTime()
  times.forEach((t, i) => {
    const diff = Math.abs(new Date(t).getTime() - target)
    if (diff < closestDiff) {
      closestDiff = diff
      closestIndex = i
    }
  })

  const weathercode = data.hourly.weathercode?.[closestIndex] ?? null
  return {
    temperature: data.hourly.temperature_2m?.[closestIndex] ?? null,
    weathercode,
    precipitation: data.hourly.precipitation?.[closestIndex] ?? null,
    description: weatherCodeLabel(weathercode),
    source: 'historical',
    fetchedAt: new Date().toISOString(),
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const latitude = Number(body?.latitude)
  const longitude = Number(body?.longitude)
  const datetimeRaw = body?.datetime

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    typeof datetimeRaw !== 'string'
  ) {
    return NextResponse.json({ error: 'invalid input' }, { status: 400 })
  }

  const datetime = new Date(datetimeRaw)
  if (isNaN(datetime.getTime())) {
    return NextResponse.json({ error: 'invalid datetime' }, { status: 400 })
  }

  try {
    const isNow = Math.abs(Date.now() - datetime.getTime()) < NOW_THRESHOLD_MS
    const weather = isNow
      ? await fetchCurrentWeather(latitude, longitude)
      : await fetchHourlyWeather(latitude, longitude, datetime)
    return NextResponse.json(weather)
  } catch {
    return NextResponse.json({ error: 'weather fetch failed' }, { status: 502 })
  }
}
