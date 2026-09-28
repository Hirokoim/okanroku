'use client'

// 時間帯（早朝・朝・昼…）を選ぶ<select>。記録フォーム・記録編集・一括取り込みで共用する。
// 見出しの<label>や配置は画面ごとに違うため、ここでは<select>本体だけを受け持つ。

import { TIME_PERIOD_OPTIONS, type TimePeriodKey } from '@/lib/time-period'

export function TimePeriodSelect({
  value,
  onChange,
  name,
  className,
}: {
  value: TimePeriodKey | ''
  onChange: (value: TimePeriodKey | '') => void
  name?: string
  className?: string
}) {
  return (
    <select
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value as TimePeriodKey | '')}
      className={className}
    >
      <option value="">選択なし</option>
      {TIME_PERIOD_OPTIONS.map((p) => (
        <option key={p.key} value={p.key}>
          {p.label}
        </option>
      ))}
    </select>
  )
}
