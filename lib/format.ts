// 日付の表示形式をアプリ内で揃えるための置き場。
// 以前は new Date(...).toLocaleDateString('ja-JP') が3か所、
// toLocaleString('ja-JP') が1か所に直接書かれていた。
//
// 表示のばらつき（日付だけ／日付＋時刻）は現状のまま保っている。
// 全画面を揃えたくなったときは、この2つの関数の中身を直せばよい。

const LOCALE = 'ja-JP'

/** 月日・時分を2桁に揃える（9 → "09"）。 */
const pad = (n: number) => String(n).padStart(2, '0')

function parse(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  // 不正な値のとき、そのまま表示すると画面に "Invalid Date" と出てしまうため弾く
  return isNaN(d.getTime()) ? null : d
}

/** 「2026/9/4」 */
export function formatDate(value: string | null | undefined): string {
  return parse(value)?.toLocaleDateString(LOCALE) ?? ''
}

/** 「2026/9/4 14:30:00」 */
export function formatDateTime(value: string | null | undefined): string {
  return parse(value)?.toLocaleString(LOCALE) ?? ''
}

/**
 * ローカル日付を 'YYYY-MM-DD' で返す（記録カレンダーで「同じ日か」を揃えるために使う）。
 * ISO文字列をそのままslice(0,10)すると、保存値がUTCのためタイムゾーンによっては
 * 日付がずれる（JSTの深夜0時台がUTCでは前日になる等）。必ずDateのローカルgetterで組み立てる。
 */
export function dateKey(value: string | null | undefined): string | null {
  const d = parse(value)
  if (!d) return null
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * ISO文字列を <input type="datetime-local"> に渡せる 'YYYY-MM-DDTHH:mm' へ変換する。
 * datetime-localはタイムゾーンを持たないため、必ずDateのローカルgetterで組み立てる
 * （dateKeyと同じ理由。ISO文字列のsliceではJSTの深夜0時台が前日にずれる）。
 *
 * 記録の新規作成・編集・一括取込で同じ変換が必要なため、ここに集約している。
 */
export function isoToLocalInput(iso: string | null): string {
  const d = parse(iso)
  if (!d) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
