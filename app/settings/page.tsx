import { AuthButton } from '../auth-button'

// 設定タブ。当面はログアウトのみを置く（要件定義書5-Aの通り、中身が薄くても
// アカウント操作の定位置を先に作っておく。エクスポート等はPhase2で追加）。
export default function SettingsPage() {
  return (
    <main className="max-w-[430px] mx-auto p-6 pb-24 space-y-6 w-full">
      <h1 className="text-xl font-display font-semibold">設定</h1>

      <div className="border border-line rounded-lg p-4 bg-sumi-2">
        <AuthButton />
      </div>
    </main>
  )
}
