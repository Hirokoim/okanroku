import { createClient } from '@/lib/supabase/server'
import { asRows } from '@/lib/supabase/rows'
import type { RecordRow } from '../record-list'
import { RecordsView } from './records-view'
import Link from 'next/link'

// 記録タブ。地点横断で時系列に見返す一覧と、写真から記録する画面（/records/new）への
// 入口（要件定義書4-C・機能②）をここに置く。ダッシュボード（/）からは
// 「次はどこを目指すか」とは役割が異なるため、別のタブにしている。
export default async function RecordsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: records } = user
    ? await supabase
        .from('records')
        .select(
          'id, location_id, location_name, work_label, photographed_at, created_at, figures(name), locations(title_jp)'
        )
        .order('created_at', { ascending: false })
    : { data: null }

  return (
    <main className="max-w-[430px] mx-auto p-6 pb-24 space-y-4 w-full">
      <h1 className="text-xl font-body font-semibold">
        記録
        {user && <span className="text-sm font-normal text-nami-dim ml-2">{(records ?? []).length}件</span>}
      </h1>

      {user ? (
        <div className="space-y-4">
          <Link
            href="/records/new"
            className="flex items-center justify-between border border-kin-dim rounded-lg px-4 py-3 bg-sumi-2 hover:bg-sumi-3 transition-colors"
          >
            <span className="font-body font-semibold text-sm">写真から記録する</span>
            <span className="text-xs text-kin">記録画面へ →</span>
          </Link>
          <RecordsView records={asRows<RecordRow>(records)} />
        </div>
      ) : (
        <p className="text-nami-dim">記録を見るにはログインしてください。</p>
      )}
    </main>
  )
}
