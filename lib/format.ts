// 日付の表示形式をアプリ内で揃えるための置き場。
// 以前は new Date(...).toLocaleDateString('ja-JP') が3か所、
// toLocaleString('ja-JP') が1か所に直接書かれていた。
//
// 表示のばらつき（日付だけ／日付＋時刻）は現状のまま保っている。
// 全画面を揃えたくなったときは、この2つの関数の中身を直せばよい。

const LOCALE = 'ja-JP'

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
