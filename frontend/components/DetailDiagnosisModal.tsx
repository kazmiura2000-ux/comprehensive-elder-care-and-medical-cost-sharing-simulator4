import React, { useState, useMemo } from 'react';
import { MatrixCellData, SimulatorState, HouseholdType } from '../types';
import { evaluatePersonSituation } from '../calculator';
import { X, ArrowRight, Gauge, Sliders } from 'lucide-react';

interface DetailDiagnosisModalProps {
 cell: MatrixCellData;
 state: SimulatorState;
 onClose: () => void;
 onApplyGlobal: (pensionAge: number, rehireSalaryDelta: number) => void;
 onHouseholdChange: (type: HouseholdType) => void;
}

export const DetailDiagnosisModal: React.FC<DetailDiagnosisModalProps> = ({
 cell,
 state,
 onClose,
 onApplyGlobal,
 onHouseholdChange,
}) => {
 const [localPensionAge, setLocalPensionAge] = useState(cell.pensionStartAge);
 const [localSalaryDelta, setLocalSalaryDelta] = useState(0);

 const isCouple = state.householdType === 'couple';

 const roleKey =
  state.householdType === 'single'
   ? 'primary'
   : state.perspective === 'spouse'
   ? 'spouse'
   : 'primary';

 const otherRoleKey = roleKey === 'primary' ? 'spouse' : 'primary';

 const currentResult = useMemo(() => {
  const subjectProfile = {
   ...state[roleKey],
   pensionStartAge: localPensionAge,
  };

  const baseRehireSalary = state[roleKey].rehireMonthlySalary;
  const adjustedRehireSalary = Math.max(0, baseRehireSalary + localSalaryDelta);

  let scaleModifier = cell.rowOffset === 1 ? 1.5 : cell.rowOffset === -1 ? 0.0 : 1.0;

  if (localSalaryDelta !== 0) {
   subjectProfile.rehireMonthlySalary = adjustedRehireSalary;
   scaleModifier = 1.0;
  }

  const otherProfile = state.householdType === 'single' ? null : state[otherRoleKey];

  const primaryTotalMonthsNow = state.primary.ageYears * 12 + state.primary.ageMonths;
  const spouseTotalMonthsNow = state.spouse.ageYears * 12 + state.spouse.ageMonths;
  const monthsDiff = spouseTotalMonthsNow - primaryTotalMonthsNow;

  const primaryTargetMonths = state.targetAgeYears * 12 + state.primary.ageMonths;
  const spouseTargetMonths = primaryTargetMonths + monthsDiff;

  const subjectAgeMonthsTotal = roleKey === 'primary' ? primaryTargetMonths : spouseTargetMonths;
  const otherAgeMonthsTotal = state.householdType === 'single' ? null : roleKey === 'primary' ? spouseTargetMonths : primaryTargetMonths;

  return evaluatePersonSituation(
   subjectProfile,
   subjectAgeMonthsTotal,
   otherProfile,
   otherAgeMonthsTotal,
   state.householdType === 'single',
   localPensionAge,
   scaleModifier
  );
 }, [state, roleKey, otherRoleKey, localPensionAge, localSalaryDelta, cell.rowOffset]);

 const res = currentResult;

 const getProgressPercentage = (current: number, target: number) => {
  const ratio = (current / target) * 100;
  return Math.min(100, Math.max(0, ratio));
 };

 return (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
   <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
    <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50">
     <div className="flex items-center gap-3">
      <span
       className={`px-3 py-1 rounded-full text-xs font-extrabold ${
        res.zone === 'A'
         ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
         : res.zone === 'B'
         ? 'bg-blue-100 text-blue-800 border border-blue-300'
         : 'bg-rose-100 text-rose-800 border border-rose-300'
       }`}
      >
       ゾーン{res.zone} 詳細診断
      </span>
      <h2 className="text-lg font-black text-slate-800">
       判定年収 {res.householdGrossAnnual}万円【額面】の精密レポート
      </h2>
     </div>
     <button
      onClick={onClose}
      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
     >
      <X className="w-5 h-5" />
     </button>
    </div>

    <div className="overflow-y-auto p-5 sm:p-6 space-y-6 text-sm">
     <div className="flex items-center justify-between p-3 bg-slate-100 rounded-xl">
      <span className="text-xs font-bold text-slate-600">世帯構成の即時シミュレーション切替:</span>
      <div className="flex gap-2">
       {(['single', 'couple'] as HouseholdType[]).map((t) => (
        <button
         key={t}
         onClick={() => onHouseholdChange(t)}
         className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
          state.householdType === t
           ? 'bg-sky-600 text-white shadow'
           : 'bg-white text-slate-600 hover:bg-slate-200'
         }`}
        >
         {t === 'single' ? '単身世帯' : '夫婦世帯'}
        </button>
       ))}
      </div>
     </div>

     <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
      <div>
       <span className="text-xs font-bold text-slate-600 block">実質生活費手取り概算（月額）:</span>
       <div className="flex items-center gap-3 mt-1 flex-wrap">
        <span className="text-sm font-bold text-slate-800">
         個人手取り: <strong className="text-base font-mono text-slate-900">{res.netDisposableIncomeMonthly} 万円/月</strong>
        </span>
        {isCouple && !res.isSpouseDeceased && (
         <span className="text-sm font-extrabold text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-lg border border-sky-300">
          世帯合計手取り: {res.householdNetDisposableIncomeMonthly} 万円/月
         </span>
        )}
        {res.survivorPensionMonthly > 0 && (
         <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
          うち遺族年金: +{res.survivorPensionMonthly}万/月【非課税】
         </span>
        )}
       </div>
      </div>
      <span className="text-[11px] text-slate-500">
       ※老齢年金・就労給与の税社保天引き後概算＋遺族年金（非課税）
      </span>
     </div>

     <div>
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
       <Gauge className="w-4 h-4 text-sky-600" />
       制度の3大「壁」までの距離メーター
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
       <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
        <div>
         <div className="flex justify-between items-center text-xs font-bold mb-1">
          <span className="text-slate-700">① 住民税非課税の壁</span>
          <span className="text-emerald-700">
           {state.householdType === 'single' || res.isSpouseDeceased ? '155万円' : '211万円'}
          </span>
         </div>
         <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden my-2">
          <div
           className={`h-full rounded-full transition-all duration-300 ${
            res.isTaxFree ? 'bg-emerald-500' : 'bg-rose-500'
           }`}
           style={{
            width: `${getProgressPercentage(
             res.householdGrossAnnual,
             state.householdType === 'single' || res.isSpouseDeceased ? 155 : 211
            )}%`,
           }}
          ></div>
         </div>
        </div>
        <div className="text-xs mt-1">
         {res.taxFreeWallMargin >= 0 ? (
          <span className="text-emerald-700 font-bold">
           ◎ あと {res.taxFreeWallMargin}万円 の年収余裕あり
          </span>
         ) : (
          <span className="text-rose-600 font-bold">
           × {Math.abs(res.taxFreeWallMargin)}万円 超過（課税扱い）
          </span>
         )}
        </div>
       </div>

       <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
        <div>
         <div className="flex justify-between items-center text-xs font-bold mb-1">
          <span className="text-slate-700">② 介護2割負担の壁</span>
          <span className="text-blue-700">
           {state.householdType === 'single' || res.isSpouseDeceased ? '280万円' : '346万円'}
          </span>
         </div>
         <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden my-2">
          <div
           className={`h-full rounded-full transition-all duration-300 ${
            res.care20WallMargin >= 0 ? 'bg-blue-500' : 'bg-amber-500'
           }`}
           style={{
            width: `${getProgressPercentage(
             res.householdGrossAnnual,
             state.householdType === 'single' || res.isSpouseDeceased ? 280 : 346
            )}%`,
           }}
          ></div>
         </div>
        </div>
        <div className="text-xs mt-1">
         {res.care20WallMargin >= 0 ? (
          <span className="text-blue-700 font-bold">
           ◎ 1割負担維持中（あと {res.care20WallMargin}万円）
          </span>
         ) : (
          <span className="text-amber-700 font-bold">
           ⚠️ 2〜3割負担に突入中
          </span>
         )}
        </div>
       </div>

       <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
        <div>
         <div className="flex justify-between items-center text-xs font-bold mb-1">
          <span className="text-slate-700">③ 医療現役3割の壁</span>
          <span className="text-purple-700">
           {state.householdType === 'single' || res.isSpouseDeceased ? '383万円' : '520万円'}
          </span>
         </div>
         <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden my-2">
          <div
           className={`h-full rounded-full transition-all duration-300 ${
            res.medical30WallMargin >= 0 ? 'bg-purple-500' : 'bg-rose-600'
           }`}
           style={{
            width: `${getProgressPercentage(
             res.householdGrossAnnual,
             state.householdType === 'single' || res.isSpouseDeceased ? 383 : 520
            )}%`,
           }}
          ></div>
         </div>
        </div>
        <div className="text-xs mt-1">
         {res.medical30WallMargin >= 0 ? (
          <span className="text-purple-700 font-bold">
           ◎ 3割負担回避（あと {res.medical30WallMargin}万円）
          </span>
         ) : (
          <span className="text-rose-700 font-bold">
           ⚠️ 現役並み所得（窓口3割負担）
          </span>
         )}
        </div>
       </div>
      </div>
     </div>

     {isCouple && (
      <div className="border border-slate-200 rounded-2xl p-4 bg-white">
       <h3 className="text-xs font-bold text-slate-700 mb-3 flex items-center justify-between">
        <span>夫婦並列 制度適用ステータス比較</span>
        <span className="text-[11px] text-slate-400">年齢差・寿命設定によるズレの可視化</span>
       </h3>
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/40">
         <div className="flex justify-between items-center font-bold text-sky-900 border-b border-sky-200 pb-1.5 mb-2">
          <span>👤 {state.primary.name}</span>
          <span className="text-xs bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-mono">
           判定時: {state.targetAgeYears}歳 (想定寿命: {state.primary.lifeExpectancyYears}歳)
          </span>
         </div>
         <div className="space-y-1 text-xs">
          <div className="flex justify-between">
           <span className="text-slate-600">受給年金【額面】:</span>
           <span className="font-mono font-bold text-slate-800">
            {roleKey === 'primary'
             ? res.pensionGrossMonthly
             : Math.round(state.primary.pensionAge65Monthly * 10) / 10}{' '}
            万円/月
           </span>
          </div>
          <div className="flex justify-between">
           <span className="text-slate-600">医療窓口負担:</span>
           <span className="font-bold text-slate-800">
            {state.targetAgeYears >= 75 ? '後期高齢者 (1〜2割)' : '前期高齢者 (2割)'}
           </span>
          </div>
          <div className="flex justify-between">
           <span className="text-slate-600">介護自己負担:</span>
           <span className="font-bold text-slate-800">{res.careInsuranceRate} 割</span>
          </div>
         </div>
        </div>

        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40">
         <div className="flex justify-between items-center font-bold text-rose-900 border-b border-rose-200 pb-1.5 mb-2">
          <span>👥 {state.spouse.name}</span>
          <span className="text-xs bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-mono">
           判定時: {Math.floor((state.targetAgeYears * 12 + state.spouse.ageYears * 12 + state.spouse.ageMonths - (state.primary.ageYears * 12 + state.primary.ageMonths)) / 12)}歳 (想定寿命: {state.spouse.lifeExpectancyYears}歳)
          </span>
         </div>
         <div className="space-y-1 text-xs">
          <div className="flex justify-between">
           <span className="text-slate-600">受給年金【額面】:</span>
           <span className="font-mono font-bold text-slate-800">
            {roleKey === 'spouse'
             ? res.pensionGrossMonthly
             : Math.round(state.spouse.pensionAge65Monthly * 10) / 10}{' '}
            万円/月
           </span>
          </div>
          <div className="flex justify-between">
           <span className="text-slate-600">医療窓口負担:</span>
           <span className="font-bold text-slate-800">
            {Math.floor((state.targetAgeYears * 12 + state.spouse.ageYears * 12 + state.spouse.ageMonths - (state.primary.ageYears * 12 + state.primary.ageMonths)) / 12) >= 70 ? '2割 (前期高齢者)' : '3割 (現役)'}
           </span>
          </div>
          <div className="flex justify-between">
           <span className="text-slate-600">介護自己負担:</span>
           <span className="font-bold text-slate-800">{res.careInsuranceRate} 割</span>
          </div>
         </div>
        </div>
       </div>
      </div>
     )}

     <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
      <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
       <span className="flex items-center gap-1.5">
        <Sliders className="w-4 h-4 text-sky-600" />
        このマスの条件をインライン微調整して全体へ反映
       </span>
       <span className="text-[11px] text-slate-500 font-normal">
        （ボタンを押すと上の手取りや3大壁メーターがリアルタイムに連動します）
       </span>
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
       <div>
        <label className="text-xs text-slate-600 font-semibold block mb-1">
         年金受給開始年齢:
        </label>
        <div className="flex items-center gap-2">
         <button
          onClick={() => setLocalPensionAge((prev) => Math.max(60, prev - 1))}
          className="px-2.5 py-1 bg-white border border-slate-300 rounded font-bold hover:bg-slate-100 transition shadow-2xs active:scale-95"
         >
          -1歳
         </button>
         <span className="font-mono font-bold text-base px-2 text-indigo-700 bg-white py-0.5 rounded border border-slate-300">
          {localPensionAge} 歳
         </span>
         <button
          onClick={() => setLocalPensionAge((prev) => Math.min(75, prev + 1))}
          className="px-2.5 py-1 bg-white border border-slate-300 rounded font-bold hover:bg-slate-100 transition shadow-2xs active:scale-95"
         >
          +1歳
         </button>
        </div>
       </div>

       <div>
        <label className="text-xs text-slate-600 font-semibold block mb-1">
         再雇用月給の微調整【額面】:
        </label>
        <div className="flex items-center gap-2">
         <button
          onClick={() => setLocalSalaryDelta((prev) => prev - 2)}
          className="px-2.5 py-1 bg-white border border-slate-300 rounded font-bold hover:bg-slate-100 transition shadow-2xs active:scale-95"
         >
          -2万円
         </button>
         <span className="font-mono font-bold text-base px-2 bg-white py-0.5 rounded border border-slate-300 text-slate-800">
          {localSalaryDelta >= 0 ? `+${localSalaryDelta}` : localSalaryDelta} 万円
          <span className="text-xs text-slate-500 font-normal ml-1">
           (月額{Math.max(0, state[roleKey].rehireMonthlySalary + localSalaryDelta)}万)
          </span>
         </span>
         <button
          onClick={() => setLocalSalaryDelta((prev) => prev + 2)}
          className="px-2.5 py-1 bg-white border border-slate-300 rounded font-bold hover:bg-slate-100 transition shadow-2xs active:scale-95"
         >
          +2万円
         </button>
        </div>
       </div>
      </div>
     </div>
    </div>

    <div className="flex items-center justify-between p-4 bg-slate-100 border-t border-slate-200">
     <button
      onClick={onClose}
      className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition"
     >
      閉じる
     </button>
     <button
      onClick={() => {
       onApplyGlobal(localPensionAge, localSalaryDelta);
       onClose();
      }}
      className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-2"
     >
      <span>微調整した条件を全体に反映する</span>
      <ArrowRight className="w-4 h-4" />
     </button>
    </div>
   </div>
  </div>
 );
};