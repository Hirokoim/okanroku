// crypto.randomUUID()は「安全なコンテキスト」（HTTPS/localhost）でしか動かず、
// プロキシ経由のプレビュー環境などでは例外を投げて呼び出し元の処理ごと失敗させる。
// 一時的なクライアント側の識別子（DBには保存しない）にはこちらを使い、依存を避ける。
export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
