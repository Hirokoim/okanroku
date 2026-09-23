// 記録のエクスポート（要件定義書 機能④）。
// サーバーAPIは持たず、ページ側で既に取得済みのデータをブラウザ内で
// CSV／Markdown文字列に変換し、そのままファイルとしてダウンロードさせるだけの
// 処理をここに集約する。往復が要らないため実装をここまで単純化できる。

import type { RecordRow } from '@/app/record-list'
import type { LocationRecord } from '@/app/locations/[id]/record-types'
import { formatDate, formatDateWithPeriod } from './format'

/** CSVの1フィールドをエスケープする（カンマ・改行・ダブルクォートを含む場合のみ引用符で囲む）。 */
function csvField(value: string | null | undefined): string {
  const s = value ?? ''
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/**
 * 全記録をCSVに変換する（機能④「全記録のCSVエクスポート（バックアップ・分析用）」）。
 * 列は記録タブの一覧（record-list.tsx）に表示している項目に揃えた。
 */
export function recordsToCsv(records: RecordRow[]): string {
  const header = ['日付', '地点', '人物', '作品ラベル']
  const rows = records.map((r) => [
    formatDateWithPeriod(r.photographed_at ?? r.created_at),
    r.locations?.title_jp || r.location_name || '',
    r.figures?.name ?? '',
    r.work_label ?? '',
  ])
  return [header, ...rows].map((row) => row.map(csvField).join(',')).join('\r\n')
}

/**
 * 1地点分の記録をMarkdownに変換する（機能④「選択した地点の記録をMarkdown形式で
 * 書き出し、note下書きの土台にする」）。
 * 写真は署名付きURL（有効期限あり）しか持っていないため、URLは含めず枚数のみ書く。
 */
export function locationRecordsToMarkdown(locationTitle: string, records: LocationRecord[]): string {
  const lines: string[] = [`# ${locationTitle}`, '']
  for (const r of records) {
    lines.push(`## ${formatDate(r.photographed_at ?? r.created_at)}`)
    if (r.weather) {
      const temp = r.weather.temperature !== null ? `　${r.weather.temperature}℃` : ''
      lines.push(`${r.weather.description}${temp}`)
    }
    if (r.edit_intent) lines.push('', r.edit_intent)
    if (r.voice_transcript) lines.push('', r.voice_transcript)
    if (r.access_note) lines.push('', `> ${r.access_note}`)
    if (r.photos.length > 0) lines.push('', `（写真${r.photos.length}枚）`)
    lines.push('')
  }
  return lines.join('\n')
}

/**
 * 文字列をファイルとしてブラウザにダウンロードさせる。
 * CSVはExcelで開いたときに文字化けしないようUTF-8のBOMを付ける
 * （MarkdownはBOM無し。付けるとGitHub等のビューアで表示が崩れることがあるため）。
 */
export function downloadTextFile(filename: string, content: string, mimeType: string, withBom = false) {
  const blob = new Blob([withBom ? '﻿' : '', content], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
