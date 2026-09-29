// いま選んでいる人物（/figures で選んだ人物）を求める。
//
// 選んだ人物は Cookie「okr-figure」に名前（figures.name）で覚える。書き込みは
// app/figures/actions.ts（Server Action）、読み取りはここに集約する。
// ホーム・地図・作品一覧・ルートのレイアウト（<html data-figure>）が同じ判定を使うため。
//
// 次のときは北斎（DEFAULT_FIGURE_NAME）にする：
//   ・Cookieが無い（まだ選んでいない）
//   ・Cookieの名前の人物が figures に無い（人物名の変更・削除）
//   ・その人物の地点（locations）が0件（シード未投入。/figures でも「準備中」で選べない人物）
// 3つ目は、広重のシードSQLを実行する前にCookieだけ残っている場合などに、
// 中身が空のホーム・地図が出ないようにするため。

import { cache } from 'react'
import { cookies } from 'next/headers'
import { createClient } from './supabase/server'
import { DEFAULT_FIGURE_NAME, figureMeta, type FigureMeta } from './figure-meta'

export const FIGURE_COOKIE = 'okr-figure'

export type CurrentFigure = {
  /** figures.id。未ログインなどで人物マスタが読めないときは null（呼び出し側は絞り込まない） */
  id: string | null
  meta: FigureMeta
}

/** Cookieの値。日本語の名前をそのまま入れないよう、書き込み側と同じくURLエンコードする */
export function encodeFigureCookie(name: string) {
  return encodeURIComponent(name)
}

function decodeFigureCookie(value: string | undefined): string | null {
  if (!value) return null
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

// 1回の表示の中で、レイアウトとページの両方から呼ばれる。cache で包み、
// 問い合わせを1回にまとめる（引数を持たせないのは、キャッシュのキーを揃えるため）。
export const getCurrentFigure = cache(async (): Promise<CurrentFigure> => {
  const chosen = decodeFigureCookie((await cookies()).get(FIGURE_COOKIE)?.value)
  const supabase = await createClient()

  // 未ログインでは figures・locations とも RLS で読めない（authenticated のみ）。
  // 読めないと分かっている問い合わせを毎回投げないよう、ここで北斎を返す。
  // getSession は Cookie を読むだけで通信しない。ここでは「問い合わせるかどうか」の
  // 判断にしか使わず、読める範囲の判定は RLS に任せている（getUser での本人確認は各ページが行う）。
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { id: null, meta: figureMeta(DEFAULT_FIGURE_NAME) }

  const names = chosen && chosen !== DEFAULT_FIGURE_NAME ? [chosen, DEFAULT_FIGURE_NAME] : [DEFAULT_FIGURE_NAME]
  const { data: figures } = await supabase.from('figures').select('id, name').in('name', names)
  const fallback = (figures ?? []).find((f) => f.name === DEFAULT_FIGURE_NAME)
  const defaultFigure: CurrentFigure = { id: fallback?.id ?? null, meta: figureMeta(DEFAULT_FIGURE_NAME) }

  const picked = chosen ? (figures ?? []).find((f) => f.name === chosen) : undefined
  if (!picked || picked.name === DEFAULT_FIGURE_NAME) return defaultFigure

  // 地点が1件も無い人物は選べない扱いにする（件数だけ数え、行の中身は取らない）
  const { count } = await supabase
    .from('locations')
    .select('id', { count: 'exact', head: true })
    .eq('figure_id', picked.id)
  if (!count) return defaultFigure

  return { id: picked.id, meta: figureMeta(picked.name) }
})
