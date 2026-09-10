// supabase-jsは、型生成を入れていない状態では「多対1の関連」（figures(name) など）を
// 配列だと推論する。実際に返るのは単一オブジェクトかnullなので、そのままでは
// 画面側で定義した型と噛み合わない。
//
// 以前はこの説明と `as unknown as` のキャストが3画面
// （app/page.tsx・app/map/page.tsx・app/locations/[id]/page.tsx）に
// 同じ内容でコピーされていたため、ここへ集約する。
//
// 恒久的な解決は型生成（supabase gen types typescript）の導入で、
// そうなればこのファイルは不要になる。それまでの措置。

/** select()の結果を、画面側で定義した行の型として読み替える。nullは空配列にする。 */
export function asRows<Row>(data: unknown): Row[] {
  return (data ?? []) as Row[]
}

/** maybeSingle()など、1件だけ返る結果を読み替える。 */
export function asRow<Row>(data: unknown): Row {
  return data as Row
}
