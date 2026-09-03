import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
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
              records(figure_id)・records(location_id)はrecordsから見て多対1の関係なので、実際は配列ではなく
              単一オブジェクトで返る。supabase-jsは型生成なしではこの区別ができず配列型と推論するため、
              ここで明示的にキャストする */}
          <RecordList records={(records ?? []) as unknown as RecordRow[]} />
        </>
      ) : (
        <p className="text-gray-600">記録を見るにはログインしてください。</p>
      )}
    </main>
  )
}
