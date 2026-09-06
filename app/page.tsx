import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { asRows } from '@/lib/supabase/rows'
import { AuthButton } from './auth-button'
import { RecordList, type RecordRow } from './record-list'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: records } = user
    ? await supabase
        .from('records')
        .select('id, location_id, location_name, work_label, created_at, figures(name), locations(title_jp)')
        .order('created_at', { ascending: false })
    : { data: null }

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-8 w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">往還録</h1>
        <AuthButton />
      </div>

      {user ? (
        <>
          <Link href="/map" className="text-sm text-blue-600 underline">
            地図を見る
          </Link>
          {/* 記録の作成は地点詳細（/locations/[id]）から行う（要件定義書 4-A・4-C）。
              asRowsが何をしているかは lib/supabase/rows.ts を参照 */}
          <RecordList records={asRows<RecordRow>(records)} />
        </>
      ) : (
        <p className="text-gray-600">記録を見るにはログインしてください。</p>
      )}
    </main>
  )
}
