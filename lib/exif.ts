import exifr from 'exifr'

export type ExifResult = {
  latitude: number | null
  longitude: number | null
  takenAt: string | null // ISO文字列
}

// EXIFにGPSが無い写真は珍しくない（要件定義書 機能②）。
// 解析自体が失敗した場合も含め、常に null 埋めの結果を返す（呼び出し側でtry/catch不要にする）。
// 既知の制限（2026-09-04）：exifr 7.1.3のHEIC判定は、ftypボックスが50バイトを
// 超えると即座に「未知の形式」として諦める。iPhoneのHDR撮影HEICは互換ブランド
// タグが多く、この上限を超えて解析自体に失敗することがある（実機で確認済み）。
// 通常のHEICは影響を受けない可能性が高い。この場合もエラーは投げず、
// 呼び出し側のGeolocationフォールバックに委ねる。
export async function readExif(file: File): Promise<ExifResult> {
  try {
    const data = await exifr.parse(file, { gps: true, pick: ['DateTimeOriginal', 'CreateDate'] })
    const takenAtDate: Date | undefined = data?.DateTimeOriginal ?? data?.CreateDate

    return {
      latitude: typeof data?.latitude === 'number' ? data.latitude : null,
      longitude: typeof data?.longitude === 'number' ? data.longitude : null,
      takenAt: takenAtDate instanceof Date && !isNaN(takenAtDate.getTime()) ? takenAtDate.toISOString() : null,
    }
  } catch {
    return { latitude: null, longitude: null, takenAt: null }
  }
}
