import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // ログイン直後は、まず人物を選ぶ画面（誰の足跡をたどるか）を見せる。
  // 外部URLへのオープンリダイレクトを防ぐため、自ドメイン内の相対パスのみ許可する
  const AFTER_LOGIN = '/figures'
  const rawNext = searchParams.get('next') ?? AFTER_LOGIN
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : AFTER_LOGIN

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
