import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// 2カラムのラベル＋値レイアウトは、MulmoClaudeのfugaku-36コレクションが
// schema.jsonから自動生成している詳細モーダルの見せ方を参考にした
// （~/mulmoclaude/data/skills/fugaku-36/schema.json）。
// あちらは汎用エンジンによる自動生成でコードの流用はできないため、
// フィールドの並び・2カラム構成だけを踏襲している。

const ACCESSIBILITY_LABEL: Record<string, string> = {
  visible: '見える富士',
  not_visible: '見えない富士',
  imagined: '心の中の富士',
  unjudged: '未判定',
}

const CONFIDENCE_LABEL: Record<string, string> = {
  confirmed: '確定',
  estimated: '推定',
  unconfirmed: '未確認',
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  )
}

export default async function LocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="max-w-2xl mx-auto p-6">
        <p className="text-gray-600">この画面を見るにはログインしてください。</p>
      </main>
    )
  }

  const { data: location } = await supabase
    .from('locations')
    .select(
      'id, number, title_jp, title_en, series, prefecture, modern_location, cluster, route_order, accessibility_class, accessibility_confidence, accessibility_reason, location_confidence, location_source, image_url, image_source, image_license, figures(name)'
    )
    .eq('id', id)
    .maybeSingle()

  if (!location) notFound()

  // 自分の記録のみ（RLSにより自動的にそう絞られるが、location_idでも明示的に絞る）
  const { data: records } = await supabase
    .from('records')
    .select('id, photographed_at, edit_intent, voice_transcript, access_note, is_public, created_at')
    .eq('location_id', id)
    .order('photographed_at', { ascending: false })

  // locations(figure_id)はlocationsから見て多対1の関係なので、実際は配列ではなく
  // 単一オブジェクトで返る。supabase-jsは型生成なしではこの区別ができず配列型と
  // 推論するため、ここで明示的にキャストする（page.tsxの records(figure_id) と同じ理由）
  const figureName = (location as unknown as { figures: { name: string } | null }).figures?.name

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <Link href="/map" className="text-sm text-blue-600 underline">
          ← 地図に戻る
        </Link>
      </div>

      <div>
        <div className="text-sm text-gray-500">第{location.number}景{figureName ? `・${figureName}` : ''}</div>
        <h1 className="text-2xl font-bold">{location.title_jp}</h1>
        {location.title_en && <p className="text-gray-500">{location.title_en}</p>}
      </div>

      {location.image_url ? (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element -- 外部URL(Met/Wikimedia等)は
              取得元が地点ごとに異なりドメインを事前登録できないため、next/imageではなくimgを使う */}
          <img src={location.image_url} alt={location.title_jp} className="w-full rounded-lg border" />
          {(location.image_source || location.image_license) && (
            <figcaption className="text-xs text-gray-400 mt-1">
              {location.image_source}
              {location.image_license && ` （${location.image_license}）`}
            </figcaption>
          )}
        </figure>
      ) : (
        <div className="border rounded-lg p-6 text-center text-gray-400 text-sm">
          元絵の画像は未登録です
        </div>
      )}

      <div className="border rounded-lg p-4 grid grid-cols-2 gap-4">
        <Field label="都道府県" value={location.prefecture} />
        <Field label="現代の地名" value={location.modern_location} />
        <Field label="シリーズ" value={location.series} />
        <Field label="クラスタ" value={location.cluster} />
        <Field
          label="富士の見え方"
          value={location.accessibility_class ? ACCESSIBILITY_LABEL[location.accessibility_class] : null}
        />
        <Field
          label="分類確度"
          value={location.accessibility_confidence ? CONFIDENCE_LABEL[location.accessibility_confidence] : null}
        />
      </div>

      {location.accessibility_reason && (
        <div>
          <div className="text-xs text-gray-500 mb-1">分類根拠</div>
          <p className="text-sm text-gray-700">{location.accessibility_reason}</p>
        </div>
      )}

      {location.location_source && (
        <div>
          <div className="text-xs text-gray-500 mb-1">
            比定地の出典
            {location.location_confidence && (
              <span className="ml-2">（{CONFIDENCE_LABEL[location.location_confidence] ?? location.location_confidence}）</span>
            )}
          </div>
          <p className="text-sm text-gray-700">{location.location_source}</p>
        </div>
      )}

      <div className="border-t pt-4">
        <h2 className="font-semibold mb-2">自分の記録（{records?.length ?? 0}件）</h2>
        {!records || records.length === 0 ? (
          <p className="text-gray-500 text-sm">
            まだこの地点の記録がありません。地点を選んでの記録入力は近日対応予定です。
          </p>
        ) : (
          <ul className="space-y-2">
            {records.map((r) => (
              <li key={r.id} className="border rounded p-3 text-sm">
                <div className="text-gray-400 text-xs">
                  {r.photographed_at
                    ? new Date(r.photographed_at).toLocaleDateString('ja-JP')
                    : new Date(r.created_at).toLocaleDateString('ja-JP')}
                </div>
                {r.edit_intent && <div className="font-medium">{r.edit_intent}</div>}
                {r.voice_transcript && <div className="text-gray-600">{r.voice_transcript}</div>}
                {r.access_note && <div className="text-gray-500 text-xs mt-1">{r.access_note}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
