import { createClient } from '@/lib/supabase/server'
import { signInWithGoogle, signOut } from './login/actions'

export async function AuthButton() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    return (
      <form action={signOut} className="flex items-center gap-3">
        <span className="text-sm text-nami-dim">{user.email}</span>
        <button type="submit" className="text-sm text-kin underline">ログアウト</button>
      </form>
    )
  }

  return (
    <form action={signInWithGoogle}>
      <button type="submit" className="text-sm text-kin underline">Googleでログイン</button>
    </form>
  )
}
