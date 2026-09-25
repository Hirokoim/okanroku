// 記録フォームの文字欄だけを対象にした、入力途中データの一時保持（roadmap.md Phase1タスク(G)）。
// 写真は対象外。File はそのまま保存できず、保存できたとしても容量が大きくなりすぎるため、
// 離脱時は再度EXIF読み込みからやり直す前提にしている。
// 地点ごとに別の下書きを持てるよう、キーにlocationIdを含める。

import { TIME_PERIOD_OPTIONS, type TimePeriodKey } from '@/lib/time-period'

export type RecordDraft = {
  photographed_date: string
  time_period: TimePeriodKey | ''
  voice_transcript: string
  edit_intent: string
  access_note: string
  is_public: boolean
}

export const emptyDraft: RecordDraft = {
  photographed_date: '',
  time_period: '',
  voice_transcript: '',
  edit_intent: '',
  access_note: '',
  is_public: false,
}

function draftKey(locationId: string): string {
  return `okanroku:draft:record:${locationId}`
}

// localStorageはプライベートブラウジング等で例外を投げることがあるため、
// 読み書きとも失敗を握りつぶす（下書きが効かないだけで、保存自体は失敗させない）。

export function loadDraft(locationId: string): RecordDraft {
  if (typeof window === 'undefined') return emptyDraft
  try {
    const raw = window.localStorage.getItem(draftKey(locationId))
    if (!raw) return emptyDraft
    // 古い版で保存した下書きや壊れたデータが残っていても、項目ごとに形を確かめて
    // 合わないものは空に戻す（おかしな値を入力欄に入れないため）。
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return emptyDraft
    const d = parsed as Partial<Record<keyof RecordDraft, unknown>>
    const text = (v: unknown) => (typeof v === 'string' ? v : '')
    return {
      photographed_date: text(d.photographed_date),
      time_period: TIME_PERIOD_OPTIONS.some((p) => p.key === d.time_period)
        ? (d.time_period as TimePeriodKey)
        : '',
      voice_transcript: text(d.voice_transcript),
      edit_intent: text(d.edit_intent),
      access_note: text(d.access_note),
      is_public: d.is_public === true,
    }
  } catch {
    return emptyDraft
  }
}

export function saveDraft(locationId: string, draft: RecordDraft): void {
  try {
    window.localStorage.setItem(draftKey(locationId), JSON.stringify(draft))
  } catch {
    // 保存できなくても致命的ではない
  }
}

export function clearDraft(locationId: string): void {
  try {
    window.localStorage.removeItem(draftKey(locationId))
  } catch {
    // 消せなくても次回上書きされるだけなので無視する
  }
}
