'use client'

// 文字サイズ設定（標準／大／特大）。html要素のfont-sizeを切り替えるだけで
// （app/globals.cssのhtml[data-font-scale]）、Tailwindのrem単位の文字サイズが
// アプリ全体で連動して拡大する。個々のコンポーネントは一切触らない。
// キー名はapp/layout.tsxのちらつき防止スクリプトと合わせること。

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'okr-font-scale'

// sampleは選択肢の中に見本として出す「あ」の大きさ（どれくらい大きくなるかを、選ぶ前に見せる）
const SCALES = [
  { value: 'standard', label: '標準', sample: 'text-base' },
  { value: 'large', label: '大', sample: 'text-lg' },
  { value: 'xlarge', label: '特大', sample: 'text-xl' },
] as const

type Scale = (typeof SCALES)[number]['value']

export function FontSizeSetting() {
  const [scale, setScale] = useState<Scale>('standard')

  // 初期表示はlayout.tsxのスクリプトが既にDOMへ反映済みのため、ここでは
  // ラジオボタンの選択状態をlocalStorageに合わせるだけでよい。
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- マウント後に一度だけlocalStorageを読んで選択状態を合わせる想定通りの用法
      if (saved === 'large' || saved === 'xlarge' || saved === 'standard') setScale(saved)
    } catch {
      // プライベートブラウジング等でlocalStorageが使えない場合は標準のまま
    }
  }, [])

  function handleChange(value: Scale) {
    setScale(value)
    document.documentElement.setAttribute('data-font-scale', value)
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // 保存できなくても、今の画面には反映されているので致命的ではない
    }
  }

  return (
    <fieldset>
      <legend className="text-sm font-body font-semibold mb-3">文字サイズ</legend>
      <div className="flex gap-2 items-stretch" role="radiogroup" aria-label="文字サイズ">
        {SCALES.map((s) => (
          <label
            key={s.value}
            className={`flex-1 flex flex-col items-center justify-end gap-1 h-20 pb-2.5 rounded-xl border-2 cursor-pointer transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-kin has-[:focus-visible]:outline-offset-2 ${
              scale === s.value ? 'bg-hi text-washi border-hi' : 'bg-sumi-4 border-line text-nami-dim'
            }`}
          >
            <input
              type="radio"
              name="font-scale"
              value={s.value}
              checked={scale === s.value}
              onChange={() => handleChange(s.value)}
              className="sr-only"
            />
            <span className={`${s.sample} font-bold leading-none`} aria-hidden="true">
              あ
            </span>
            <span className="text-xs font-body font-medium">{s.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
