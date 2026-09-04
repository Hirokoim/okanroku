// locationsテーブルの「保存値」を、画面に出す日本語ラベルへ変換する。
// 対応表の出典: docs/requirements.md 5-E②
//
// 地図のポップアップ（app/map）と地点詳細（app/locations/[id]）の両方が使う。
// 以前は2か所に別々の表が書かれていたため、片方だけ直すと表記がズレる状態だった。
// 表記を変えるときはこのファイルだけを直せばよい。

export type AccessibilityStyle = {
  label: string
  color: string // 文字色（ポップアップのバッジ用）
  bg: string //   背景色（同上）
}

const ACCESSIBILITY: Record<string, AccessibilityStyle> = {
  visible: { label: '見える富士', color: '#60a0e0', bg: '#1a3a60' },
  not_visible: { label: '見えない富士', color: '#e06060', bg: '#3a1a10' },
  imagined: { label: '心の中の富士', color: '#c080e0', bg: '#2a1a3a' },
  unjudged: { label: '未判定', color: '#909090', bg: '#2a2a2a' },
}

const CONFIDENCE: Record<string, string> = {
  confirmed: '確定',
  estimated: '推定',
  unconfirmed: '未確認',
}

// 対応表にない保存値はnullを返す。表示側で「出さない」か「保存値をそのまま出す」かを選ぶ。
export function accessibilityStyle(value: string | null | undefined): AccessibilityStyle | null {
  if (!value) return null
  return ACCESSIBILITY[value] ?? null
}

export function accessibilityLabel(value: string | null | undefined): string | null {
  return accessibilityStyle(value)?.label ?? null
}

export function confidenceLabel(value: string | null | undefined): string | null {
  if (!value) return null
  return CONFIDENCE[value] ?? null
}
