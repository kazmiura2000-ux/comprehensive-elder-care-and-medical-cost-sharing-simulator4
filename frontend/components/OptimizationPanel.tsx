import React, { useState } from 'react';
import { Search, Check, ArrowRight, RotateCcw, Info, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { findOptimizationCandidates, OptimizationCandidate, OptimizationSearchResult } from '../lifePlanOptimizer';
import { validateOptimizationSettings } from '../optimizationSettings';
import { SimulatorState } from '../types';

interface OptimizationPanelProps {
 state: SimulatorState;
 onApply: (candidate: OptimizationCandidate) => void;
}

export const OptimizationPanel: React.FC<OptimizationPanelProps> = ({ state, onApply }) => {
 const [result, setResult] = useState<OptimizationSearchResult | null>(null);
 const [isSearching, setIsSearching] = useState(false);
 const [originalBaseline, setOriginalBaseline] = useState<OptimizationCandidate | null>(null);
 const [appliedCandidateIndex, setAppliedCandidateIndex] = useState<number | null>(null);

 const errors = validateOptimizationSettings(state.optimization, state.householdType);

 const runSearch = () => {
  if (errors.length > 0 || isSearching) return;
  setIsSearching(true);
  try {
   const searchResult = findOptimizationCandidates(state);
   setResult(searchResult);
   if (searchResult.baseline) {
    setOriginalBaseline(searchResult.baseline);
    setAppliedCandidateIndex(null);
   }
  } catch {
   setResult({
    error: '候補の計算に失敗しました。条件を確認してもう一度お試しください。',
    evaluatedCandidates: 0,
    baseline: null,
    candidates: [],
   });
  } finally {
   setIsSearching(false);
  }
 };

 const handleApplyCandidate = (candidate: OptimizationCandidate, index: number) => {
  onApply(candidate);
  setAppliedCandidateIndex(index);
 };

 const handleRevertToOriginal = () => {
  if (!originalBaseline) return;
  onApply(originalBaseline);
  setAppliedCandidateIndex(null);
 };

 return (
  <section className="bg-white border-2 border-emerald-300/80 rounded-2xl p-4 sm:p-6 space-y-4 shadow-sm">
   {/* ヘッダーエリア */}
   <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
    <div className="space-y-1 max-w-2xl">
     <div className="flex items-center gap-2">
      <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
       <Search className="w-4 h-4" />
      </div>
      <h3 className="font-extrabold text-slate-900 text-base">
       ライフプラン自動改善プラン探索（ローカル最適化）
      </h3>
     </div>
     <p className="text-xs text-slate-600 leading-relaxed">
      指定した目標資産残高と変更許容範囲をもとに、数千通りの組み合わせから最適な改善候補をローカル計算します。
     </p>
    </div>

    <div className="flex items-center gap-2">
     {appliedCandidateIndex !== null && originalBaseline && (
      <button
       type="button"
       onClick={handleRevertToOriginal}
       className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100 hover:border-slate-400 transition active:scale-95"
       title="候補案を適用する前の元の設定に戻します"
      >
       <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
       現在のプランに戻す
      </button>
     )}

     <button
      type="button"
      disabled={errors.length > 0 || isSearching}
      onClick={runSearch}
      className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 transition active:scale-95"
     >
      <Search className="w-3.5 h-3.5" />
      {isSearching ? '探索計算中...' : '改善候補を計算する'}
     </button>
    </div>
   </div>

   {/* 裁量支出についての説明ボックス */}
   <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-slate-700 space-y-1">
    <div className="flex items-center gap-1.5 font-bold text-emerald-950">
     <Info className="w-4 h-4 text-emerald-700 shrink-0" />
     <span>【裁量支出の定義と削減対象について】</span>
    </div>
    <p className="text-[11px] leading-relaxed text-slate-600 pl-5">
     ここでいう「<strong>裁量支出</strong>」とは、人生の楽しみのための「<strong>アクティブ娯楽費</strong>（毎年の旅行・趣味・外食など）」および「<strong>まとまった娯楽費</strong>（記念旅行・大きな買物等の単発支出）」を指します。<br />
     生活に必要な「<strong>住居費</strong>」「<strong>基本生活費</strong>（食費・光熱費等）」「<strong>期間指定の特別支出</strong>（車・教育等）」「<strong>予備費</strong>」「<strong>医療・介護防衛資金</strong>」は<strong>一切削らずに保護</strong>されます。
    </p>
   </div>

   {/* エラーまたはガイドメッセージ */}
   {errors.length > 0 && (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 flex items-start gap-2">
     <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
     <div>
      <span className="font-bold block">自動最適化の条件設定が必要です</span>
      <p className="text-[11px] text-amber-800 mt-0.5">
       左カラムの「4. 自動最適化の目標と変更範囲」にて、目標残高および変更してよい項目（就労年齢・年金開始・再雇用手取り・裁量支出など）を1つ以上選択してください。
      </p>
     </div>
    </div>
   )}

   {result?.error && (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-start gap-2" role="alert">
     <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
     <span>{result.error}</span>
    </div>
   )}

   {/* 候補案適用中の通知バナー */}
   {appliedCandidateIndex !== null && originalBaseline && (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-emerald-500 bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-3.5 sm:p-4 text-xs shadow-xs animate-fadeIn">
     <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-black text-sm shadow-xs">
       <CheckCircle2 className="w-5 h-5" />
      </div>
      <div>
       <div className="flex items-center gap-2">
        <span className="font-black text-emerald-950 text-sm">
         【候補 {appliedCandidateIndex + 1}】をシミュレーションに反映中
        </span>
        <span className="rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-bold">
         適用中
        </span>
       </div>
       <p className="text-slate-600 text-[11px] mt-0.5">
        画面上部のキャッシュフロー表や資産推移グラフが、この候補の変更数値で再計算されています。
       </p>
      </div>
     </div>
     <button
      type="button"
      onClick={handleRevertToOriginal}
      className="inline-flex items-center gap-1.5 rounded-xl bg-white border-2 border-slate-400 px-3.5 py-2 text-xs font-black text-slate-800 shadow-xs hover:bg-slate-100 hover:border-slate-600 transition active:scale-95"
     >
      <RotateCcw className="w-4 h-4 text-slate-700" />
      現在のプランに戻す（変更を取消）
     </button>
    </div>
   )}

   {/* 検索結果カードグリッド */}
   {result && !result.error && originalBaseline && (
    <div className="space-y-4 pt-1">
     <div className="flex items-center justify-between text-[11px] text-slate-500">
      <span>
       {result.evaluatedCandidates} 通りの組み合わせを探索・評価しました。
      </span>
      <span>※各候補の「変更内容」を展開して、何がいくら変わるかを確認できます</span>
     </div>

     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* 元のプラン（比較基準）カード */}
      <div
       className={`rounded-xl border p-4 space-y-3 transition ${
        appliedCandidateIndex === null
         ? 'border-slate-300 bg-slate-50/80 shadow-xs'
         : 'border-slate-200 bg-slate-50 opacity-90'
       }`}
      >
       <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5">
         <span className="text-xs font-black text-slate-800">最適化前のプラン</span>
         {appliedCandidateIndex === null && (
          <span className="rounded bg-slate-200 text-slate-700 text-[10px] font-bold px-1.5 py-0.2">
           現在の設定
          </span>
         )}
        </div>
        <span className="text-[10px] font-medium text-slate-500">比較基準</span>
       </div>

       <div>
        <span className="text-[10px] text-slate-500 block">想定寿命時点の総資産</span>
        <p className="text-xl font-black text-slate-900 font-mono">
         {originalBaseline.endingAssets.toLocaleString()}
         <span className="text-xs font-normal font-sans ml-0.5">万円</span>
        </p>
        <p
         className={`text-xs font-bold mt-1 ${
          originalBaseline.firstDepletedAge === null ? 'text-emerald-700' : 'text-rose-600'
         }`}
        >
         {originalBaseline.firstDepletedAge === null
          ? '✓ 試算期間中の資産枯渇なし'
          : `⚠️ ${originalBaseline.firstDepletedAge}歳で資産枯渇`}
        </p>
       </div>

       <div className="rounded-lg bg-white border border-slate-200 p-2.5 text-[11px] text-slate-600 space-y-1">
        <span className="font-bold text-slate-700 block">現在の設定値</span>
        <p className="text-[10px] leading-relaxed text-slate-500">
         このプランは調整前の元の入力内容です。他の候補を試したあとでも、下のボタンでいつでもこの状態に戻せます。
        </p>
       </div>

       {appliedCandidateIndex !== null && (
        <button
         type="button"
         onClick={handleRevertToOriginal}
         className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-slate-400 bg-white py-2 text-xs font-black text-slate-800 shadow-xs hover:bg-slate-100 transition active:scale-95"
        >
         <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
         この元のプランに戻す
        </button>
       )}
      </div>

      {/* 改善候補カード一覧 */}
      {result.candidates.map((candidate, index) => {
       const isApplied = appliedCandidateIndex === index;

       return (
        <article
         key={`${candidate.endingAssets}-${index}`}
         className={`rounded-xl border p-4 space-y-3.5 transition flex flex-col justify-between ${
          isApplied
           ? 'border-2 border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/30 shadow-md'
           : 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-300 hover:bg-emerald-50/50 shadow-2xs'
         }`}
        >
         <div className="space-y-3">
          {/* カードヘッダー */}
          <div className="flex items-center justify-between gap-2 border-b border-emerald-200 pb-2">
           <div className="flex items-center gap-2">
            <span className="text-xs font-black text-emerald-950">
             候補 {index + 1}
            </span>
            {isApplied && (
             <span className="rounded-full bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.2 shadow-2xs">
              ✓ 適用中
             </span>
            )}
           </div>
           <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
             candidate.withinTarget
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-amber-100 text-amber-900 border border-amber-300'
            }`}
           >
            {candidate.withinTarget ? '目標範囲内' : '目標範囲外'}
           </span>
          </div>

          {/* 想定残高と資産状態 */}
          <div>
           <span className="text-[10px] text-slate-500 block">想定寿命時点の総資産</span>
           <div className="flex items-baseline gap-2">
            <p className="text-xl font-black text-slate-900 font-mono">
             {candidate.endingAssets.toLocaleString()}
             <span className="text-xs font-normal font-sans ml-0.5">万円</span>
            </p>
            {originalBaseline && (
             <span
              className={`text-xs font-mono font-bold ${
               candidate.endingAssets >= originalBaseline.endingAssets ? 'text-emerald-700' : 'text-slate-600'
              }`}
             >
              ({candidate.endingAssets >= originalBaseline.endingAssets ? '+' : ''}
              {(candidate.endingAssets - originalBaseline.endingAssets).toLocaleString()}万)
             </span>
            )}
           </div>
           <p
            className={`text-xs font-bold mt-1 ${
             candidate.firstDepletedAge === null ? 'text-emerald-700' : 'text-rose-600'
            }`}
           >
            {candidate.firstDepletedAge === null
             ? '✓ 試算期間中の資産枯渇なし'
             : `⚠️ ${candidate.firstDepletedAge}歳で資産枯渇`}
           </p>
          </div>

          {/* 変更内容と金額の内訳一覧 */}
          <div className="space-y-2.5 pt-1 border-t border-emerald-100">
           <span className="text-[11px] font-extrabold text-slate-800 block">
            変更内容と金額への影響：
           </span>

           <div className="space-y-2">
            {candidate.adjustments.map((adjustment) => (
             <div
              key={adjustment.key}
              className="rounded-lg border border-emerald-200/90 bg-white p-2.5 space-y-1.5 shadow-2xs"
             >
              {/* 変更項目のタイトルと変化量 */}
              <div className="flex items-center justify-between gap-1 text-xs">
               <span className="font-bold text-slate-900 flex items-center gap-1">
                <ArrowRight className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                {adjustment.label}
               </span>
               <span className="rounded bg-emerald-100 text-emerald-900 font-bold px-1.5 py-0.2 text-[10px] whitespace-nowrap">
                {adjustment.diffText}
               </span>
              </div>

              {/* 変更前 → 変更後 */}
              <div className="text-[11px] text-slate-600 pl-4 font-mono">
               {adjustment.from}{adjustment.unit} → <strong className="text-emerald-800">{adjustment.to}{adjustment.unit}</strong>
              </div>

              {/* 金額への影響サマリー */}
              {adjustment.impactSummary && (
               <div className="rounded bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-900 border border-emerald-200 leading-snug">
                {adjustment.impactSummary}
               </div>
              )}

              {/* 明細内訳（何がどのくらいの額になるか） */}
              {adjustment.details && adjustment.details.length > 0 && (
               <div className="pt-1 border-t border-slate-100 space-y-1 pl-1">
                <span className="text-[9px] font-bold text-slate-400 block">
                 【対象の内訳と変更後の額】
                </span>
                <ul className="space-y-1 text-[10px]">
                 {adjustment.details.map((detail, dIdx) => (
                  <li
                   key={`${detail.label}-${dIdx}`}
                   className="flex flex-col bg-slate-50/70 p-1.5 rounded border border-slate-200/60 leading-tight"
                  >
                   <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-slate-800">{detail.label}</span>
                    <span
                     className={`font-mono font-bold shrink-0 ${
                      detail.diffText.startsWith('-') ? 'text-amber-700' : 'text-emerald-700'
                     }`}
                    >
                     {detail.diffText}
                    </span>
                   </div>
                   <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {detail.from} {detail.unit} → <strong className="text-slate-800">{detail.to} {detail.unit}</strong>
                   </div>
                   {detail.note && (
                    <span className="text-[9px] text-slate-400 mt-0.5">
                     ※{detail.note}
                    </span>
                   )}
                  </li>
                 ))}
                </ul>
               </div>
              )}
             </div>
            ))}
           </div>
          </div>
         </div>

         {/* アクションボタン */}
         <div className="pt-2 border-t border-emerald-200/60 space-y-2">
          {isApplied ? (
           <button
            type="button"
            onClick={handleRevertToOriginal}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-slate-400 bg-white py-2 text-xs font-black text-slate-800 shadow-xs hover:bg-slate-100 transition active:scale-95"
           >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            現在のプランに戻す
           </button>
          ) : (
           <button
            type="button"
            onClick={() => handleApplyCandidate(candidate, index)}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white py-2 text-xs font-bold shadow-xs transition active:scale-95"
           >
            <Check className="w-3.5 h-3.5" />
            {appliedCandidateIndex !== null ? `この案（候補 ${index + 1}）に変更する` : 'この案を適用する'}
           </button>
          )}
         </div>
        </article>
       );
      })}

      {result.candidates.length === 0 && (
       <div className="col-span-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 space-y-1">
        <span className="font-bold block">候補が見つかりませんでした</span>
        <p className="text-[11px] text-slate-600 leading-relaxed">
         指定された変更許容範囲の中で、目標残高を満たす候補が見つかりませんでした。
         左側の「自動最適化の目標と変更範囲」で、退職年齢や年金開始、再雇用手取り、または裁量支出の削減幅を少し広げて再度計算してください。
        </p>
       </div>
      )}
     </div>

     <p className="text-[10px] leading-relaxed text-slate-400 pt-1">
      ※探索結果は指定した経済環境（運用利回り・物価上昇率）および現行法制度に基づく試算です。実際の運用成果や税務上の結果を保証するものではありません。
     </p>
    </div>
   )}
  </section>
 );
};