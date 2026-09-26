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

// Open-Meteoのレスポンスのうち使う部分だけ。外部APIなので数値は信用せず、使う直前に確かめる。
type OpenMeteoCurrentResponse = {
  current_weather?: { temperature?: unknown; weathercode?: unknown }
}
type OpenMeteoHourlyResponse = {
  hourly?: { time?: string[]; temperature_2m?: unknown[]; weathercode?: unknown[]; precipitation?: unknown[] }
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (!res.ok) throw new Error(`weather api responded ${res.status}`)
  return (await res.json()) as T
}

async function fetchCurrentWeather(latitude: number, longitude: number): Promise<WeatherSnapshot> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=UTC`
  const data = await fetchJson<OpenMeteoCurrentResponse>(url)
  const cw = data.current_weather
  const weathercode = numberOrNull(cw?.weathercode)
  return {
    temperature: numberOrNull(cw?.temperature),
    weathercode,
    precipitation: null,
    description: weatherCodeLabel(weathercode),
    source: 'current',
    fetchedAt: new Date().toISOString(),
  }
}

// 指定日時に最も近い1時間ぶんを、hourly配列から拾う。
// forecast APIは直近の過去もhourly値を返せるため、まずこちらを試す。
async function fetchHourlyWeather(latitude: number, longitude: number, datetime: Date): Promise<WeatherSnapshot> {
  const date = toDateOnly(datetime)
  const params = `latitude=${latitude}&longitude=${longitude}&start_date=${date}&end_date=${date}&hourly=temperature_2m,weathercode,precipitation&timezone=UTC`

  let data: OpenMeteoHourlyResponse | null = null
  try {
    data = await fetchJson<OpenMeteoHourlyResponse>(`https://api.open-meteo.com/v1/forecast?${params}`)
  } catch {
    // 古い日付は400で断られる。下でarchive APIへ切り替える
  }
  // forecast APIは、保持期間を少し過ぎた日付（実測で約2〜3か月前）だと200を返しつつ
  // 値をすべてnullで埋めてくる。これも「データなし」とみなしてarchive APIへ切り替える。
  if (!data?.hourly?.temperature_2m?.some((v) => v !== null)) {
    data = await fetchJson<OpenMeteoHourlyResponse>(`https://archive-api.open-meteo.com/v1/archive?${params}`)
  }

  const hourly = data.hourly
  const times = hourly?.time ?? []
  if (times.length === 0) throw new Error('no hourly data')

  let closestIndex = 0
  let closestDiff = Infinity
  const target = datetime.getTime()
  times.forEach((t, i) => {
    // hourly.timeはtimezone=UTC指定でも'Z'なしで返るため、付与しないとローカルタイムとして誤解釈される
    const utcString = t.endsWith('Z') ? t : `${t}Z`
    const diff = Math.abs(new Date(utcString).getTime() - target)
    if (diff < closestDiff) {
      closestDiff = diff
      closestIndex = i
    }
  })

  const weathercode = numberOrNull(hourly?.weathercode?.[closestIndex])
  return {
    temperature: numberOrNull(hourly?.temperature_2m?.[closestIndex]),
    weathercode,
    precipitation: numberOrNull(hourly?.precipitation?.[closestIndex]),
    description: weatherCodeLabel(weathercode),
    source: 'historical',
    fetchedAt: new Date().toISOString(),
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { latitude?: unknown; longitude?: unknown; datetime?: unknown } | null
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
