// 人物（figures）ごとの肖像イラスト。画像は public/figures/ に置き、figures.slug で引く。
//
// 肖像はD案（凱風快晴）の配色に合わせて生成した、円の中に人物を描いたイラスト。
// 画像の四隅には円の外の余白（生成り）があるため、表示側（app/figure-avatar.tsx）で
// 丸く切り抜き、少し拡大して余白を隠している。
//
// 肖像がまだ無い人物は、ここに載せなければシルエットで表示される。

export const FIGURE_PORTRAITS: Record<string, string> = {
  hokusai: '/figures/hokusai.webp',
}

export function figurePortrait(slug: string): string | null {
  return FIGURE_PORTRAITS[slug] ?? null
}
