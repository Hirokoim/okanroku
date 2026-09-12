// 記録フォームの文字欄だけを対象にした、入力途中データの一時保持（roadmap.md Phase1タスク(G)）。
// 写真は対象外。File はそのまま保存できず、保存できたとしても容量が大きくなりすぎるため、
// 離脱時は再度EXIF読み込みからやり直す前提にしている。
// 地点ごとに別の下書きを持てるよう、キーにlocationIdを含める。

export type RecordDraft = {
  photographed_at: string
  voice_transcript: string
  edit_intent: string
  access_note: string
  is_public: boolean
}

export const emptyDraft: RecordDraft = {
  photographed_at: '',
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
    return { ...emptyDraft, ...JSON.parse(raw) }
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
