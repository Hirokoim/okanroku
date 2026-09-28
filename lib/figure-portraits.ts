// 人物（figures）ごとの肖像イラスト。画像は public/figures/ に置き、人物の名前（figures.name）で引く。
//
// slugではなく名前で引いているのは、北斎以外の人物のslugがリポジトリのどこにも
// 記録されておらず（人物マスタはSupabase上で直接入力したため）、推測で書くと
// 黙って肖像が出なくなるため。名前は画面にそのまま出している値なので、ずれればすぐ気づける。
//
// 肖像はD案（凱風快晴）の配色に合わせて生成した、円の中に人物を描いたイラスト。
// 画像の四隅には円の外の余白（生成り）があるため、表示側（app/figure-avatar.tsx）で
// 丸く切り抜き、少し拡大して余白を隠している。
//
// 肖像がまだ無い人物は、ここに載せなければシルエットで表示される。

export const FIGURE_PORTRAITS: Record<string, string> = {
  葛飾北斎: '/figures/hokusai.webp',
  伊能忠敬: '/figures/ino-tadataka.webp',
}

export function figurePortrait(name: string): string | null {
  return FIGURE_PORTRAITS[name] ?? null
}
