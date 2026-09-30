// ホーム上部の見出し。いまたどっている人物の代表作を簡略化した図案の上に、
// ロゴ「往還録」を重ねる。配色はD案（app/globals.css）の変数と揃えている。
//   北斎：富嶽三十六景「凱風快晴」（赤富士）
//   広重：東海道・名所絵の「雨の橋」（空色の空に斜めの細い雨、木の反り橋、川）
// どちらも同じ平らな色面の描き方にして、人物を替えても見出しの佇まいが変わらないようにする。
// 広重の色（藍・空色）は <html data-figure="hiroshige"> で変数ごと差し替わる（globals.css）。
//
// 絵はSVGで描いた装飾なので読み上げ対象から外し、見出しの文字はh1として
// 別に持つ（画像の中の文字にしない）。
//
// ロゴの下には、いまたどっている人物の札（丸い肖像＋名前）を置く。押すと人物を選ぶ画面へ。

import Link from 'next/link'
import type { FigureTheme } from '@/lib/figure-meta'
import { FigureAvatar } from './figure-avatar'

export type HeroFigure = { name: string; work: string }

function GaifuArt() {
  return (
    <>
      <rect width="200" height="90" fill="var(--ai)" />
      {/* 鰯雲（凱風快晴の空の、細かく並ぶ白い雲） */}
      <g fill="var(--washi)" opacity="0.75">
        <ellipse cx="150" cy="14" rx="9" ry="2" />
        <ellipse cx="168" cy="20" rx="7" ry="1.6" />
        <ellipse cx="138" cy="24" rx="6" ry="1.4" />
        <ellipse cx="182" cy="10" rx="6" ry="1.4" />
        <ellipse cx="158" cy="30" rx="5" ry="1.2" />
      </g>
      <path d="M0 90 L70 32 Q100 13 130 32 L200 90Z" fill="var(--hi)" />
      {/* 山頂の残雪 */}
      <path d="M84 23 Q100 13 116 23 L111 29 L106 26 L100 30 L94 26 L89 29Z" fill="var(--washi)" />
      {/* 裾野の樹海 */}
      <path d="M0 90 L0 74 Q20 70 34 76 Q48 72 62 80 L70 90Z" fill="var(--matsu)" />
    </>
  )
}

// 雨の線の位置。等間隔だと機械的に見えるので、間隔と長さを少しずつずらしてある
const RAIN = [
  [8, 0, 34], [19, 6, 40], [27, 0, 30], [38, 10, 46], [47, 2, 38], [58, 0, 44], [66, 12, 50],
  [77, 4, 42], [86, 0, 36], [97, 8, 48], [106, 0, 40], [117, 6, 46], [126, 0, 34], [137, 10, 52],
  [146, 2, 40], [157, 0, 44], [166, 8, 50], [177, 0, 38], [186, 6, 46], [197, 0, 42],
] as const

function HiroshigeArt() {
  return (
    <>
      <rect width="200" height="90" fill="var(--ai)" />
      {/* 空の上の縁の、濃い藍の雨雲（広重がよく使う、上からかぶせるぼかしを平らな帯にしたもの）。
          ロゴ「往還録」にかからないよう細くしてある */}
      <path d="M0 0 H200 V4 Q170 7 140 4 Q110 2 80 5 Q40 8 0 4Z" fill="var(--ai-deep)" />
      {/* 向こう岸 */}
      <path d="M0 58 Q30 54 60 57 Q80 52 100 56 L100 60 L0 60Z" fill="var(--matsu)" opacity="0.55" />
      {/* 川 */}
      <rect y="58" width="200" height="32" fill="var(--ai-bright)" />
      <g stroke="var(--washi)" strokeWidth="0.6" opacity="0.5">
        <line x1="12" y1="70" x2="30" y2="70" />
        <line x1="44" y1="80" x2="66" y2="80" />
        <line x1="20" y1="86" x2="34" y2="86" />
      </g>
      {/* 木の反り橋。橋脚を先に描き、その上に橋板を重ねる */}
      <g fill="var(--hashi)">
        {[72, 92, 112, 132, 152, 172, 192].map((x, i) => (
          <rect key={x} x={x} y={52 - i * 1.4} width="2.2" height={40 + i * 1.4} opacity="0.85" />
        ))}
        <path d="M60 60 Q120 30 200 40 L200 46 Q120 37 60 64Z" />
      </g>
      {/* 欄干 */}
      <path d="M62 57 Q120 27 200 37" fill="none" stroke="var(--hashi)" strokeWidth="1" />
      {/* 斜めに降る細い雨 */}
      <g stroke="var(--ai-deep)" strokeWidth="0.45" opacity="0.6">
        {RAIN.map(([x, y1, len]) => (
          <line key={x} x1={x} y1={y1} x2={x - len * 0.28} y2={y1 + len} />
        ))}
      </g>
    </>
  )
}

export function GaifuHero({ theme = 'hokusai', figure }: { theme?: FigureTheme; figure?: HeroFigure }) {
  return (
    <header className="relative -mx-6 -mt-6">
      <svg viewBox="0 0 200 90" className="block w-full h-auto" aria-hidden="true">
        {theme === 'hiroshige' ? <HiroshigeArt /> : <GaifuArt />}
      </svg>
      <div className="absolute left-6 top-5">
        <h1 className="font-logo text-3xl font-bold tracking-[0.2em] text-nami">往還録</h1>
        {figure && (
          <Link
            href="/figures"
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-washi/90 pl-1 pr-3 py-1 text-xs text-nami hover:bg-washi transition-colors"
          >
            <FigureAvatar name={figure.name} decorative className="w-7 h-7 border" />
            <span>
              {figure.name}
              {figure.work ? `・${figure.work}` : ''}
            </span>
            <span className="text-hi" aria-hidden="true">
              ›
            </span>
            <span className="sr-only">（人物を選ぶ）</span>
          </Link>
        )}
      </div>
    </header>
  )
}
