import React, { Suspense, lazy, useState } from 'react';
import type { OptimizationCandidate } from '../lifePlanOptimizer';
import { SimulatorState, LifePlanYearRecord } from '../types';
import { buildLifePlanTimeline } from '../lifePlanCalculator';
import {
 BarChart3,
 Table,
 CheckCircle2,
 AlertTriangle,
 Sparkles,
 MousePointer,
} from 'lucide-react';

const OptimizationPanel = lazy(() =>
 import('./OptimizationPanel').then((module) => ({ default: module.OptimizationPanel }))
);

interface LifePlanViewProps {
 state: SimulatorState;
 onChange: (updater: (prev: SimulatorState) => SimulatorState) => void;
}

export const LifePlanView: React.FC<LifePlanViewProps> = ({ state, onChange }) => {
 const [displayMode, setDisplayMode] = useState<'both' | 'chart' | 'table'>('both');
 const [hoveredAge, setHoveredAge] = useState<number | null>(null);

 const isCouple = state.householdType === 'couple';
 const timeline = buildLifePlanTimeline(state);
 const recordAt100 = timeline.find((r) => r.age === 100) || timeline[timeline.length - 1];
 const firstDeficitRecord = timeline.find((r) => r.isDeficit);
 const transitionRecord = timeline.find((r) => r.isTransitionToSingle);

 const activeRecord =
  timeline.find((r) => r.age === (hoveredAge ?? 100)) || recordAt100;

 const maxPositive = Math.max(
  ...timeline.map((r) => r.surplusCashBalance + r.bucket1Balance + r.bucket3Balance + Math.max(0, r.bucket2Balance)),
  2500
 );

 const maxNegative = Math.max(
  ...timeline.map((r) => (r.bucket2Balance < 0 ? Math.abs(r.bucket2Balance) : 0)),
  500
 );

 const positiveAreaHeight = 150;
 const negativeAreaHeight = maxNegative > 0 ? 90 : 20;

 return (
  <div className="space-y-5 animate-fadeIn w-full">
   <div
    className={`p-4 sm:p-5 rounded-2xl border shadow-xs transition-all ${
     !firstDeficitRecord && recordAt100.bucket2Balance > 0
      ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-emerald-300 text-emerald-950'
      : 'bg-gradient-to-r from-rose-50 via-amber-50 to-white border-rose-300 text-rose-950'
    }`}
   >
    <div className="flex flex-wrap items-center justify-between gap-4">
     <div className="space-y-1">
      <div className="flex items-center gap-2">
       <span
        className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-2xs ${
         !firstDeficitRecord && recordAt100.bucket2Balance > 0
          ? 'bg-emerald-600 text-white'
          : 'bg-rose-600 text-white'
        }`}
       >
        {!firstDeficitRecord && recordAt100.bucket2Balance > 0 ? (
         <>
          <CheckCircle2 className="w-4 h-4" />
          【合格】100歳安心ライフプラン完成！
         </>
        ) : (
         <>
          <AlertTriangle className="w-4 h-4" />
          【運用資産だけでは不足】{firstDeficitRecord ? `${firstDeficitRecord.age}歳ごろ` : '高齢期'}から
         </>
        )}
       </span>
       <span className="text-xs font-bold text-slate-600">
        『安心と楽しみを両立する老後経済プラン構築マニュアル』完全連動判定
       </span>
      </div>

      <p className="text-xs text-slate-700 leading-relaxed pt-1">
       {!firstDeficitRecord && recordAt100.bucket2Balance > 0 ? (
        <>
         100歳時点で運用資産の簡易試算残高が{' '}
         <strong className="font-mono text-emerald-700 text-sm">
          {recordAt100.bucket2Balance}万円
         </strong>{' '}
         残る見込みです。医療・介護用に確保する資金は別枠で表示しています。
        </>
       ) : (
        <>
         {firstDeficitRecord?.age}歳ごろに、運用資産だけでは支出をまかなえなくなる見込みです。
         これは家計全体の資産枯渇を示すものではありません。現金や口座別の取り崩しを反映した結果は第3ステップで確認できます。
        </>
       )}
      </p>
     </div>

     <div className="flex items-center gap-3 text-xs font-mono font-bold">
      <div className="bg-white/90 px-3 py-2 rounded-xl border border-slate-200 shadow-2xs text-center">
      <span className="text-[10px] text-slate-500 font-sans block">100歳時点 運用資産の簡易試算</span>
       <span
        className={`text-base font-black ${
         recordAt100.bucket2Balance >= 0 ? 'text-emerald-700' : 'text-rose-600'
        }`}
       >
        {recordAt100.bucket2Balance >= 0 ? `+${recordAt100.bucket2Balance}` : recordAt100.bucket2Balance}
        <span className="text-xs font-sans ml-0.5">万</span>
       </span>
      </div>
      <div className="bg-white/90 px-3 py-2 rounded-xl border border-slate-200 shadow-2xs text-center">
      <span className="text-[10px] text-slate-500 font-sans block">医療・介護用に確保</span>
       <span className="text-base font-black text-slate-800">
        {state.lifePlan.bucket3Emergency}<span className="text-xs font-sans ml-0.5">万温存</span>
       </span>
      </div>
     </div>
    </div>
   </div>

   <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
    <div className="flex items-center gap-2">
     <BarChart3 className="w-4 h-4 text-sky-600" />
     <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">
      現在から100歳までの動的ライフプラン表（インフレ・3大バケット自動連動）
     </h3>
    </div>

    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
     <button
      onClick={() => setDisplayMode('both')}
      className={`px-3 py-1.5 rounded-lg transition ${
       displayMode === 'both' ? 'bg-white shadow text-sky-700' : 'hover:text-slate-900'
      }`}
     >
      グラフ＋表
     </button>
     <button
      onClick={() => setDisplayMode('chart')}
      className={`px-3 py-1.5 rounded-lg transition ${
       displayMode === 'chart' ? 'bg-white shadow text-sky-700' : 'hover:text-slate-900'
      }`}
     >
      グラフ中心
     </button>
     <button
      onClick={() => setDisplayMode('table')}
      className={`px-3 py-1.5 rounded-lg transition ${
       displayMode === 'table' ? 'bg-white shadow text-sky-700' : 'hover:text-slate-900'
      }`}
     >
      全年次表
     </button>
    </div>
   </div>

   {(displayMode === 'both' || displayMode === 'chart') && (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
     <div className="flex items-center justify-between border-b pb-2 flex-wrap gap-2 text-xs">
      <span className="font-bold text-slate-700 flex items-center gap-1">
       <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
      資産残高の簡易見込み
      </span>
      <div className="flex items-center gap-3 text-[11px] font-semibold flex-wrap">
       <span className="flex items-center gap-1 text-indigo-700">
        <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600"></span>バケット2 (運用資産)
       </span>
      <span className="flex items-center gap-1 text-amber-700">
       <span className="w-2.5 h-2.5 rounded-sm bg-amber-400"></span>余剰預貯金
      </span>
       <span className="flex items-center gap-1 text-emerald-700">
        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>バケット1 ({state.lifePlan.bucket1Cash}万)
       </span>
       <span className="flex items-center gap-1 text-slate-500">
        <span className="w-2.5 h-2.5 rounded-sm bg-slate-400"></span>バケット3 ({state.lifePlan.bucket3Emergency}万)
       </span>
       <span className="flex items-center gap-1 text-rose-600 font-bold">
        <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>運用資産で不足する額
       </span>
       {isCouple && transitionRecord && (
        <span className="flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-300">
         <span>🕊️ 単身世帯変化点 ({transitionRecord.firstPassingPersonName}他界 {transitionRecord.age}歳時点)</span>
        </span>
       )}
      </div>
     </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
       <div className="flex gap-2 items-start rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5">
        <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-sm bg-rose-500" />
        <p className="leading-relaxed text-rose-950">
         <strong>赤い棒:</strong> 余剰預貯金を使った後、簡易運用資産だけでは不足する額です。生活・医療用の確保資金は使わず、NISA・特定口座別の売却税も計算しません。
        </p>
       </div>
       <div className="flex gap-2 items-start rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5">
        <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-sm bg-sky-500" />
        <p className="leading-relaxed text-sky-950">
         <strong>第3ステップ:</strong> 同じ年ごとの収入・支出に、現金・NISA・特定口座の運用と取り崩し順を加えて確認します。
        </p>
       </div>
      </div>

     <div className="bg-slate-900 text-white p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-inner">
      <div className="flex items-center gap-3">
       <div className="bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 font-mono">
        <span className="text-[10px] text-slate-400 block font-sans">着目年次</span>
        <span className="text-base font-black text-amber-300">
         {activeRecord.age}歳{' '}
         <span className="text-xs text-slate-300 font-normal">({activeRecord.year}年)</span>
        </span>
       </div>

       <div>
        <div className="flex items-center gap-2">
         <span className="text-slate-400">総金融資産:</span>
         <span className="text-sm font-black font-mono text-white">
          {activeRecord.totalAssets}万円
         </span>
         <span className="text-slate-500 font-mono text-[11px]">
          (余剰預貯金: {activeRecord.surplusCashBalance}万 / 手取収入: {activeRecord.totalNetIncome}万 / 支出計: {activeRecord.totalExpense}万)
         </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-300 mt-0.5">
         <span
          className={`font-bold font-mono ${
           activeRecord.bucket2Balance >= 0 ? 'text-indigo-300' : 'text-rose-400 font-black'
          }`}
         >
          運用資産（簡易）: {activeRecord.bucket2Balance}万円
         </span>
         <span>/</span>
         <span
          className={
           activeRecord.annualCashFlow >= 0 ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'
          }
         >
          年間収支: {activeRecord.annualCashFlow >= 0 ? `+${activeRecord.annualCashFlow}` : activeRecord.annualCashFlow}万円
         </span>
         {activeRecord.eventLabel && (
          <span className="bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-400/30 text-[10px]">
           {activeRecord.eventLabel}
          </span>
         )}
        </div>
       </div>
      </div>

      <div className="flex items-center gap-1 text-[11px] text-slate-400">
       <MousePointer className="w-3.5 h-3.5 text-slate-400" />
       <span>棒にカーソルを合わせると年次詳細が切り替わります</span>
      </div>
     </div>

     <div className="relative pt-24 pb-4 overflow-x-auto w-full">
      <div className="min-w-[720px] px-2 relative">
       <div
        style={{ top: `${positiveAreaHeight + 96}px` }}
        className="absolute left-2 right-2 border-t-2 border-slate-700 z-10 pointer-events-none flex items-center justify-between"
       >
        <span className="text-[10px] font-black text-slate-600 bg-white/90 px-1.5 py-0.2 rounded border border-slate-300 shadow-2xs -mt-2.5">
         0円基準ライン
        </span>
        <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 shadow-2xs -mt-2.5">
         ↓ 運用資産だけでは足りない額
        </span>
       </div>

       <div className="flex items-stretch gap-1 sm:gap-1.5 w-full">
        {timeline.map((item) => {
         const isHovered = item.age === hoveredAge;
         const isTargetAge = item.age === state.targetAgeYears;
         const isPassingTransition = item.isTransitionToSingle;

         const scalePos = positiveAreaHeight / maxPositive;
         const b2PosH = item.bucket2Balance > 0 ? Math.round(item.bucket2Balance * scalePos) : 0;
         const cashH = item.surplusCashBalance > 0 ? Math.round(item.surplusCashBalance * scalePos) : 0;
         const b1H = item.bucket1Balance > 0 ? Math.round(item.bucket1Balance * scalePos) : 0;
         const b3H = item.bucket3Balance > 0 ? Math.round(item.bucket3Balance * scalePos) : 0;

         const scaleNeg = negativeAreaHeight / maxNegative;
         const b2NegH =
          item.bucket2Balance < 0
           ? Math.max(6, Math.min(negativeAreaHeight, Math.round(Math.abs(item.bucket2Balance) * scaleNeg)))
           : 0;

         return (
          <div
           key={item.age}
           onMouseEnter={() => setHoveredAge(item.age)}
           className={`flex-1 flex flex-col items-center cursor-pointer group relative ${
            isPassingTransition ? 'border-l-2 border-rose-500 pl-0.5' : ''
           }`}
          >
           {isPassingTransition && (
            <div className="absolute -top-7 text-[9px] bg-rose-600 text-white font-extrabold px-1.5 py-0.5 rounded shadow-md z-20 whitespace-nowrap animate-pulse">
             🕊️ {item.firstPassingPersonName}他界 ({item.survivorPersonName}単身へ)
            </div>
           )}

           <div
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute -top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none bg-slate-900/95 text-white text-[10px] py-1.5 px-2.5 rounded-lg whitespace-nowrap shadow-xl border border-slate-700/80 backdrop-blur-xs flex flex-col items-center leading-tight"
           >
            <span className="font-bold text-amber-300 text-[11px]">
             {item.age}歳 ({item.year}年)
            </span>
            <span className="text-white mt-0.5">
             総資産: <strong className="font-mono text-white">{item.totalAssets}万</strong>
            </span>
            <span
             className={`font-mono ${
              item.bucket2Balance >= 0 ? 'text-indigo-300' : 'text-rose-400 font-bold'
             }`}
            >
             運用資産（簡易）: {item.bucket2Balance}万 / 収支:{' '}
             {item.annualCashFlow >= 0 ? `+${item.annualCashFlow}` : item.annualCashFlow}万
            </span>
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-r border-b border-slate-700/80 rotate-45"></span>
           </div>

           <div
            style={{ height: `${positiveAreaHeight}px` }}
            className="w-full flex flex-col justify-end items-center"
           >
            {b2PosH > 0 && (
             <div
              style={{ height: `${b2PosH}px` }}
              className={`w-full rounded-t-sm transition-colors ${
               isHovered ? 'bg-indigo-400 brightness-110' : 'bg-indigo-600 group-hover:bg-indigo-500'
              }`}
              title={`運用資産（簡易試算）: ${item.bucket2Balance}万円`}
             ></div>
            )}
            {cashH > 0 && (
             <div
              style={{ height: `${cashH}px` }}
              className="w-full bg-amber-400"
              title={`余剰預貯金: ${item.surplusCashBalance}万円`}
             ></div>
            )}
            {b1H > 0 && (
             <div
              style={{ height: `${b1H}px` }}
              className="w-full bg-emerald-500"
              title={`B1現金: ${item.bucket1Balance}万円`}
             ></div>
            )}
            {b3H > 0 && (
             <div
              style={{ height: `${b3H}px` }}
              className="w-full bg-slate-400"
              title={`B3防衛: ${item.bucket3Balance}万円`}
             ></div>
            )}
           </div>

           <div className="w-full h-[2px] bg-slate-700"></div>

           <div
            style={{ height: `${negativeAreaHeight}px` }}
            className="w-full flex flex-col justify-start items-center"
           >
            {item.bucket2Balance < 0 && (
             <div
              style={{ height: `${b2NegH}px` }}
              className="w-full bg-rose-500 hover:bg-rose-600 rounded-b-sm shadow-sm transition-all duration-150 animate-pulse"
              title={`赤字: ${item.bucket2Balance}万円`}
             ></div>
            )}
           </div>

           <span
            className={`text-[9px] font-mono mt-1 ${
             isHovered
              ? 'font-black text-indigo-700 underline'
              : item.age % 5 === 0
              ? 'font-bold text-slate-700'
              : 'text-slate-400'
            }`}
           >
            {item.age % 5 === 0 ? `${item.age}` : '・'}
           </span>
          </div>
         );
        })}
       </div>
      </div>
     </div>
    </div>
   )}

   {(displayMode === 'both' || displayMode === 'table') && (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden w-full">
     <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
      <div className="flex items-center gap-2 font-bold text-slate-800">
       <Table className="w-4 h-4 text-sky-600" />
       <span>100歳までの動的年次キャッシュフロー詳細一覧表</span>
      </div>
      <span className="text-[11px] text-slate-500">
      ※運用資産だけでは不足する年を赤く表示しています。預貯金などを含む家計全体の枯渇時期ではありません。
      </span>
     </div>

     <div className="max-h-96 overflow-y-auto">
      <table className="w-full text-left text-xs border-collapse">
       <thead className="sticky top-0 bg-slate-100 text-slate-600 font-bold border-b border-slate-200 shadow-2xs z-10 text-[11px]">
        <tr>
         <th className="py-2.5 px-3">西暦/年齢</th>
         <th className="py-2.5 px-2">手取収入計</th>
         <th className="py-2.5 px-2">住居固定費</th>
         <th className="py-2.5 px-2">基本生活費</th>
         <th className="py-2.5 px-2">娯楽費(B2)</th>
         <th className="py-2.5 px-2">特別支出等</th>
         <th className="py-2.5 px-2">支出計</th>
         <th className="py-2.5 px-2">年間収支</th>
         <th className="py-2.5 px-2 text-indigo-900 font-bold">運用資産（簡易）</th>
         <th className="py-2.5 px-2">余剰預貯金</th>
         <th className="py-2.5 px-2">生活用現金</th>
         <th className="py-2.5 px-2">医療・介護用</th>
         <th className="py-2.5 px-3 font-black text-slate-900">3バケット合計</th>
        </tr>
       </thead>
       <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
        {timeline.map((row) => {
         const isBoundary = row.isTransitionToSingle;

         return (
          <React.Fragment key={row.age}>
           {isBoundary && (
            <tr className="bg-rose-100/90 text-rose-950 font-sans border-y-2 border-rose-400">
             <td colSpan={13} className="py-2 px-4 font-bold text-center">
              🕊️ 【単身世帯へ移行】 {row.firstPassingPersonName}が他界し、{row.survivorPersonName}の単身世帯へ。生活費が75%に圧縮されます
             </td>
            </tr>
           )}
           <tr
            className={`transition-colors ${
             row.isDeficit
              ? 'bg-rose-100/90 text-rose-950 font-bold'
              : row.age === 65 || row.age === 70 || row.age === 75
              ? 'bg-amber-50/50 hover:bg-slate-50'
              : 'hover:bg-slate-50'
            }`}
           >
            <td className="py-2 px-3 font-sans font-bold flex items-center gap-1">
             <span>{row.year}年</span>
             <span className="text-slate-800">({row.age}歳)</span>
             {row.eventLabel && (
              <span className="text-[9px] bg-slate-800 text-white px-1.5 py-0.2 rounded font-normal">
               {row.eventLabel}
              </span>
             )}
            </td>
            <td className="py-2 px-2 text-slate-900 font-bold">
             {row.totalNetIncome}万
            </td>
            <td className="py-2 px-2 text-slate-600">{row.housingExpense}万</td>
            <td className="py-2 px-2 text-slate-600">{row.baseLivingExpense}万</td>
            <td className="py-2 px-2 text-sky-700">
             {row.activeLeisureExpense + row.largeLeisureExpense}万
            </td>
            <td className="py-2 px-2 text-slate-600">
             {row.specialPeriodExpense + row.unforeseenExpense}万
            </td>
            <td className="py-2 px-2 text-slate-800 font-bold">{row.totalExpense}万</td>
            <td
             className={`py-2 px-2 font-bold ${
              row.annualCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-600'
             }`}
            >
             {row.annualCashFlow >= 0 ? `+${row.annualCashFlow}` : row.annualCashFlow}万
            </td>
            <td
             className={`py-2 px-2 font-black ${
              row.bucket2Balance >= 0 ? 'text-indigo-700' : 'text-rose-700 bg-rose-200/80 px-1 rounded'
             }`}
            >
             {row.bucket2Balance}万
            </td>
            <td className="py-2 px-2 text-amber-800">{row.surplusCashBalance}万</td>
            <td className="py-2 px-2 text-emerald-800">{row.bucket1Balance}万</td>
            <td className="py-2 px-2 text-slate-600">{row.bucket3Balance}万</td>
            <td className="py-2 px-3 font-black text-slate-900">{row.totalAssets}万</td>
           </tr>
          </React.Fragment>
         );
        })}
       </tbody>
      </table>
     </div>
    </div>
   )}

   <Suspense fallback={<div className="rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-500">候補比較を読み込み中...</div>}>
    <OptimizationPanel
     state={state}
     onApply={(candidate: OptimizationCandidate) =>
      onChange((previous) => ({
       ...candidate.state,
       currentStep: previous.currentStep,
       optimization: previous.optimization,
      }))
     }
    />
   </Suspense>

   <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-sm space-y-3">
    <div className="flex items-center justify-between">
     <span className="text-sm font-black flex items-center gap-1.5 text-sky-300">
      <Sparkles className="w-4 h-4 text-amber-400" />
      ライフプランを改善する4つの調整ポイント
     </span>
     <span className="text-[11px] text-slate-400">左カラムで動かしてリアルタイム検証</span>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
     <div className="bg-slate-800/80 border border-slate-700 p-2.5 rounded-xl space-y-1">
      <span className="font-bold text-sky-300 block">① 就労の延伸</span>
      <p className="text-[11px] text-slate-300 leading-snug">
       65〜70歳で月10〜15万円働くことで、取り崩しの開始を5年間先送りし、資産寿命を半永久化。
      </p>
     </div>
     <div className="bg-slate-800/80 border border-slate-700 p-2.5 rounded-xl space-y-1">
      <span className="font-bold text-sky-300 block">② 年金受給開始の調整</span>
      <p className="text-[11px] text-slate-300 leading-snug">
       手元資金が薄い場合は無理に繰り下げず65歳から受給開始し、キャッシュの枯渇を防止。
      </p>
     </div>
     <div className="bg-slate-800/80 border border-slate-700 p-2.5 rounded-xl space-y-1">
      <span className="font-bold text-sky-300 block">③ 娯楽予算の伸縮</span>
      <p className="text-[11px] text-slate-300 leading-snug">
       バケット2（娯楽費）を定率4%以内で調整し、相場下落時は自然に節制して元本を保護。
      </p>
     </div>
     <div className="bg-slate-800/80 border border-slate-700 p-2.5 rounded-xl space-y-1">
      <span className="font-bold text-slate-800 block">④ 住まいの最適化</span>
      <p className="text-[11px] text-slate-300 leading-snug">
       持ち家の売却手取り（1,000万〜2,000万円）を将来バケット2へ合流させて一気に黒字化。
      </p>
     </div>
    </div>
   </div>
  </div>
 );
};