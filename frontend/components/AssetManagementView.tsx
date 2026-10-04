import React, { useState } from 'react';
import { SimulatorState } from '../types';
import { buildAssetManagementTimeline } from '../assetCalculator';
import {
 TrendingUp,
 BarChart3,
 Table,
 CheckCircle2,
 AlertTriangle,
 ArrowRightLeft,
 Sparkles,
 ArrowDownRight,
 ArrowUpRight,
 MousePointer,
 Layers
} from 'lucide-react';

interface AssetManagementViewProps {
 state: SimulatorState;
 onChange: (updater: (prev: SimulatorState) => SimulatorState) => void;
}

export const AssetManagementView: React.FC<AssetManagementViewProps> = ({ state, onChange }) => {
 const [displayMode, setDisplayMode] = useState<'both' | 'chart' | 'table'>('both');
 const [hoveredAge, setHoveredAge] = useState<number | null>(null);
 const [showDetailedBreakdown, setShowDetailedBreakdown] = useState<boolean>(false);

 const isCouple = state.householdType === 'couple';
 const cfg = state.lifePlan;

 const timeline = buildAssetManagementTimeline(state);
 const comparisonTimeline = buildAssetManagementTimeline(state, !cfg.limitToNisaCap);

 const currentAt100 = timeline.find((r) => r.age === 100) || timeline[timeline.length - 1];
 const compAt100 = comparisonTimeline.find((r) => r.age === 100) || comparisonTimeline[comparisonTimeline.length - 1];

 const firstDepletedRecord = timeline.find((r) => r.isDepleted || r.totalNetAssets <= 0);
 const transitionRecord = timeline.find((r) => r.isTransitionToSingle);
 const activeRecord = timeline.find((r) => r.age === (hoveredAge ?? 100)) || currentAt100;
 const maxNetAssets = Math.max(...timeline.map((r) => Math.max(0, r.totalNetAssets)), 4000);

 return (
  <div className="space-y-5 animate-fadeIn w-full">
   <div
    className={`p-4 sm:p-5 rounded-2xl border shadow-xs transition-all ${
     !firstDepletedRecord && currentAt100.totalNetAssets > 0
      ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-emerald-300 text-emerald-950'
      : 'bg-gradient-to-r from-rose-50 via-amber-50 to-white border-rose-300 text-rose-950'
    }`}
   >
    <div className="flex flex-wrap items-center justify-between gap-4">
     <div className="space-y-1">
      <div className="flex items-center gap-2">
       <span
        className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-2xs ${
         !firstDepletedRecord && currentAt100.totalNetAssets > 0
          ? 'bg-emerald-600 text-white'
          : 'bg-rose-600 text-white'
        }`}
       >
        {!firstDepletedRecord && currentAt100.totalNetAssets > 0 ? (
         <>
          <CheckCircle2 className="w-4 h-4" />
          【合格】100歳まで資産枯渇ゼロ！
         </>
        ) : (
         <>
          <AlertTriangle className="w-4 h-4" />
          【警告】{firstDepletedRecord ? `${firstDepletedRecord.age}歳` : '高齢期'}で金融資産が完全枯渇
         </>
        )}
       </span>
       <span className="text-xs font-bold text-slate-600">
        第３ステップ：資産運用＆取り崩し順序最適化
       </span>
      </div>

      <p className="text-xs text-slate-700 leading-relaxed pt-1">
       {!firstDepletedRecord && currentAt100.totalNetAssets > 0 ? (
        <>
         100歳時点でNISA残高{' '}
         <strong className="font-mono text-emerald-700 text-sm">
          {currentAt100.nisaBalance}万円
         </strong>{' '}
         が残る見込みです。第2ステップの年ごとの収入・支出を引き継ぎ、運用と取り崩し順を反映しています。
        </>
       ) : (
        <>
         {firstDepletedRecord?.age}歳時点で、預貯金・運用口座・医療介護用に確保した資金を使い切る見込みです。
         第2ステップの収入・支出を見直すか、左カラムで運用・取り崩し方針を調整してください。
        </>
       )}
      </p>
     </div>

     <div className="flex items-center gap-3 text-xs font-mono font-bold">
      <div className="bg-white/90 px-3 py-2 rounded-xl border border-slate-200 shadow-2xs text-center">
       <span className="text-[10px] text-slate-500 font-sans block">100歳時点 NISA残高</span>
       <span className="text-base font-black text-indigo-700">
        {currentAt100.nisaBalance}
        <span className="text-xs font-sans ml-0.5">万</span>
       </span>
      </div>
      <div className="bg-white/90 px-3 py-2 rounded-xl border border-slate-200 shadow-2xs text-center">
       <span className="text-[10px] text-slate-500 font-sans block">100歳時点 総金融資産</span>
       <span className="text-base font-black text-slate-900">
        {currentAt100.totalNetAssets}
        <span className="text-xs font-sans ml-0.5">万</span>
       </span>
      </div>
     </div>
    </div>
   </div>

   <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 pb-2.5">
     <div className="flex items-center gap-2">
      <Sparkles className="w-4 h-4 text-amber-400" />
      <h4 className="font-extrabold text-sm text-slate-100">
       【比較シミュレーター】NISA枠限定 vs 特定口座フル活用
      </h4>
     </div>

     <button
      type="button"
      onClick={() =>
       onChange((prev) => ({
        ...prev,
        lifePlan: {
         ...prev.lifePlan,
         limitToNisaCap: !prev.lifePlan.limitToNisaCap,
        },
       }))
      }
      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
     >
      <ArrowRightLeft className="w-3.5 h-3.5" />
      <span>ポリシーを切り替えて比較する（現在: {cfg.limitToNisaCap ? 'NISA限定' : '特定口座併用'}）</span>
     </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
     <div
      className={`p-3 rounded-xl border transition-all ${
       cfg.limitToNisaCap
        ? 'bg-slate-800 border-sky-400 ring-2 ring-sky-400/50'
        : 'bg-slate-800/60 border-slate-700 opacity-75'
      }`}
     >
      <div className="flex items-center justify-between mb-1.5">
       <span className="font-bold text-sky-300 flex items-center gap-1">
        {cfg.limitToNisaCap && <span className="w-2 h-2 rounded-full bg-sky-400"></span>}
        方針A：運用をNISA枠に限定
       </span>
       <span className="text-[10px] text-slate-400 font-mono">余剰金は現金キープ</span>
      </div>
      <div className="space-y-1 text-slate-300">
       <div className="flex justify-between font-mono">
        <span>100歳時点 総資産:</span>
        <strong className="text-white text-sm">
         {cfg.limitToNisaCap ? currentAt100.totalNetAssets : compAt100.totalNetAssets}万円
        </strong>
       </div>
       <p className="text-[10px] text-slate-400 leading-snug pt-0.5">
        特長：特定口座の運用益課税や社会保険料跳ね上がりリスクを完全遮断。ただし長期のインフレヘッジ余力はやや限定的。
       </p>
      </div>
     </div>

     <div
      className={`p-3 rounded-xl border transition-all ${
       !cfg.limitToNisaCap
        ? 'bg-slate-800 border-indigo-400 ring-2 ring-indigo-400/50'
        : 'bg-slate-800/60 border-slate-700 opacity-75'
      }`}
     >
      <div className="flex items-center justify-between mb-1.5">
       <span className="font-bold text-indigo-300 flex items-center gap-1">
        {!cfg.limitToNisaCap && <span className="w-2 h-2 rounded-full bg-indigo-400"></span>}
        方針B：特定口座（源泉あり）もフル活用
       </span>
       <span className="text-[10px] text-slate-400 font-mono">余剰金を全額投資</span>
      </div>
      <div className="space-y-1 text-slate-300">
       <div className="flex justify-between font-mono">
        <span>100歳時点 総資産:</span>
        <strong className="text-white text-sm">
         {!cfg.limitToNisaCap ? currentAt100.totalNetAssets : compAt100.totalNetAssets}万円
        </strong>
       </div>
       <p className="text-[10px] text-slate-400 leading-snug pt-0.5">
        特長：NISA枠を超える余剰金も特定口座で運用します。特定口座の商品をNISAへそのまま移すことはできません。
       </p>
      </div>
     </div>
    </div>
   </div>

   <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
    <div className="flex items-center gap-2">
     <BarChart3 className="w-4 h-4 text-indigo-600" />
     <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">
      資産の運用・取り崩し見込み（第2ステップの収支を反映）
     </h3>
    </div>

    <div className="flex items-center gap-2">
     <button
      type="button"
      onClick={() => setShowDetailedBreakdown(!showDetailedBreakdown)}
      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shadow-2xs ${
       showDetailedBreakdown
        ? 'bg-indigo-600 text-white border-indigo-600'
        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
      }`}
     >
      <Layers className="w-3.5 h-3.5" />
      <span>{showDetailedBreakdown ? 'バケット2：詳細表示中' : 'バケット2：簡易表示中'}</span>
     </button>

     <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
      <button
       onClick={() => setDisplayMode('both')}
       className={`px-3 py-1.5 rounded-lg transition ${
        displayMode === 'both' ? 'bg-white shadow text-indigo-700' : 'hover:text-slate-900'
       }`}
      >
       グラフ＋表
      </button>
      <button
       onClick={() => setDisplayMode('chart')}
       className={`px-3 py-1.5 rounded-lg transition ${
        displayMode === 'chart' ? 'bg-white shadow text-indigo-700' : 'hover:text-slate-900'
       }`}
      >
       グラフ中心
      </button>
      <button
       onClick={() => setDisplayMode('table')}
       className={`px-3 py-1.5 rounded-lg transition ${
        displayMode === 'table' ? 'bg-white shadow text-indigo-700' : 'hover:text-slate-900'
       }`}
      >
       全年次表
      </button>
     </div>
    </div>
   </div>

   {(displayMode === 'both' || displayMode === 'chart') && (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
     <div className="flex items-center justify-between border-b pb-2 flex-wrap gap-2 text-xs">
      <span className="font-bold text-slate-700 flex items-center gap-1">
       <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
       資産口座別 残高推移スタックグラフ
      </span>
      <div className="flex items-center gap-3 text-[11px] font-semibold flex-wrap">
       <span className="flex items-center gap-1 text-indigo-700">
        <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600"></span>NISA口座（非課税）
       </span>
       <span className="flex items-center gap-1 text-sky-700">
        <span className="w-2.5 h-2.5 rounded-sm bg-sky-400"></span>特定口座（課税・源泉有）
       </span>
       <span className="flex items-center gap-1 text-amber-700">
        <span className="w-2.5 h-2.5 rounded-sm bg-amber-400"></span>余剰現金（預貯金）
       </span>
       <span className="flex items-center gap-1 text-emerald-700">
        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>B1生活現金
       </span>
       <span className="flex items-center gap-1 text-slate-500">
        <span className="w-2.5 h-2.5 rounded-sm bg-slate-400"></span>B3防衛資金
       </span>
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

      <div className="flex gap-2 items-start rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs text-sky-950">
       <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-sm bg-rose-500" />
       <p className="leading-relaxed">
        <strong>この画面の赤:</strong> 現金・特定口座・NISAを取り崩した後、確保資金も含めて総資産が0になる年です。第2ステップの赤（運用資産だけで見た不足）とは意味が異なります。
       </p>
      </div>
        <div className="flex items-center gap-2">
         <span className="text-slate-400">総金融資産:</span>
         <span className="text-sm font-black font-mono text-white">
          {activeRecord.totalNetAssets}万円
         </span>
         <span className="text-indigo-300 font-mono text-[11px]">
          (NISA: {activeRecord.nisaBalance}万 / 特定: {activeRecord.taxableBalance}万 / 余剰現金: {activeRecord.surplusCashBalance}万)
         </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-300 mt-0.5">
         <span className={activeRecord.annualCashFlow >= 0 ? 'text-emerald-400 font-mono font-bold' : 'text-rose-400 font-mono font-bold'}>
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

      <span className="text-[11px] text-slate-400">
       ※カーソルを合わせると該当年の詳細内訳が切り替わります
      </span>
     </div>

     {showDetailedBreakdown && (
      <div className="bg-indigo-50/80 border border-indigo-200 p-3 rounded-xl text-xs space-y-1.5 font-mono">
       <div className="font-bold text-indigo-950 font-sans flex items-center gap-1 mb-1">
        <Layers className="w-3.5 h-3.5 text-indigo-600" />
        <span>【バケット2 (運用資産) の詳細内訳 — {activeRecord.age}歳時点】</span>
       </div>
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white p-2.5 rounded-lg border border-indigo-200 space-y-1">
         <span className="font-bold text-sky-900 block font-sans">👤 {state.primary.name} 運用内訳</span>
         <div className="flex justify-between">
          <span className="text-slate-600">NISA入金額 (元本):</span>
          <span className="font-bold">{activeRecord.primaryNisaPrincipal} 万</span>
         </div>
         <div className="flex justify-between">
          <span className="text-slate-600">NISA運用益 (非課税):</span>
          <span className="font-bold text-indigo-700">+{activeRecord.primaryNisaProfit} 万</span>
         </div>
         <div className="flex justify-between">
          <span className="text-slate-600">特定口座入金額 (元本):</span>
          <span className="font-bold">{activeRecord.primaryTaxablePrincipal} 万</span>
         </div>
         <div className="flex justify-between">
          <span className="text-slate-600">特定口座運用益:</span>
          <span className="font-bold text-sky-700">+{activeRecord.primaryTaxableProfit} 万</span>
         </div>
        </div>

        {isCouple && (
         <div className="bg-white p-2.5 rounded-lg border border-rose-200 space-y-1">
          <span className="font-bold text-rose-900 block font-sans">👥 {state.spouse.name} 運用内訳</span>
          <div className="flex justify-between">
           <span className="text-slate-600">NISA入金額 (元本):</span>
           <span className="font-bold">{activeRecord.spouseNisaPrincipal} 万</span>
          </div>
          <div className="flex justify-between">
           <span className="text-slate-600">NISA運用益 (非課税):</span>
           <span className="font-bold text-indigo-700">+{activeRecord.spouseNisaProfit} 万</span>
          </div>
          <div className="flex justify-between">
           <span className="text-slate-600">特定口座入金額 (元本):</span>
           <span className="font-bold">{activeRecord.spouseTaxablePrincipal} 万</span>
          </div>
          <div className="flex justify-between">
           <span className="text-slate-600">特定口座運用益:</span>
           <span className="font-bold text-sky-700">+{activeRecord.spouseTaxableProfit} 万</span>
          </div>
         </div>
        )}
       </div>
      </div>
     )}

     <div className="relative pt-24 pb-3 overflow-x-auto w-full">
      <div className="flex items-end gap-1 sm:gap-1.5 min-w-[720px] h-60 px-2 border-b border-slate-300 relative">
       <div className="absolute left-0 right-0 border-t border-slate-400 bottom-6 pointer-events-none z-10"></div>

       {timeline.map((item) => {
        const isHovered = item.age === hoveredAge;
        const isPassingTransition = item.isTransitionToSingle;

        const b1H = Math.max(0, Math.min(30, (item.bucket1Balance / maxNetAssets) * 160));
        const b3H = Math.max(0, Math.min(30, (item.bucket3Balance / maxNetAssets) * 160));
        const cashH = Math.max(0, Math.min(30, (item.surplusCashBalance / maxNetAssets) * 160));
        const taxH = Math.max(0, Math.min(40, (item.taxableBalance / maxNetAssets) * 160));
        const nisaH = Math.max(0, Math.min(100, (item.nisaBalance / maxNetAssets) * 160));

        return (
         <div
          key={item.age}
          onMouseEnter={() => setHoveredAge(item.age)}
          className={`flex-1 flex flex-col items-center justify-end h-full cursor-pointer group relative ${
           isPassingTransition ? 'border-l-2 border-rose-500 pl-0.5' : ''
          }`}
         >
          {isPassingTransition && (
           <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-[9px] bg-rose-600 text-white font-extrabold px-1.5 py-0.5 rounded shadow-md z-20 whitespace-nowrap animate-pulse">
            🕊️ {item.firstPassingPersonName}他界（相続資産を課税口座へ）
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
           <span className="text-indigo-300 font-mono">
            NISA:{item.nisaBalance}万 / 特定:{item.taxableBalance}万 / 余剰現金:{item.surplusCashBalance}万
           </span>
           <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-r border-b border-slate-700/80 rotate-45"></span>
          </div>

          <div className="w-full flex flex-col justify-end overflow-hidden">
           {item.isDepleted ? (
            <div
             style={{ height: '20px' }}
             className="w-full bg-rose-600 rounded-b-sm animate-pulse"
             title="資産枯渇"
            ></div>
           ) : (
            <>
             <div
              style={{ height: `${nisaH}px` }}
              className={`w-full rounded-t-sm transition-colors ${
               isHovered ? 'bg-indigo-400 brightness-110' : 'bg-indigo-600 group-hover:bg-indigo-500'
              }`}
              title={`NISA: ${item.nisaBalance}万`}
             ></div>
             <div
              style={{ height: `${taxH}px` }}
              className="w-full bg-sky-400"
              title={`特定口座: ${item.taxableBalance}万`}
             ></div>
             <div
              style={{ height: `${cashH}px` }}
              className="w-full bg-amber-400"
              title={`余剰現金(預貯金): ${item.surplusCashBalance}万`}
             ></div>
             <div
              style={{ height: `${b1H}px` }}
              className="w-full bg-emerald-500"
              title={`B1生活現金: ${item.bucket1Balance}万`}
             ></div>
             <div
              style={{ height: `${b3H}px` }}
              className="w-full bg-slate-400"
              title={`B3医療介護: ${item.bucket3Balance}万`}
             ></div>
            </>
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
   )}

   {(displayMode === 'both' || displayMode === 'table') && (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden w-full">
     <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
      <div className="flex items-center gap-2 font-bold text-slate-800">
       <Table className="w-4 h-4 text-indigo-600" />
       <span>100歳までの資産運用・投資・取り崩し詳細完全一覧表</span>
      </div>
      <span className="text-[11px] text-slate-500">
      ※売却時税額は譲渡益への20.315%を用いた概算です。損益通算・手数料・相続税は含みません。
      </span>
     </div>

     <div className="max-h-96 overflow-y-auto">
      <table className="w-full text-left text-xs border-collapse">
       <thead className="sticky top-0 bg-slate-100 text-slate-600 font-bold border-b border-slate-200 shadow-2xs z-10 text-[11px]">
        <tr>
         <th className="py-2.5 px-3">西暦/年齢</th>
         <th className="py-2.5 px-2">手取収入</th>
         <th className="py-2.5 px-2">支出計</th>
         <th className="py-2.5 px-2">年間収支</th>
         <th className="py-2.5 px-2">売却時税額</th>
         <th className="py-2.5 px-2 text-indigo-900 font-bold">NISA残高</th>
         <th className="py-2.5 px-2">特定口座残高</th>
         <th className="py-2.5 px-2">予備余剰現金</th>
         <th className="py-2.5 px-2">B1+B3温存</th>
         <th className="py-2.5 px-3 font-black text-slate-900">総金融資産</th>
        </tr>
       </thead>
       <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
        {timeline.map((row) => {
         const isBoundary = row.isTransitionToSingle;

         return (
          <React.Fragment key={row.age}>
           {isBoundary && (
            <tr className="bg-rose-100/90 text-rose-950 font-sans border-y-2 border-rose-400">
             <td colSpan={10} className="py-2 px-4 font-bold text-center">
              🕊️ 【配偶者他界・単身へ移行】 {row.firstPassingPersonName}が他界。故人のNISA資産は死亡日の評価額で相続人の課税口座に計上し、NISA枠は引き継ぎません。
             </td>
            </tr>
           )}
           <tr
            className={`transition-colors ${
             row.isDepleted
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
            <td className="py-2 px-2 text-slate-900">{row.totalNetIncome}万</td>
            <td className="py-2 px-2 text-slate-600">{row.totalExpense}万</td>
            <td
             className={`py-2 px-2 font-bold ${
              row.annualCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-600'
             }`}
            >
             {row.annualCashFlow >= 0 ? `+${row.annualCashFlow}` : row.annualCashFlow}万
            </td>
            <td className="py-2 px-2 text-rose-700">{row.taxableSaleTax}万</td>

            <td className="py-2 px-2 font-bold text-indigo-700">
             {row.nisaBalance}万
            </td>
            <td className="py-2 px-2 text-slate-700">
             {row.taxableBalance}万
             {row.inheritedTransferredToTaxable ? (
              <span className="text-[9px] text-rose-600 block font-sans">
               (相続資産を課税口座に計上:+{row.inheritedTransferredToTaxable}万)
              </span>
             ) : null}
            </td>
            <td className="py-2 px-2 text-slate-700">{row.surplusCashBalance}万</td>
            <td className="py-2 px-2 text-emerald-800">
             {row.bucket1Balance + row.bucket3Balance}万
            </td>
            <td className="py-2 px-3 font-black text-slate-900">{row.totalNetAssets}万</td>
           </tr>
          </React.Fragment>
         );
        })}
       </tbody>
      </table>
     </div>
    </div>
   )}

   <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
     <Sparkles className="w-4 h-4 text-amber-500" />
     『完全マニュアル』直伝！第3ステップ運用の3大セオリー
    </h4>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
     <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
      <span className="font-bold text-slate-900 block">① 夫婦均等な余剰金配分</span>
      <p className="text-slate-600 leading-relaxed text-[11px]">
       預貯金の余剰分や毎年の黒字キャッシュフローは夫婦双方へ均等にNISA・特定口座へ配分され、非課税メリットを最大限に享受します。
      </p>
     </div>

     <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
      <span className="font-bold text-slate-900 block">② 配偶者他界時の相続</span>
      <p className="text-slate-600 leading-relaxed text-[11px]">
       故人のNISA商品は相続人のNISAには移せません。死亡日の終値相当額を取得価額として課税口座に計上します。相続税そのものはこの試算の対象外です。
      </p>
     </div>

     <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
      <span className="font-bold text-slate-900 block">③ バケット防衛の完封</span>
      <p className="text-slate-600 leading-relaxed text-[11px]">
       退職初期に相場が暴落しても、バケット1（生活現金）とバケット3（医療介護）が元本保証で待機し暴落時の破綻を防ぎます。
      </p>
     </div>
    </div>
   </div>
  </div>
 );
};