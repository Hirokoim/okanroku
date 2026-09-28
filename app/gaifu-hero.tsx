// ホーム上部の見出し。富嶽三十六景「凱風快晴」（赤富士）を簡略化した図案の上に、
// ロゴ「往還録」を重ねる。配色はD案（app/globals.css）の変数と揃えている。
//
// 絵はSVGで描いた装飾なので読み上げ対象から外し、見出しの文字はh1として
// 別に持つ（画像の中の文字にしない）。
// 人物が増えたら（Phase2）、この絵と配色を人物ごとに差し替える想定。

export function GaifuHero({ subtitle }: { subtitle?: string }) {
  return (
    <header className="relative -mx-6 -mt-6">
      <svg viewBox="0 0 200 90" className="block w-full h-auto" aria-hidden="true">
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
      </svg>
      <div className="absolute left-6 top-5">
        <h1 className="font-logo text-3xl font-bold tracking-[0.2em] text-nami">往還録</h1>
        {subtitle && <p className="text-xs text-nami mt-1">{subtitle}</p>}
      </div>
    </header>
  )
}
