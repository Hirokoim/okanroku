// 天気関連の共通処理。取得（app/api/weather/route.ts）と表示（location-records.tsx）の
// 両方から使うため、コード→日本語ラベルの変換をここに集約する。

import type { SupabaseClient } from '@supabase/supabase-js'

/** records.weather (jsonb) に保存する形。訪問時点のスナップショットであり、再取得はしない（5-E⑥） */
export type WeatherSnapshot = {
  temperature: number | null
  weathercode: number | null
  precipitation: number | null
  description: string
  /** 'current'＝取得時点の実況、'historical'＝指定日時に最も近い1時間ぶんの推定値、'manual'＝手動で選択した値 */
  source: 'current' | 'historical' | 'manual'
  fetchedAt: string
}

// Open-Meteoが使うWMO Weather interpretation codesを日本語ラベルへ変換する。
// 参考：https://open-meteo.com/en/docs （codesの説明表）
const WEATHER_CODE_LABELS: Record<number, string> = {
  0: '快晴',
  1: '晴れ',
  2: '晴れ',
  3: '曇り',
  45: '霧',
  48: '霧',
  51: '霧雨',
  53: '霧雨',
  55: '霧雨',
  56: '霧雨',
  57: '霧雨',
  61: '雨',
  63: '雨',
  65: '雨',
  66: '雨',
  67: '雨',
  71: '雪',
  73: '雪',
  75: '雪',
  77: '雪',
  80: '雨',
  81: '雨',
  82: '雨',
  85: '雪',
  86: '雪',
  95: '雷雨',
  96: '雷雨',
  99: '雷雨',
}

export function weatherCodeLabel(code: number | null): string {
  if (code === null) return '不明'
  return WEATHER_CODE_LABELS[code] ?? '不明'
}

// ラベルごとのアイコン。WEATHER_CODE_LABELSが既に8種類に集約してあるので、
// コードではなくラベル側にひもづける（テーブルを二重に持たないため）。
const WEATHER_LABEL_ICONS: Record<string, string> = {
  快晴: '☀️',
  晴れ: '🌤️',
  曇り: '☁️',
  霧: '🌫️',
  霧雨: '🌦️',
  雨: '🌧️',
  雪: '❄️',
  雷雨: '⛈️',
}

export function weatherCodeIcon(code: number | null): string {
  return WEATHER_LABEL_ICONS[weatherCodeLabel(code)] ?? '🌡️'
}

// 手動選択の選択肢。WEATHER_CODE_LABELSの8種類を、コードの昇順（＝表示したい順）で重複なく並べる。
export const WEATHER_LABELS: string[] = [...new Set(Object.values(WEATHER_CODE_LABELS))]

/** 手動選択されたラベルから、保存用に代表コードを1つ引く（表示用のアイコン・逆引きにのみ使う） */
export function weatherLabelToCode(label: string): number | null {
  const entry = Object.entries(WEATHER_CODE_LABELS).find(([, l]) => l === label)
  return entry ? Number(entry[0]) : null
}

// 記録の保存直後に天気を取得してrecords.weatherへ書き込む。
// 記録フォーム（1地点）と一括取り込み（複数地点）の両方から呼ぶため共通化した。
// 失敗しても記録の保存自体は成功しているため、例外を投げずメッセージ文字列を返すだけにする
// （呼び出し側は保存済みメッセージとしてそのまま表示できる。5-E⑥・外部API統合スキル）。
export async function fetchAndApplyWeather(
  supabase: SupabaseClient,
  recordId: string,
  coords: { latitude: number; longitude: number } | null,
  datetime: string
): Promise<string> {
  if (!coords) {
    return '座標情報のある写真がなかったため、天気は取得していません'
  }
  try {
    const res = await fetch('/api/weather', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude, datetime }),
    })
    if (!res.ok) {
      return '天気の取得に失敗しました（記録は保存されています）'
    }
    const weather = await res.json()
    await supabase.from('records').update({ weather }).eq('id', recordId)
    return `${weatherCodeIcon(weather.weathercode)} 天気を取得しました：${weather.description}${weather.temperature !== null ? `　${weather.temperature}℃` : ''}`
  } catch {
    // 圏外・API障害等。記録は既に保存済みのため何もしない。
    return '天気の取得に失敗しました（記録は保存されています）'
  }
}
