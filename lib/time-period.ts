// 訪問時刻を「分単位の正確な時刻」ではなく「時間帯ラベル」で入力・表示するための共通処理。
// 分単位の入力は往還録の「思い出して記録する」用途には過剰なため、ラベル選択に置き換えた。
// 天気取得（app/api/weather/route.ts）には代表時刻を渡す必要があるため、
// ラベルごとに代表時刻を1つ決めて保持している（対応関係はFAQ・app/faq/page.tsxにも表示）。

export type TimePeriodKey = 'early_morning' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night'

type TimePeriod = {
  key: TimePeriodKey
  label: string
  labelEn: string
  hour: number
  minute: number
}

// hour/minuteは代表時刻。範囲の境界はtimePeriodFromHourと対応させてあり、
// 各代表時刻は必ず自分のラベルの範囲に収まるようにしている。
const TIME_PERIODS: TimePeriod[] = [
  { key: 'early_morning', label: '早朝', labelEn: 'Early morning', hour: 6, minute: 0 },
  { key: 'morning', label: '午前', labelEn: 'Morning', hour: 9, minute: 30 },
  { key: 'midday', label: '昼', labelEn: 'Midday', hour: 12, minute: 0 },
  { key: 'afternoon', label: '午後', labelEn: 'Afternoon', hour: 14, minute: 0 },
  { key: 'evening', label: '夕方', labelEn: 'Evening', hour: 16, minute: 30 },
  { key: 'night', label: '夜', labelEn: 'Night', hour: 21, minute: 0 },
]

export const TIME_PERIOD_OPTIONS: { key: TimePeriodKey; label: string }[] = TIME_PERIODS.map((p) => ({
  key: p.key,
  label: p.label,
}))

export function timePeriodLabel(key: TimePeriodKey | null): string {
  return TIME_PERIODS.find((p) => p.key === key)?.label ?? ''
}

// 時刻（時・分）から時間帯を判定する。夜（18:00〜4:00）だけ日をまたぐため最後に回す。
function timePeriodFromHour(hour: number, minute: number): TimePeriodKey {
  const h = hour + minute / 60
  if (h >= 4 && h < 8) return 'early_morning'
  if (h >= 8 && h < 11) return 'morning'
  if (h >= 11 && h < 13) return 'midday'
  if (h >= 13 && h < 15) return 'afternoon'
  if (h >= 15 && h < 18) return 'evening'
  return 'night'
}

/** ISO日時から、最も近い時間帯ラベルを逆引きする（一覧表示・EXIF時刻の丸め込みに使う）。 */
export function timePeriodFromDatetime(iso: string | null): TimePeriodKey | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return timePeriodFromHour(d.getHours(), d.getMinutes())
}

/** 'YYYY-MM-DD'の日付と時間帯キーから、代表時刻を組み合わせたISO日時文字列を作る。 */
export function datePeriodToIso(dateStr: string, key: TimePeriodKey): string | null {
  const period = TIME_PERIODS.find((p) => p.key === key)
  if (!period || !dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d, period.hour, period.minute, 0, 0).toISOString()
}
