'use client'

// 記録全体の削除ボタン（確認ダイアログ＋Storage一括削除＋DBレコード削除）。EditRecordFormが使う。

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { LocationRecord } from './record-types'

export function DeleteRecordButton({ record, onDeleted }: { record: LocationRecord; onDeleted: () => void }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!window.confirm('この記録を削除します。本当に削除しますか？（元に戻せません）')) return
    setDeleting(true)
    setError(null)
    const supabase = createClient()

    try {
      // 写真本体（Storage）もあわせて削除を試みる。失敗しても記録の削除は続行する
      // （孤立ファイルが残るより、記録が消せない方が困るため）。
      const paths = record.photos.map((p) => p.storage_path)
      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage.from('photos').remove(paths)
        if (storageError) {
          console.error('写真ファイルの削除に失敗しました', storageError)
        }
      }
      const { error: deleteError } = await supabase.from('records').delete().eq('id', record.id)
      if (deleteError) throw deleteError
      router.refresh()
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました')
      setDeleting(false)
    }
  }

  return (
    <div className="text-center border-t border-line/60 pt-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="text-xs text-hi-bright/80 underline disabled:opacity-50"
      >
        {deleting ? '削除中...' : 'この記録を削除する'}
      </button>
      {error && (
        <p className="text-hi-bright text-xs mt-1">
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
    </div>
  )
}
