import { createClient } from '@/lib/supabase/server'
import { AuthButton } from './auth-button'
import { RecordForm } from './record-form'
import { RecordList, type RecordRow } from './record-list'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: figures } = await supabase.from('figures').select('id, name').order('name')

  const { data: records } = user
    ? await supabase
        .from('records')
        .select('id, location_name, work_label, diff_type, created_at, figures(name)')
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
          <RecordForm userId={user.id} figures={figures ?? []} />
          {/* records(figure_id)はrecordsから見て多対1の関係なので、実際は配列ではなく単一オブジェクトで返る。
              supabase-jsは型生成なしではこの区別ができず配列型と推論するため、ここで明示的にキャストする */}
          <RecordList records={(records ?? []) as unknown as RecordRow[]} />
        </>
      ) : (
        <p className="text-gray-600">記録を保存するにはログインしてください。</p>
      )}
    </main>
  )
}
