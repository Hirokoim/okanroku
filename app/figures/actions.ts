'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { FIGURE_COOKIE, encodeFigureCookie } from '@/lib/current-figure'

// 人物を選ぶ画面（app/figures/page.tsx）で人物を選んだときの処理。
// 選んだ人物の名前をCookieに覚えて、ホームへ戻る。
//
// ここでは名前が正しいか・地点があるかを確かめない。読み取り側
// （lib/current-figure.ts）が毎回確かめて、使えない人物なら北斎に戻すため、
// 書き込み側で同じ判定をもう一度持つ必要が無い。
export async function selectFigure(formData: FormData) {
  const name = formData.get('name')
  if (typeof name === 'string' && name.length > 0 && name.length <= 100) {
    ;(await cookies()).set(FIGURE_COOKIE, encodeFigureCookie(name), {
      path: '/',
      // 1年。ブラウザを閉じても、次に開いたときに同じ人物の画面から始まるように
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      httpOnly: true,
    })
  }
  redirect('/')
}
