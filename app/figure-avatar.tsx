import { figurePortrait } from '@/lib/figure-portraits'

// 人物の丸い肖像。肖像のある人物はイラストを、まだ無い人物はシルエットを出す。
// 大きさは呼び出し側の className（w-◯ h-◯）で決める。
// 横に名前の文字が並ぶ場所では decorative を付け、読み上げで名前が二重にならないようにする。

export function FigureAvatar({
  name,
  decorative = false,
  className = '',
}: {
  name: string
  decorative?: boolean
  className?: string
}) {
  const src = figurePortrait(name)

  return (
    <span className={`relative block rounded-full overflow-hidden border-2 border-white bg-sumi-3 shrink-0 ${className}`}>
      {src ? (
        // 画像の四隅にある円の外の余白を隠すため、少し拡大して丸く切り抜く
        // eslint-disable-next-line @next/next/no-img-element -- public/の小さな固定画像1枚のため、next/imageの最適化は不要
        <img src={src} alt={decorative ? '' : name} className="w-full h-full object-cover scale-110" />
      ) : (
        <svg
          viewBox="0 0 40 40"
          className="w-full h-full text-nami-dim opacity-40"
          {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': `${name}（肖像は準備中）` })}
        >
          <circle cx="20" cy="15" r="7" fill="currentColor" />
          <path d="M6 40 Q7 25 20 24 Q33 25 34 40Z" fill="currentColor" />
        </svg>
      )}
    </span>
  )
}
