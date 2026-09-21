// 「訪問済みの地点」を求める処理。
//
// 「訪問済み」＝自分の記録(records)がその地点(location_id)に紐づいているかどうか。
// locationsは全ユーザー共有だが、訪問したかどうかは自分の記録からしか分からない。
//
// トップ（クラスタ別の進捗）と地図（訪問済みピンの色分け）で同じ判定が要るため、
// 二重に書かれていたものをここに集約した。

import type { createClient } from './supabase/server'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

/**
 * ログイン中のユーザーが訪問済みの地点IDを集める。
 *
 * 未ログインのときは問い合わせずに空集合を返す（RLSで結果は空になるが、
 * 無駄な問い合わせを避けるため呼び出し側で分岐していたものをここに寄せた）。
 */
export async function fetchVisitedLocationIds(
  supabase: SupabaseClient,
  isLoggedIn: boolean
): Promise<Set<string>> {
  if (!isLoggedIn) return new Set()

  const { data } = await supabase
    .from('records')
    .select('location_id')
    .not('location_id', 'is', null)

  return new Set((data ?? []).map((r) => r.location_id as string))
}
