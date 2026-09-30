// 人物ごとの「作品の呼び方」と見た目の切り替えキー。
//
// 画面に出す「富嶽三十六景」「46景」のような北斎専用の文言を、選んでいる人物に
// 合わせて出し分けるための表。人物マスタ（figures）はSupabase上にあるが、
// 作品名・数え方・配色はDBの列ではなくアプリの表示の都合なので、ここで持つ。
// 人物は名前（figures.name）で引く。slugではない理由は lib/figure-portraits.ts と同じ
// （北斎以外のslugがリポジトリに記録されていないため）。
//
// ここはサーバー・ブラウザのどちらからも読む（Cookieを読む lib/current-figure.ts とは分けてある）。

/** 配色・見出しの絵を切り替えるキー。<html data-figure="…"> と globals.css の上書きに使う */
export type FigureTheme = 'hokusai' | 'hiroshige'

export type FigureMeta = {
  /** figures.name と同じ値 */
  name: string
  /** 文中で呼ぶときの短い名前。例「北斎はこの地に立ち…」 */
  short: string
  /** 作品（シリーズ）名。例「富嶽三十六景」 */
  work: string
  /** 作品の数え方。「第◯景」「46景」の「景」の部分 */
  unit: string
  theme: FigureTheme
}

/** 何も選んでいない・選んだ人物が使えないときの人物 */
export const DEFAULT_FIGURE_NAME = '葛飾北斎'

const FIGURE_META: Record<string, FigureMeta> = {
  葛飾北斎: { name: '葛飾北斎', short: '北斎', work: '富嶽三十六景', unit: '景', theme: 'hokusai' },
  歌川広重: { name: '歌川広重', short: '広重', work: '東海道五十三次', unit: '図', theme: 'hiroshige' },
}

/**
 * 人物の名前から表示用の情報を引く。表に無い人物（地点データが入ったが、ここへの
 * 追記がまだの人物）でも画面が壊れないよう、短い名前をそのままの名前、作品名を空、
 * 数え方を「地点」、見た目を北斎のものにして返す。
 */
export function figureMeta(name: string): FigureMeta {
  return FIGURE_META[name] ?? { name, short: name, work: '', unit: '地点', theme: 'hokusai' }
}
