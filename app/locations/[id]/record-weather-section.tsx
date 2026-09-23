// 記録編集フォームの天気表示・再取得・手動選択セクション。EditRecordFormが使う。

import { weatherCodeIcon, weatherLabelToCode, WEATHER_LABELS } from '@/lib/weather'
import type { LocationRecord, RecordPhoto } from './record-types'

export function RecordWeatherSection({
  record,
  weatherPhoto,
  retrying,
  status,
  onRetry,
}: {
  record: LocationRecord
  weatherPhoto: RecordPhoto | undefined
  retrying: boolean
  status: string | null
  onRetry: () => void
}) {
  return (
    <div className="border-t border-line pt-3 space-y-2">
      <div className="text-[11px] font-semibold tracking-wide text-kin-dim uppercase">天気</div>
      <div className="text-xs text-nami-dim">
        {record.weather
          ? `${weatherCodeIcon(record.weather.weathercode)} ${record.weather.description}${record.weather.temperature !== null ? `　${record.weather.temperature}℃` : ''}`
          : '未取得'}
      </div>

      {weatherPhoto ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="text-xs text-kin underline disabled:opacity-50"
        >
          {retrying ? '取得中...' : '天気を再取得する'}
        </button>
      ) : (
        <p className="text-xs text-nami-dim">座標情報のある写真がないため、天気は再取得できません</p>
      )}
      {status && <p className="text-xs text-nami-dim">{status}</p>}

      <label className="block text-xs text-nami-dim">
        天気を手動で選ぶ（自動取得が外れていた場合の修正用）
        <div className="flex gap-2 mt-1">
          <select
            name="weather_override"
            defaultValue=""
            className="border border-line rounded p-1.5 text-sm flex-1 min-w-0 bg-sumi-2 text-nami"
          >
            <option value="">変更しない（自動取得のまま）</option>
            {WEATHER_LABELS.map((label) => (
              <option key={label} value={label}>
                {weatherCodeIcon(weatherLabelToCode(label))} {label}
              </option>
            ))}
          </select>
          <input
            name="weather_temperature"
            type="number"
            step="0.1"
            placeholder="気温（℃・任意）"
            aria-label="気温（℃・任意）"
            defaultValue={record.weather?.temperature ?? ''}
            className="border border-line rounded p-1.5 text-sm w-28 shrink-0 bg-sumi-2 text-nami placeholder:text-nami-dim"
          />
        </div>
      </label>
    </div>
  )
}
