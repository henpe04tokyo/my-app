// src/Landing.jsx
// 未ログインで開いたときのトップページ。検索から来た人が、ログインなしでそのまま使える。
import React from 'react';
import { Link } from 'react-router-dom';
import SEO from './components/Dashboard/SEO/SEO';
import StructuredData, { generateFAQSchema } from './components/Dashboard/SEO/StructuredData';
import ScoreCalculator from './components/Landing/ScoreCalculator';
import { trackEvent } from './analytics';

export const FAQS = [
  {
    question: '五捨六入とは何ですか？',
    answer:
      '千点未満の端数を、百の位が5以下なら切り捨て、6以上なら切り上げる丸め方です。たとえば29,500点は29、29,600点は30として精算します。マイナスの点数も絶対値で同じように丸めます（-1,600点は-2）。'
  },
  {
    question: 'ウマとオカはどう計算していますか？',
    answer:
      'ウマは順位に応じた加減点です（10-30なら2位+10、3位-10、4位-30）。オカは原点25,000点と返し点30,000点の差（4人合計で20pt）を1位が受け取る仕組みです。このツールでは2〜4位を「順位点 −（30 − 五捨六入後の持ち点）」で計算し、1位は他の3人の合計の符号を反転しているため、オカが含まれます。原点25,000点・返し点30,000点で計算します。'
  },
  {
    question: '同点のときはどうなりますか？',
    answer:
      'このツールでは、上に入力した人を上位として計算します。ログイン後のアプリでは、同点のときに順位を指定できます。'
  },
  {
    question: '入力した点数は保存されますか？',
    answer:
      'このツールの入力は保存も送信もされず、お使いの端末の中だけで計算します。成績を記録して残したい場合は、ログインしてアプリを使ってください。'
  },
  {
    question: '飛び賞やチップにも対応していますか？',
    answer:
      'ログイン後のアプリが対応しています。飛び賞（飛んだ人が払った点数の反映を含む）、チップ、半荘ごとの記録、年やプレイヤーで絞った集計ができます。'
  }
];

const FEATURES = [
  '半荘ごとの結果を記録し、合計と順位回数を自動で集計',
  '飛び賞（飛んだ人が最後に払った点数の反映を含む）とチップに対応',
  '順位点は 5-10 / 5-15 / 10-20 / 10-30 / 20-30 から選べる',
  '年・プレイヤーで絞って、グループをまたいだ成績を確認'
];

const Landing = () => {
  const onCtaClick = (target) => () => trackEvent('landing_cta_click', { target });

  return (
    <>
      <SEO
        title="麻雀の精算計算ツール｜ウマ・オカ・五捨六入対応・ログイン不要"
        description="4人の持ち点を入れるだけで、ウマ・オカ・五捨六入を反映した順位点と収支を自動計算。ログイン不要・無料。ログインすれば半荘ごとの記録、飛び賞、チップ、年間集計まで管理できます。"
        canonical="/"
      />
      <StructuredData data={generateFAQSchema(FAQS)} />

      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <span className="text-lg font-bold text-gray-900">麻雀スコア計算</span>
            <nav className="flex items-center gap-3 text-sm">
              <Link
                to="/login"
                onClick={onCtaClick('login_header')}
                className="font-medium text-gray-700 hover:text-indigo-600"
              >
                ログイン
              </Link>
              <Link
                to="/signup"
                onClick={onCtaClick('signup_header')}
                className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700"
              >
                新規登録
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-8">
          <section>
            <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
              麻雀の精算計算ツール
              <span className="block text-base font-medium text-indigo-600 sm:text-lg">
                ウマ・オカ・五捨六入に対応｜ログイン不要・無料
              </span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              4人の持ち点を入れるだけで、順位点と収支を自動で計算します。持ち点は下2桁を省略して入力できます（292 と入れれば 29,200点）。
            </p>
          </section>

          <section className="mt-6" aria-label="精算計算ツール">
            <ScoreCalculator />
          </section>

          <section className="mt-10 rounded-xl bg-white p-6 shadow">
            <h2 className="text-lg font-bold text-gray-900">成績を残すなら、ログインして記録</h2>
            <p className="mt-2 text-sm text-gray-600">
              計算だけでなく、その日の半荘をまとめて記録し、成績を集計できます。
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
              {FEATURES.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to="/signup"
                onClick={onCtaClick('signup_body')}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                無料で新規登録
              </Link>
              <Link
                to="/login"
                onClick={onCtaClick('login_body')}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                ログイン
              </Link>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-bold text-gray-900">よくある質問</h2>
            <dl className="mt-3 space-y-4">
              {FAQS.map((faq) => (
                <div key={faq.question} className="rounded-lg bg-white p-4 shadow-sm">
                  <dt className="font-medium text-gray-900">{faq.question}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-gray-600">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        </main>

        <footer className="mx-auto max-w-3xl px-4 pb-10 text-xs text-gray-500">
          © 麻雀スコア計算
        </footer>
      </div>
    </>
  );
};

export default Landing;
