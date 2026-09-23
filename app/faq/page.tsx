// よくある質問。設定タブから辿れる置き場として先に箱だけ用意しておき、
// 今後の運用で増えた質問はこの配列に追記していく。

type QAItem = {
  question: string
  answer: string
}

const QA_ITEMS: QAItem[] = [
  {
    question: '記録の時間帯を選ぶと、天気はどの時刻の情報が使われますか？',
    answer:
      '選んだ時間帯の代表時刻をもとに取得しています。早朝は6:00、午前は9:30、昼は12:00、午後は14:00、夕方は16:30、夜は21:00の天気を記録します。',
  },
]

export default function FaqPage() {
  return (
    <main className="max-w-[430px] mx-auto p-6 pb-24 space-y-6 w-full">
      <h1 className="text-xl font-body font-semibold">よくある質問</h1>

      <div className="space-y-4">
        {QA_ITEMS.map((item) => (
          <div key={item.question} className="border border-line rounded-lg p-4 bg-sumi-2 space-y-2">
            <p className="font-semibold">{item.question}</p>
            <p className="text-sm text-nami-dim">{item.answer}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
