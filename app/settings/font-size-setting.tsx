'use client'

// 文字サイズ設定（標準／大／特大）。html要素のfont-sizeを切り替えるだけで
// （app/globals.cssのhtml[data-font-scale]）、Tailwindのrem単位の文字サイズが
// アプリ全体で連動して拡大する。個々のコンポーネントは一切触らない。
// キー名はapp/layout.tsxのちらつき防止スクリプトと合わせること。

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'okr-font-scale'

const SCALES = [
  { value: 'standard', label: '標準' },
  { value: 'large', label: '大' },
  { value: 'xlarge', label: '特大' },
] as const

type Scale = (typeof SCALES)[number]['value']

export function FontSizeSetting() {
  const [scale, setScale] = useState<Scale>('standard')

  // 初期表示はlayout.tsxのスクリプトが既にDOMへ反映済みのため、ここでは
  // ラジオボタンの選択状態をlocalStorageに合わせるだけでよい。
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'large' || saved === 'xlarge' || saved === 'standard') setScale(saved)
    } catch {
      // プライベートブラウジング等でlocalStorageが使えない場合は標準のまま
    }
  }, [])

  function handleChange(value: Scale) {
    setScale(value)
    document.documentElement.dataset.fontScale = value
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // 保存できなくても、今の画面には反映されているので致命的ではない
    }
  }

  return (
    <fieldset>
      <legend className="text-sm font-body font-semibold mb-2">文字サイズ</legend>
      <div className="flex gap-2" role="radiogroup" aria-label="文字サイズ">
        {SCALES.map((s) => (
          <label
            key={s.value}
            className={`flex-1 text-center text-sm font-body font-medium px-3 py-2 rounded-full border cursor-pointer transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-kin has-[:focus-visible]:outline-offset-2 ${
              scale === s.value ? 'bg-hi text-nami border-hi' : 'border-line text-nami-dim'
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
            {s.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
