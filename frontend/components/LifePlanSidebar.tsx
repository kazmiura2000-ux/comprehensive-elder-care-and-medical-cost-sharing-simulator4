import React, { useState } from 'react';
import {
 SimulatorState,
 PersonIncomeStrategy,
 PeriodItem,
 OneTimeItem,
 AdjustableRange,
 OptimizationSettings
} from '../types';
import { OPTIMIZATION_RANGE_LIMITS, validateOptimizationSettings } from '../optimizationSettings';
import { HelpTopic } from './HelpExplanationModal';
import {
 TrendingUp,
 Percent,
 Wallet,
 Home,
 Coffee,
 Plane,
 ChevronLeft,
 Plus,
 Trash2,
 HeartPulse,
 Sparkles,
 Clock,
 HelpCircle
} from 'lucide-react';

interface LifePlanSidebarProps {
 state: SimulatorState;
 onChange: (updater: (prev: SimulatorState) => SimulatorState) => void;
 isCollapsed?: boolean;
 onToggleCollapse?: () => void;
 onOpenHelp?: (topic: HelpTopic) => void;
}

export const LifePlanSidebar: React.FC<LifePlanSidebarProps> = ({
 state,
 onChange,
 onToggleCollapse,
 onOpenHelp,
}) => {
 const isCouple = state.householdType === 'couple';
 const cfg = state.lifePlan;
 const optimizationErrors = validateOptimizationSettings(state.optimization, state.householdType);

 const updateOptimization = (updates: Partial<OptimizationSettings>) => {
  onChange((prev) => ({
   ...prev,
   optimization: { ...prev.optimization, ...updates },
  }));
 };

 const updateOptimizationRange = (
  key: keyof OptimizationSettings['adjustableRanges'],
  updates: Partial<AdjustableRange>
 ) => {
  onChange((prev) => ({
   ...prev,
   optimization: {
    ...prev.optimization,
    adjustableRanges: {
     ...prev.optimization.adjustableRanges,
     [key]: { ...prev.optimization.adjustableRanges[key], ...updates },
    },
   },
  }));
 };

 const activeLeisureSum = cfg.activeLeisureAnnual.reduce((sum, item) => sum + item.annualAmount, 0);
 const largeLeisureSum = cfg.largeLeisureOneTimes.reduce((sum, item) => sum + item.amount, 0);

 const adjustableRangeRows: {
  key: keyof OptimizationSettings['adjustableRanges'];
  label: string;
  unit: string;
  currentValue?: number;
  currentValueText?: string;
  description?: string;
  visible: boolean;
 }[] = [
  {
   key: 'primaryCareerRetireAge',
   label: `${state.primary.name}の正職退職年齢`,
   unit: '歳',
   currentValue: cfg.primaryStrategy.careerRetireAge,
   description: `正職就労の延伸・短縮（手取り${cfg.primaryStrategy.careerNetIncomeAnnual}万円/年に連動）`,
   visible: true,
  },
  {
   key: 'primaryRehireRetireAge',
   label: `${state.primary.name}の再雇用終了年齢（再雇用期間）`,
   unit: '歳',
   currentValue: cfg.primaryStrategy.rehireRetireAge,
   currentValueText: `現在の再雇用: ${cfg.primaryStrategy.careerRetireAge}〜${cfg.primaryStrategy.rehireRetireAge}歳 (${Math.max(0, cfg.primaryStrategy.rehireRetireAge - cfg.primaryStrategy.careerRetireAge)}年間)`,
   description: `再雇用として働く終了年齢（手取り${cfg.primaryStrategy.rehireNetIncomeAnnual}万円/年に連動）`,
   visible: true,
  },
  {
   key: 'primaryPensionStartAge',
   label: `${state.primary.name}の年金開始年齢`,
   unit: '歳',
   currentValue: cfg.primaryStrategy.pensionStartAge,
   description: '繰下げで+0.7%/月増額、繰上げで-0.4%/月減額',
   visible: true,
  },
  {
   key: 'primaryRehireIncomeAnnual',
   label: `${state.primary.name}の再雇用手取り`,
   unit: '万円/年',
   currentValue: cfg.primaryStrategy.rehireNetIncomeAnnual,
   description: `再雇用期間(${cfg.primaryStrategy.careerRetireAge}〜${cfg.primaryStrategy.rehireRetireAge}歳)の年間手取り`,
   visible: true,
  },
  {
   key: 'spouseCareerRetireAge',
   label: `${state.spouse.name}の正職退職年齢`,
   unit: '歳',
   currentValue: cfg.spouseStrategy.careerRetireAge,
   description: `配偶者の正職就労期間（手取り${cfg.spouseStrategy.careerNetIncomeAnnual}万円/年に連動）`,
   visible: isCouple,
  },
  {
   key: 'spouseRehireRetireAge',
   label: `${state.spouse.name}の再雇用終了年齢（再雇用期間）`,
   unit: '歳',
   currentValue: cfg.spouseStrategy.rehireRetireAge,
   currentValueText: `現在の再雇用: ${cfg.spouseStrategy.careerRetireAge}〜${cfg.spouseStrategy.rehireRetireAge}歳 (${Math.max(0, cfg.spouseStrategy.rehireRetireAge - cfg.spouseStrategy.careerRetireAge)}年間)`,
   description: `配偶者再雇用として働く終了年齢（手取り${cfg.spouseStrategy.rehireNetIncomeAnnual}万円/年に連動）`,
   visible: isCouple,
  },
  {
   key: 'spousePensionStartAge',
   label: `${state.spouse.name}の年金開始年齢`,
   unit: '歳',
   currentValue: cfg.spouseStrategy.pensionStartAge,
   description: '繰下げで+0.7%/月増額、繰上げで-0.4%/月減額',
   visible: isCouple,
  },
  {
   key: 'spouseRehireIncomeAnnual',
   label: `${state.spouse.name}の再雇用手取り`,
   unit: '万円/年',
   currentValue: cfg.spouseStrategy.rehireNetIncomeAnnual,
   description: `配偶者再雇用期間(${cfg.spouseStrategy.careerRetireAge}〜${cfg.spouseStrategy.rehireRetireAge}歳)の年間手取り`,
   visible: isCouple,
  },
  {
   key: 'discretionaryExpenseReductionPercent',
   label: '裁量支出の削減率',
   unit: '%',
   description: 'アクティブ娯楽費・まとまった娯楽費が対象（住居費・生活費等は保護）',
   currentValueText: `現在の娯楽費: 年間${activeLeisureSum}万 / 単発計${largeLeisureSum}万`,
   visible: true,
  },
 ];

 const [roleTab, setRoleTab] = useState<'primary' | 'spouse'>('primary');

 const triggerHelp = (title: string, category: string, whatIsIt: string, howToInput: string, point: string, referenceValue?: string) => {
  if (onOpenHelp) {
   onOpenHelp({ title, category, whatIsIt, howToInput, point, referenceValue });
  }
 };

 const handleStrategyChange = <K extends keyof PersonIncomeStrategy>(
  role: 'primary' | 'spouse',
  key: K,
  val: PersonIncomeStrategy[K]
 ) => {
  onChange((prev) => {
   const updatedStrategy = {
    ...prev.lifePlan[role === 'primary' ? 'primaryStrategy' : 'spouseStrategy'],
    [key]: val,
   };

   const updatedPerson = { ...prev[role] };

   if (key === 'careerRetireAge') {
    updatedPerson.careerRetireAge = val as number;
   } else if (key === 'rehireRetireAge') {
    updatedPerson.rehireRetireAge = val as number;
   } else if (key === 'pensionStartAge') {
    updatedPerson.pensionStartAge = val as number;
   } else if (key === 'pensionAge65GrossAnnual') {
    const monthly = Math.round(((val as number) / 12) * 10) / 10;
    updatedPerson.pensionAge65Monthly = monthly;
    const currentTotal = updatedPerson.pensionBasicMonthly + updatedPerson.pensionEmployeesMonthly;
    if (currentTotal > 0) {
     const ratioBasic = updatedPerson.pensionBasicMonthly / currentTotal;
     updatedPerson.pensionBasicMonthly = Math.round(monthly * ratioBasic * 10) / 10;
     updatedPerson.pensionEmployeesMonthly = Math.round((monthly - updatedPerson.pensionBasicMonthly) * 10) / 10;
    } else {
     updatedPerson.pensionBasicMonthly = 6.8;
     updatedPerson.pensionEmployeesMonthly = Math.max(0, Math.round((monthly - 6.8) * 10) / 10);
    }
   }

   return {
    ...prev,
    [role]: updatedPerson,
    lifePlan: {
     ...prev.lifePlan,
     [role === 'primary' ? 'primaryStrategy' : 'spouseStrategy']: updatedStrategy,
    },
   };
  });
 };

 const handleLifeExpectancyChange = (role: 'primary' | 'spouse', value: number) => {
  onChange((prev) => ({
   ...prev,
   [role]: {
    ...prev[role],
    lifeExpectancyYears: value,
   },
  }));
 };

 const addTemporaryIncome = () => {
  const newItem: OneTimeItem = {
   id: `ti-${Date.now()}`,
   title: '臨時収入',
   age: 68,
   amount: 100,
  };
  onChange((prev) => ({
   ...prev,
   lifePlan: {
    ...prev.lifePlan,
    temporaryIncomes: [...(prev.lifePlan.temporaryIncomes || []), newItem],
   },
  }));
 };

 const removeTemporaryIncome = (id: string) => {
  onChange((prev) => ({
   ...prev,
   lifePlan: {
    ...prev.lifePlan,
    temporaryIncomes: (prev.lifePlan.temporaryIncomes || []).filter((i) => i.id !== id),
   },
  }));
 };

 const handlePeriodItemUpdate = (
  listKey: 'housingCosts' | 'baseLivingCosts' | 'activeLeisureAnnual' | 'specialPeriodExpenses',
  id: string,
  field: keyof PeriodItem,
  value: any
 ) => {
  onChange((prev) => ({
   ...prev,
   lifePlan: {
    ...prev.lifePlan,
    [listKey]: (prev.lifePlan[listKey] || []).map((item) =>
     item.id === id ? { ...item, [field]: value } : item
    ),
   },
  }));
 };

 const addPeriodItem = (
  listKey: 'housingCosts' | 'baseLivingCosts' | 'activeLeisureAnnual' | 'specialPeriodExpenses',
  defaultTitle: string,
  defaultAmount: number
 ) => {
  const newItem: PeriodItem = {
   id: `${listKey}-${Date.now()}`,
   title: defaultTitle,
   startAge: 65,
   endAge: 80,
   annualAmount: defaultAmount,
  };
  onChange((prev) => ({
   ...prev,
   lifePlan: {
    ...prev.lifePlan,
    [listKey]: [...(prev.lifePlan[listKey] || []), newItem],
   },
  }));
 };

 const removePeriodItem = (
  listKey: 'housingCosts' | 'baseLivingCosts' | 'activeLeisureAnnual' | 'specialPeriodExpenses',
  id: string
 ) => {
  onChange((prev) => ({
   ...prev,
   lifePlan: {
    ...prev.lifePlan,
    [listKey]: (prev.lifePlan[listKey] || []).filter((item) => item.id !== id),
   },
  }));
 };

 const handleOneTimeItemUpdate = (
  listKey: 'largeLeisureOneTimes',
  id: string,
  field: keyof OneTimeItem,
  value: any
 ) => {
  onChange((prev) => ({
   ...prev,
   lifePlan: {
    ...prev.lifePlan,
    [listKey]: (prev.lifePlan[listKey] || []).map((item) =>
     item.id === id ? { ...item, [field]: value } : item
    ),
   },
  }));
 };

 const addLargeLeisure = () => {
  const newItem: OneTimeItem = {
   id: `ll-${Date.now()}`,
   title: '記念旅行・まとまった買物',
   age: 70,
   amount: 100,
  };
  onChange((prev) => ({
   ...prev,
   lifePlan: {
    ...prev.lifePlan,
    largeLeisureOneTimes: [...(prev.lifePlan.largeLeisureOneTimes || []), newItem],
   },
  }));
 };

 const removeLargeLeisure = (id: string) => {
  onChange((prev) => ({
   ...prev,
   lifePlan: {
    ...prev.lifePlan,
    largeLeisureOneTimes: (prev.lifePlan.largeLeisureOneTimes || []).filter((i) => i.id !== id),
   },
  }));
 };

 const activeStrategy = roleTab === 'primary' ? cfg.primaryStrategy : cfg.spouseStrategy;

 return (
  <div className="bg-white border-r border-slate-200 h-full overflow-y-auto p-4 sm:p-5 flex flex-col gap-5 text-sm relative">
   <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
    <div>
     <span className="text-xs font-black text-slate-800 tracking-tight block">
      第２ステップ：詳細シミュレーション項目
     </span>
     <span className="text-[10px] text-slate-500">第1ステップと双方向リアルタイム同期中</span>
    </div>
    {onToggleCollapse && (
     <button
      type="button"
      onClick={onToggleCollapse}
      className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition"
     >
      <ChevronLeft className="w-3.5 h-3.5" />
      <span>たたむ</span>
     </button>
    )}
   </div>

   <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/70 space-y-3.5">
    <div className="flex items-center justify-between">
     <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
      <Percent className="w-3.5 h-3.5 text-indigo-600" />
      1. 基本情報＆経済環境
     </span>
     <button
      type="button"
      onClick={() =>
       triggerHelp(
        '基本情報＆経済環境（物価・利回り）',
        '経済前提',
        '物価の上昇率（インフレ率）や運用利回りなど、何十年にもわたる長期シミュレーションの土台となるマクロ前提です。',
        '物価上昇率は1.0〜2.0%程度、NISA運用利回りは全世界株式の長期保守的な想定として3.5〜4.5%程度を目安に設定します。',
        '物価が上がると将来の生活費・住居費・娯楽費が自動で複利膨張して計算されるため、現金の目減りリスクがはっきりと可視化されます。',
        '物価1.5% / 運用利回り4.0%'
       )
      }
      className="text-slate-400 hover:text-sky-600"
     >
      <HelpCircle className="w-3.5 h-3.5" />
     </button>
    </div>

    <div className="grid grid-cols-2 gap-2 text-xs">
     <div className="bg-white p-2 rounded-lg border border-slate-200">
      <span className="text-slate-600 text-[10px] block font-medium">
       {state.primary.name}の現在年齢
      </span>
      <div className="flex items-center gap-1 font-mono mt-0.5">
       <input
        type="number"
        min={50}
        max={95}
        value={state.primary.ageYears}
        onChange={(e) =>
         onChange((prev) => ({
          ...prev,
          primary: { ...prev.primary, ageYears: parseInt(e.target.value) || 65 },
         }))
        }
        className="w-12 border border-slate-300 rounded px-1 text-right text-xs"
       />
       <span className="text-slate-600">歳</span>
      </div>
     </div>

     {isCouple ? (
      <div className="bg-white p-2 rounded-lg border border-slate-200">
       <span className="text-slate-600 text-[10px] block font-medium">
        {state.spouse.name}の現在年齢
       </span>
       <div className="flex items-center gap-1 font-mono mt-0.5">
        <input
         type="number"
         min={50}
         max={95}
         value={state.spouse.ageYears}
         onChange={(e) =>
          onChange((prev) => ({
           ...prev,
           spouse: { ...prev.spouse, ageYears: parseInt(e.target.value) || 62 },
          }))
         }
         className="w-12 border border-slate-300 rounded px-1 text-right text-xs"
        />
        <span className="text-slate-600">歳</span>
       </div>
      </div>
     ) : (
      <div className="bg-slate-100 p-2 rounded-lg text-[10px] text-slate-400 flex items-center justify-center">
       単身世帯設定
      </div>
     )}
    </div>

    <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-2.5">
     <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
       <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
       寿命想定の設定（65〜120歳）
      </span>
      <span className="text-[9px] text-slate-400">第1ステップと共通連動</span>
     </div>

     <div>
      <div className="flex justify-between items-center text-xs mb-1">
       <span className="text-[11px] text-slate-600">{state.primary.name}の想定寿命:</span>
       <span className="font-bold font-mono text-sky-700 bg-sky-50 px-2 py-0.2 rounded border border-sky-200">
        {state.primary.lifeExpectancyYears} 歳
       </span>
      </div>
      <input
       type="range"
       min={65}
       max={120}
       step={1}
       value={state.primary.lifeExpectancyYears}
       onChange={(e) => handleLifeExpectancyChange('primary', parseInt(e.target.value) || 100)}
       className="w-full accent-sky-600 h-1.5 bg-slate-200 rounded cursor-pointer"
      />
     </div>

     {isCouple && (
      <div className="pt-1.5 border-t border-slate-100">
       <div className="flex justify-between items-center text-xs mb-1">
        <span className="text-[11px] text-slate-600">{state.spouse.name}の想定寿命:</span>
        <span className="font-bold font-mono text-rose-700 bg-rose-50 px-2 py-0.2 rounded border border-rose-200">
         {state.spouse.lifeExpectancyYears} 歳
        </span>
       </div>
       <input
        type="range"
        min={65}
        max={120}
        step={1}
        value={state.spouse.lifeExpectancyYears}
        onChange={(e) => handleLifeExpectancyChange('spouse', parseInt(e.target.value) || 100)}
        className="w-full accent-rose-600 h-1.5 bg-slate-200 rounded cursor-pointer"
       />
      </div>
     )}
    </div>

    <div>
     <div className="flex justify-between items-center text-xs mb-1">
      <span className="text-slate-600">物価上昇率 (年率):</span>
      <span className="font-bold font-mono text-slate-900 bg-white px-2 py-0.2 rounded border border-slate-300">
       {cfg.inflationRate} %
      </span>
     </div>
     <input
      type="range"
      min={0}
      max={3.5}
      step={0.1}
      value={cfg.inflationRate}
      onChange={(e) =>
       onChange((prev) => ({
        ...prev,
        lifePlan: { ...prev.lifePlan, inflationRate: parseFloat(e.target.value) },
       }))
      }
      className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded cursor-pointer"
     />
    </div>

    <div>
     <div className="flex justify-between items-center text-xs mb-1">
      <span className="text-slate-600">運用利回り (NISA等・年率):</span>
      <span className="font-bold font-mono text-indigo-700 bg-white px-2 py-0.2 rounded border border-indigo-300">
       {cfg.investmentReturnRate} %
      </span>
     </div>
     <input
      type="range"
      min={1.0}
      max={7.0}
      step={0.5}
      value={cfg.investmentReturnRate}
      onChange={(e) =>
       onChange((prev) => ({
        ...prev,
        lifePlan: { ...prev.lifePlan, investmentReturnRate: parseFloat(e.target.value) },
       }))
      }
      className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded cursor-pointer"
     />
    </div>
   </div>

   <div className="border border-sky-200 bg-sky-50/40 rounded-xl p-3.5 space-y-3">
    <div className="flex items-center justify-between">
     <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
      <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
      2. 収入・年金戦略
      <button
       type="button"
       onClick={() =>
        triggerHelp(
         '収入・年金戦略（退職金・手取り・iDeCo）',
         '収入設定',
         '正職・再雇用の手取り年収、退職金の一括手取り、公的年金の手取り率、iDeCo（確定拠出年金）の受取金額と時期を設定します。',
         '手取りベースで入力してください（額面の約80%が手取り目安）。退職金は一時金受け取りを前提とし、iDeCoは受け取る予定年齢と手取り総額を入力します。',
         '退職金は一時金で受け取ることで「退職所得控除」を満額利用でき、毎年の社会保険料や介護保険自己負担を押し上げずに済みます。',
         '退職金1,000〜2,000万円 / 手取り率80〜85%'
        )
       }
       className="text-slate-400 hover:text-sky-600"
      >
       <HelpCircle className="w-3.5 h-3.5" />
      </button>
     </span>

     {isCouple && (
      <div className="flex items-center bg-white rounded-lg p-0.5 border border-sky-200 text-[11px]">
       <button
        type="button"
        onClick={() => setRoleTab('primary')}
        className={`px-2 py-0.5 rounded font-bold ${
         roleTab === 'primary' ? 'bg-sky-600 text-white' : 'text-slate-600'
        }`}
       >
        👤 {state.primary.name}
       </button>
       <button
        type="button"
        onClick={() => setRoleTab('spouse')}
        className={`px-2 py-0.5 rounded font-bold ${
         roleTab === 'spouse' ? 'bg-rose-600 text-white' : 'text-slate-600'
        }`}
       >
        👥 {state.spouse.name}
       </button>
      </div>
     )}
    </div>

    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2.5">
     <span className="text-[11px] font-bold text-slate-700 block border-b pb-1">
      {roleTab === 'primary' ? state.primary.name : state.spouse.name} の就労・年金・退職金
     </span>

     <div className="grid grid-cols-2 gap-2 text-xs">
      <div>
       <span className="text-[10px] text-slate-500 block">正職リタイア年齢:</span>
       <div className="flex items-center gap-1 font-mono">
        <input
         type="number"
         value={activeStrategy.careerRetireAge}
         onChange={(e) =>
          handleStrategyChange(roleTab, 'careerRetireAge', parseInt(e.target.value) || 60)
         }
         className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-right text-xs"
        />
        <span className="text-[10px]">歳</span>
       </div>
      </div>
      <div>
       <span className="text-[10px] text-slate-500 block">正職就労手取り(年):</span>
       <div className="flex items-center gap-1 font-mono">
        <input
         type="number"
         value={activeStrategy.careerNetIncomeAnnual}
         onChange={(e) =>
          handleStrategyChange(roleTab, 'careerNetIncomeAnnual', parseInt(e.target.value) || 0)
         }
         className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-right text-xs"
        />
        <span className="text-[10px]">万</span>
       </div>
      </div>
     </div>

     <div className="text-xs">
      <span className="text-[10px] text-slate-500 block">正職 退職金 (手取り):</span>
      <div className="flex items-center gap-1 font-mono">
       <input
        type="number"
        value={activeStrategy.careerSeverancePayNet}
        onChange={(e) =>
         handleStrategyChange(roleTab, 'careerSeverancePayNet', parseInt(e.target.value) || 0)
        }
        className="w-20 border border-slate-300 rounded px-1.5 py-0.5 text-right text-xs"
       />
       <span className="text-[10px]">万円</span>
      </div>
     </div>

     <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
      <div>
       <span className="text-[10px] text-slate-500 block">再雇用リタイア年齢:</span>
       <div className="flex items-center gap-1 font-mono">
        <input
         type="number"
         value={activeStrategy.rehireRetireAge}
         onChange={(e) =>
          handleStrategyChange(roleTab, 'rehireRetireAge', parseInt(e.target.value) || 65)
         }
         className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-right text-xs"
        />
        <span className="text-[10px]">歳</span>
       </div>
      </div>
      <div>
       <span className="text-[10px] text-slate-500 block">再雇用手取り(年):</span>
       <div className="flex items-center gap-1 font-mono">
        <input
         type="number"
         value={activeStrategy.rehireNetIncomeAnnual}
         onChange={(e) =>
          handleStrategyChange(roleTab, 'rehireNetIncomeAnnual', parseInt(e.target.value) || 0)
         }
         className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-right text-xs"
        />
        <span className="text-[10px]">万</span>
       </div>
      </div>
     </div>

     <div className="text-xs">
      <span className="text-[10px] text-slate-500 block">再雇用 退職金 (手取り):</span>
      <div className="flex items-center gap-1 font-mono">
       <input
        type="number"
        value={activeStrategy.rehireSeverancePayNet}
        onChange={(e) =>
         handleStrategyChange(roleTab, 'rehireSeverancePayNet', parseInt(e.target.value) || 0)
        }
        className="w-20 border border-slate-300 rounded px-1.5 py-0.5 text-right text-xs"
       />
       <span className="text-[10px]">万円</span>
      </div>
     </div>

     <div className="space-y-1.5 pt-1 border-t border-slate-100 text-xs">
      <div className="grid grid-cols-2 gap-2">
       <div>
        <span className="text-[10px] text-slate-500 block">年金受給開始年齢:</span>
        <div className="flex items-center gap-1 font-mono">
         <input
          type="number"
          min={60}
          max={75}
          value={activeStrategy.pensionStartAge}
          onChange={(e) =>
           handleStrategyChange(roleTab, 'pensionStartAge', parseInt(e.target.value) || 65)
          }
          className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-right text-xs"
         />
         <span className="text-[10px]">歳</span>
        </div>
       </div>
       <div>
        <span className="text-[10px] text-slate-500 block">65歳年金額面(年):</span>
        <div className="flex items-center gap-1 font-mono">
         <input
          type="number"
          value={activeStrategy.pensionAge65GrossAnnual}
          onChange={(e) =>
           handleStrategyChange(roleTab, 'pensionAge65GrossAnnual', parseInt(e.target.value) || 0)
          }
          className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-right text-xs font-bold text-sky-800"
         />
         <span className="text-[10px]">万</span>
        </div>
       </div>
      </div>

      <div>
       <span className="text-[10px] text-slate-500 block">年金手取り率 (%):</span>
       <div className="flex items-center gap-1 font-mono">
        <input
         type="number"
         min={70}
         max={95}
         value={activeStrategy.pensionNetRate}
         onChange={(e) =>
          handleStrategyChange(roleTab, 'pensionNetRate', parseInt(e.target.value) || 85)
         }
         className="w-16 border border-slate-300 rounded px-1.5 py-0.5 text-right text-xs"
        />
        <span className="text-[10px]">% (標準85%)</span>
       </div>
      </div>
     </div>

     <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
      <div>
       <span className="text-[10px] text-slate-500 block">iDeCo等(手取り):</span>
       <div className="flex items-center gap-1 font-mono">
        <input
         type="number"
         value={activeStrategy.idecoNetTotal}
         onChange={(e) =>
          handleStrategyChange(roleTab, 'idecoNetTotal', parseInt(e.target.value) || 0)
         }
         className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-right text-xs"
        />
        <span className="text-[10px]">万</span>
       </div>
      </div>
      <div>
       <span className="text-[10px] text-slate-500 block">iDeCo受取年齢:</span>
       <div className="flex items-center gap-1 font-mono">
        <input
         type="number"
         min={60}
         max={75}
         value={activeStrategy.idecoReceiveAge}
         onChange={(e) =>
          handleStrategyChange(roleTab, 'idecoReceiveAge', parseInt(e.target.value) || 65)
         }
         className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-right text-xs"
        />
        <span className="text-[10px]">歳</span>
       </div>
      </div>
     </div>
    </div>

    <div className="space-y-1.5 pt-1">
     <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
       臨時収入 (単発)：
       <button
        type="button"
        onClick={() =>
         triggerHelp(
          '臨時収入 (単発)',
          '臨時収入',
          '親からの生前贈与や相続、満期を迎える個人年金や保険金など、特定の年齢の年にまとまって入る手取り収入です。',
          '「追加」ボタンを押して、名目（例: 親からの相続）、受取年齢（例: 67歳）、手取り金額（万円）を入力します。不要になったらゴミ箱アイコンで削除できます。',
          'まとまった一時収入があると、その年のキャッシュフローが一気に好転し、バケット2（運用資産）への再投資や娯楽費へ充当されます。',
          '例: 67歳 300万円'
         )
        }
        className="text-slate-400 hover:text-sky-600"
       >
        <HelpCircle className="w-3.5 h-3.5" />
       </button>
      </span>
      <button
       type="button"
       onClick={addTemporaryIncome}
       className="text-[10px] font-bold text-sky-700 bg-white hover:bg-sky-50 border border-sky-300 px-2 py-0.5 rounded flex items-center gap-1 shadow-2xs"
      >
       <Plus className="w-3 h-3" />
       追加
      </button>
     </div>

     <div className="space-y-1.5">
      {(cfg.temporaryIncomes || []).map((item) => (
       <div
        key={item.id}
        className="bg-white p-2 rounded-lg border border-slate-200 text-xs space-y-1"
       >
        <div className="flex items-center justify-between gap-1">
         <input
          type="text"
          value={item.title}
          onChange={(e) => {
           const updated = (cfg.temporaryIncomes || []).map((i) =>
            i.id === item.id ? { ...i, title: e.target.value } : i
           );
           onChange((prev) => ({
            ...prev,
            lifePlan: { ...prev.lifePlan, temporaryIncomes: updated },
           }));
          }}
          className="border border-slate-300 rounded px-1.5 py-0.5 text-xs flex-1 font-semibold"
          placeholder="名目"
         />
         <button
          type="button"
          onClick={() => removeTemporaryIncome(item.id)}
          className="text-slate-400 hover:text-rose-600 p-1"
         >
          <Trash2 className="w-3.5 h-3.5" />
         </button>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
         <span className="text-slate-500 font-sans">受取:</span>
         <input
          type="number"
          value={item.age}
          onChange={(e) => {
           const updated = (cfg.temporaryIncomes || []).map((i) =>
            i.id === item.id ? { ...i, age: parseInt(e.target.value) || 60 } : i
           );
           onChange((prev) => ({
            ...prev,
            lifePlan: { ...prev.lifePlan, temporaryIncomes: updated },
           }));
          }}
          className="w-12 border border-slate-300 rounded px-1 py-0.5 text-right"
         />
         <span>歳</span>
         <input
          type="number"
          value={item.amount}
          onChange={(e) => {
           const updated = (cfg.temporaryIncomes || []).map((i) =>
            i.id === item.id ? { ...i, amount: parseInt(e.target.value) || 0 } : i
           );
           onChange((prev) => ({
            ...prev,
            lifePlan: { ...prev.lifePlan, temporaryIncomes: updated },
           }));
          }}
          className="w-16 border border-slate-300 rounded px-1 py-0.5 text-right font-bold text-sky-800 ml-auto"
         />
         <span>万円</span>
        </div>
       </div>
      ))}
     </div>
    </div>
   </div>

   <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-3.5 space-y-3">
    <div className="flex items-center justify-between">
     <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
      <Wallet className="w-3.5 h-3.5 text-emerald-600" />
      3. 現在の資産とバケット設定
      <button
       type="button"
       onClick={() =>
        triggerHelp(
         '3大バケット設定と現在の資産',
         'バケット管理',
         '全資産を「生活インフラ現金（バケット1）」、「運用資産・NISA（バケット2）」、「医療・介護防衛（バケット3）」の3つに機能分離します。',
         '現在の預貯金額と、運用している投資信託や株式の金額を入力します。バケット1（標準300万）とバケット3（標準500万）は取り崩しとは別枠で隔離されます。',
         '「運用をNISA枠(1800万)に制限する」にチェックを入れると、超過余剰金を課税の特定口座に入れず無リスク現金として温存します。',
         'バケット1: 300万 / バケット3: 500万'
        )
       }
       className="text-slate-400 hover:text-sky-600"
      >
       <HelpCircle className="w-3.5 h-3.5" />
      </button>
     </span>
     <span className="text-[10px] text-emerald-800 font-bold font-mono">
      預金＋運用資産計: {cfg.currentCashSavings + cfg.primaryStrategy.investments + (isCouple ? cfg.spouseStrategy.investments : 0)}万
     </span>
    </div>

    <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
     <div className="flex justify-between items-center mb-1">
      <span className="text-slate-700 font-medium">現在の預貯金:</span>
      <div className="flex items-center gap-1 font-mono">
       <input
        type="number"
        value={cfg.currentCashSavings}
        onChange={(e) =>
         onChange((prev) => ({
          ...prev,
          lifePlan: { ...prev.lifePlan, currentCashSavings: parseInt(e.target.value) || 0 },
         }))
        }
        className="w-20 border border-slate-300 rounded px-1.5 py-0.5 text-right font-bold"
       />
       <span className="text-[10px]">万円</span>
      </div>
     </div>
    </div>

    <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1.5">
     <span className="text-slate-700 font-medium block">現在の運用資産:</span>
     <div className="flex justify-between items-center">
      <span className="text-[11px] text-slate-500">👤 {state.primary.name}:</span>
      <div className="flex items-center gap-1 font-mono">
       <input
        type="number"
        value={cfg.primaryStrategy.investments}
        onChange={(e) => handleStrategyChange('primary', 'investments', parseInt(e.target.value) || 0)}
        className="w-16 border border-slate-300 rounded px-1.5 py-0.5 text-right font-bold text-indigo-700"
       />
       <span className="text-[10px]">万円</span>
      </div>
     </div>

     {isCouple && (
      <div className="flex justify-between items-center pt-1 border-t border-slate-100">
       <span className="text-[11px] text-slate-500">👥 {state.spouse.name}:</span>
       <div className="flex items-center gap-1 font-mono">
        <input
         type="number"
         value={cfg.spouseStrategy.investments}
         onChange={(e) => handleStrategyChange('spouse', 'investments', parseInt(e.target.value) || 0)}
         className="w-16 border border-slate-300 rounded px-1.5 py-0.5 text-right font-bold text-indigo-700"
        />
        <span className="text-[10px]">万円</span>
       </div>
      </div>
     )}

     <label className="flex items-center gap-2 pt-1 border-t border-slate-100 text-[11px] text-indigo-900 cursor-pointer select-none">
      <input
       type="checkbox"
       checked={cfg.limitToNisaCap}
       onChange={(e) =>
        onChange((prev) => ({
         ...prev,
         lifePlan: { ...prev.lifePlan, limitToNisaCap: e.target.checked },
        }))
       }
       className="accent-indigo-600 rounded"
      />
      <span className="font-semibold">運用をNISA枠 ({isCouple ? '3,600万' : '1,800万'}) に制限する</span>
     </label>
    </div>

    <div className="grid grid-cols-2 gap-2 text-xs">
     <div className="bg-white p-2 rounded-lg border border-slate-200">
      <span className="text-[10px] text-slate-600 font-medium block">
       バケット1 (生活現金):
      </span>
      <div className="flex items-center gap-1 font-mono mt-1">
       <input
        type="number"
        step={50}
        value={cfg.bucket1Cash}
        onChange={(e) =>
         onChange((prev) => ({
          ...prev,
          lifePlan: { ...prev.lifePlan, bucket1Cash: parseInt(e.target.value) || 0 },
         }))
        }
        className="w-full border border-slate-300 rounded px-1 text-right text-xs"
       />
       <span className="text-[10px]">万</span>
      </div>
      <span className="text-[9px] text-slate-400 mt-0.5 block">デフォルト300万</span>
     </div>

     <div className="bg-white p-2 rounded-lg border border-slate-200">
      <span className="text-[10px] text-slate-600 font-medium block">
       バケット3 (医療介護防衛):
      </span>
      <div className="flex items-center gap-1 font-mono mt-1">
       <input
        type="number"
        step={50}
        value={cfg.bucket3Emergency}
        onChange={(e) =>
         onChange((prev) => ({
          ...prev,
          lifePlan: { ...prev.lifePlan, bucket3Emergency: parseInt(e.target.value) || 0 },
         }))
        }
        className="w-full border border-slate-300 rounded px-1 text-right text-xs"
       />
       <span className="text-[10px]">万</span>
      </div>
      <span className="text-[9px] text-slate-400 mt-0.5 block">デフォルト500万</span>
     </div>
    </div>
   </div>

    <div className="border border-amber-200 rounded-xl p-3.5 bg-amber-50/40 space-y-3">
     <div className="space-y-1">
      <span className="text-xs font-bold text-amber-950 block">4. 自動最適化の目標と変更範囲</span>
      <p className="text-[10px] leading-relaxed text-amber-900">
        ここで設定するのは将来の最適化条件です。現在の試算値は変わりません。目標や範囲が未設定の間は最適化を開始できません。
      </p>
     </div>

     <div className="bg-white p-2.5 rounded-lg border border-amber-200 space-y-2 text-xs">
      <span className="font-semibold text-slate-800">想定寿命時点で残したい総資産の範囲</span>
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
         <span className="text-[10px] text-slate-500">下限 (万円)</span>
         <input
          type="number"
          min={0}
          value={state.optimization.minimumEndingAssets ?? ''}
          onChange={(event) =>
            updateOptimization({ minimumEndingAssets: event.target.value === '' ? null : Number(event.target.value) })
          }
          className="w-full border border-slate-300 rounded px-2 py-1 text-right"
          aria-label="想定寿命時点の目標資産下限"
         />
        </label>
        <label className="space-y-1">
         <span className="text-[10px] text-slate-500">上限 (万円)</span>
         <input
          type="number"
          min={0}
          value={state.optimization.maximumEndingAssets ?? ''}
          onChange={(event) =>
            updateOptimization({ maximumEndingAssets: event.target.value === '' ? null : Number(event.target.value) })
          }
          className="w-full border border-slate-300 rounded px-2 py-1 text-right"
          aria-label="想定寿命時点の目標資産上限"
         />
        </label>
      </div>
     </div>

     <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-2">
      <span className="text-xs font-semibold text-slate-800">最適化で変更してよい項目と範囲</span>
      <div className="space-y-2">
        {adjustableRangeRows.filter((row) => row.visible).map((row) => {
         const range = state.optimization.adjustableRanges[row.key];
          const limits = OPTIMIZATION_RANGE_LIMITS[row.key];
         return (
          <div key={row.key} className="rounded-md border border-slate-100 bg-slate-50/70 px-2 py-1.5 space-y-1.5">
            <label className="flex items-start gap-2 text-[11px] font-medium leading-snug text-slate-800 cursor-pointer">
             <input
              type="checkbox"
              checked={range.enabled}
              onChange={(event) => updateOptimizationRange(row.key, { enabled: event.target.checked })}
              className="accent-amber-600 rounded shrink-0 mt-0.5"
             />
             <div className="space-y-0.5 flex-1 min-w-0">
              <span className="whitespace-normal break-words font-bold block">{row.label}</span>
              {row.description && (
               <span className="text-[10px] text-slate-500 block leading-tight">
                {row.description}
               </span>
              )}
              {row.currentValueText && (
               <span className="text-[9px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded font-medium inline-block mt-0.5">
                {row.currentValueText}
               </span>
              )}
             </div>
            </label>
            <div className="grid grid-cols-2 gap-2 pl-6">
             <label className="space-y-0.5 text-[10px] text-slate-500">
              <span>最小 ({row.unit})</span>
              <input
               type="number"
               min={limits.minimum}
               max={limits.maximum}
               value={range.minimum ?? ''}
               disabled={!range.enabled}
               placeholder={row.currentValue === undefined ? String(limits.minimum) : String(row.currentValue)}
               onChange={(event) => updateOptimizationRange(row.key, { minimum: event.target.value === '' ? null : Number(event.target.value) })}
               className="w-full min-w-0 border border-slate-300 disabled:bg-slate-100 rounded px-2 py-1.5 text-right text-xs text-slate-800"
               aria-label={`${row.label}の下限`}
              />
             </label>
             <label className="space-y-0.5 text-[10px] text-slate-500">
              <span>最大 ({row.unit})</span>
              <input
               type="number"
               min={limits.minimum}
               max={limits.maximum}
               value={range.maximum ?? ''}
               disabled={!range.enabled}
               placeholder={row.currentValue === undefined ? String(limits.maximum) : String(row.currentValue)}
               onChange={(event) => updateOptimizationRange(row.key, { maximum: event.target.value === '' ? null : Number(event.target.value) })}
               className="w-full min-w-0 border border-slate-300 disabled:bg-slate-100 rounded px-2 py-1.5 text-right text-xs text-slate-800"
               aria-label={`${row.label}の上限`}
              />
             </label>
            </div>
          </div>
         );
        })}
      </div>
     </div>

     {optimizationErrors.length > 0 ? (
      <p className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2" role="status">
        最適化の準備未完了: {optimizationErrors[0]}
      </p>
     ) : (
      <p className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2" role="status">
        目標と変更範囲を設定しました。最適化機能は次段階で追加します。
      </p>
     )}
    </div>

   <div className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-3.5">
    <div className="flex items-center justify-between border-b pb-1.5">
     <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
      <Coffee className="w-3.5 h-3.5 text-amber-600" />
    5. 支出設定（随時追加・期間変更可能）
      <button
       type="button"
       onClick={() =>
        triggerHelp(
         '支出設定（住居・生活・娯楽・特別支出）',
         '支出管理',
         '生活に必要な固定費、基本食費などのインフラ費、人生を楽しむためのアクティブ娯楽費、車のローンや学費などの期間特別支出を期間付きで設定できます。',
         '住居形態の変化（例: 70歳から賃貸移行）や、生活スタイルの変化（例: 80歳以降の基本生活費縮小）に合わせて「開始年齢〜終了年齢」と「年額」を設定してください。',
         'すべての支出には「設定した物価上昇率（年1.5%等）」が自動で複利加算され、将来の購買力低下を完全に反映します。',
         '基本生活費: 月15〜20万 / 娯楽費: 年30〜60万'
        )
       }
       className="text-slate-400 hover:text-sky-600"
      >
       <HelpCircle className="w-3.5 h-3.5" />
      </button>
     </span>
     <span className="text-[10px] text-slate-400">現在価値・インフレ自動連動</span>
    </div>

    <div className="space-y-1.5">
     <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
       <Home className="w-3.5 h-3.5 text-slate-600" />
       住居固定費：
      </span>
      <button
       type="button"
       onClick={() => addPeriodItem('housingCosts', '家賃/管理修繕/固定資産税', 60)}
       className="text-[10px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-300 px-2 py-0.5 rounded flex items-center gap-1 shadow-2xs"
      >
       <Plus className="w-3 h-3" />
       追加
      </button>
     </div>

     {(cfg.housingCosts || []).map((item) => (
      <div key={item.id} className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs space-y-1">
       <div className="flex items-center justify-between gap-1">
        <input
         type="text"
         value={item.title}
         onChange={(e) => handlePeriodItemUpdate('housingCosts', item.id, 'title', e.target.value)}
         className="border border-slate-300 rounded px-1.5 py-0.5 text-xs flex-1 font-semibold bg-white"
        />
        <button
         type="button"
         onClick={() => removePeriodItem('housingCosts', item.id)}
         className="text-slate-400 hover:text-rose-600 p-0.5"
        >
         <Trash2 className="w-3.5 h-3.5" />
        </button>
       </div>
       <div className="flex items-center gap-1.5 text-[11px] font-mono">
        <input
         type="number"
         value={item.startAge}
         onChange={(e) => handlePeriodItemUpdate('housingCosts', item.id, 'startAge', parseInt(e.target.value) || 0)}
         className="w-12 border border-slate-300 rounded px-1 py-0.5 text-right bg-white"
        />
        <span>〜</span>
        <input
         type="number"
         value={item.endAge}
         onChange={(e) => handlePeriodItemUpdate('housingCosts', item.id, 'endAge', parseInt(e.target.value) || 0)}
         className="w-12 border border-slate-300 rounded px-1 py-0.5 text-right bg-white"
        />
        <span>歳</span>
        <input
         type="number"
         value={item.annualAmount}
         onChange={(e) => handlePeriodItemUpdate('housingCosts', item.id, 'annualAmount', parseInt(e.target.value) || 0)}
         className="w-14 border border-slate-300 rounded px-1 py-0.5 text-right font-bold ml-auto bg-white"
        />
        <span>万/年</span>
       </div>
      </div>
     ))}
    </div>

    <div className="space-y-1.5 pt-1 border-t border-slate-100">
     <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-slate-700">
       基本生活インフラ費：
      </span>
      <button
       type="button"
       onClick={() => addPeriodItem('baseLivingCosts', '食費・光熱費・通信費', 180)}
       className="text-[10px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-300 px-2 py-0.5 rounded flex items-center gap-1 shadow-2xs"
      >
       <Plus className="w-3 h-3" />
       追加
      </button>
     </div>

     {(cfg.baseLivingCosts || []).map((item) => (
      <div key={item.id} className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs space-y-1">
       <div className="flex items-center justify-between gap-1">
        <input
         type="text"
         value={item.title}
         onChange={(e) => handlePeriodItemUpdate('baseLivingCosts', item.id, 'title', e.target.value)}
         className="border border-slate-300 rounded px-1.5 py-0.5 text-xs flex-1 font-semibold bg-white"
        />
        <button
         type="button"
         onClick={() => removePeriodItem('baseLivingCosts', item.id)}
         className="text-slate-400 hover:text-rose-600 p-0.5"
        >
         <Trash2 className="w-3.5 h-3.5" />
        </button>
       </div>
       <div className="flex items-center gap-1.5 text-[11px] font-mono">
        <input
         type="number"
         value={item.startAge}
         onChange={(e) => handlePeriodItemUpdate('baseLivingCosts', item.id, 'startAge', parseInt(e.target.value) || 0)}
         className="w-12 border border-slate-300 rounded px-1 py-0.5 text-right bg-white"
        />
        <span>〜</span>
        <input
         type="number"
         value={item.endAge}
         onChange={(e) => handlePeriodItemUpdate('baseLivingCosts', item.id, 'endAge', parseInt(e.target.value) || 0)}
         className="w-12 border border-slate-300 rounded px-1 py-0.5 text-right bg-white"
        />
        <span>歳</span>
        <input
         type="number"
         value={item.annualAmount}
         onChange={(e) => handlePeriodItemUpdate('baseLivingCosts', item.id, 'annualAmount', parseInt(e.target.value) || 0)}
         className="w-14 border border-slate-300 rounded px-1 py-0.5 text-right font-bold ml-auto bg-white"
        />
        <span>万/年</span>
       </div>
      </div>
     ))}
    </div>

    <div className="space-y-1.5 pt-1 border-t border-slate-100">
     <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
       <Plane className="w-3.5 h-3.5 text-sky-600" />
       アクティブ娯楽費 (定額・B2取崩し)：
      </span>
      <button
       type="button"
       onClick={() => addPeriodItem('activeLeisureAnnual', '毎年の旅行・趣味・外食', 60)}
       className="text-[10px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-300 px-2 py-0.5 rounded flex items-center gap-1 shadow-2xs"
      >
       <Plus className="w-3 h-3" />
       追加
      </button>
     </div>

     {(cfg.activeLeisureAnnual || []).map((item) => (
      <div key={item.id} className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs space-y-1">
       <div className="flex items-center justify-between gap-1">
        <input
         type="text"
         value={item.title}
         onChange={(e) => handlePeriodItemUpdate('activeLeisureAnnual', item.id, 'title', e.target.value)}
         className="border border-slate-300 rounded px-1.5 py-0.5 text-xs flex-1 font-semibold bg-white"
        />
        <button
         type="button"
         onClick={() => removePeriodItem('activeLeisureAnnual', item.id)}
         className="text-slate-400 hover:text-rose-600 p-0.5"
        >
         <Trash2 className="w-3.5 h-3.5" />
        </button>
       </div>
       <div className="flex items-center gap-1.5 text-[11px] font-mono">
        <input
         type="number"
         value={item.startAge}
         onChange={(e) => handlePeriodItemUpdate('activeLeisureAnnual', item.id, 'startAge', parseInt(e.target.value) || 0)}
         className="w-12 border border-slate-300 rounded px-1 py-0.5 text-right bg-white"
        />
        <span>〜</span>
        <input
         type="number"
         value={item.endAge}
         onChange={(e) => handlePeriodItemUpdate('activeLeisureAnnual', item.id, 'endAge', parseInt(e.target.value) || 0)}
         className="w-12 border border-slate-300 rounded px-1 py-0.5 text-right bg-white"
        />
        <span>歳</span>
        <input
         type="number"
         value={item.annualAmount}
         onChange={(e) => handlePeriodItemUpdate('activeLeisureAnnual', item.id, 'annualAmount', parseInt(e.target.value) || 0)}
         className="w-14 border border-slate-300 rounded px-1 py-0.5 text-right font-bold text-sky-700 ml-auto bg-white"
        />
        <span>万/年</span>
       </div>
      </div>
     ))}
    </div>

    <div className="pt-1 border-t border-slate-100 text-xs">
     <div className="flex justify-between items-center">
      <span className="text-slate-600 font-medium">使途不明金・予備費 (年額):</span>
      <div className="flex items-center gap-1 font-mono">
       <input
        type="number"
        value={cfg.unforeseenBudgetAnnual}
        onChange={(e) =>
         onChange((prev) => ({
          ...prev,
          lifePlan: { ...prev.lifePlan, unforeseenBudgetAnnual: parseInt(e.target.value) || 0 },
         }))
        }
        className="w-16 border border-slate-300 rounded px-1.5 py-0.5 text-right text-xs"
       />
       <span className="text-[10px]">万円/年</span>
      </div>
     </div>
    </div>

    <div className="space-y-1.5 pt-1 border-t border-slate-100">
     <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
       <Sparkles className="w-3.5 h-3.5 text-amber-500" />
       まとまった娯楽費 (単発・B2取崩し)：
      </span>
      <button
       type="button"
       onClick={addLargeLeisure}
       className="text-[10px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-300 px-2 py-0.5 rounded flex items-center gap-1 shadow-2xs"
      >
       <Plus className="w-3 h-3" />
       追加
      </button>
     </div>

     {(cfg.largeLeisureOneTimes || []).map((item) => (
      <div key={item.id} className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs space-y-1">
       <div className="flex items-center justify-between gap-1">
        <input
         type="text"
         value={item.title}
         onChange={(e) => handleOneTimeItemUpdate('largeLeisureOneTimes', item.id, 'title', e.target.value)}
         className="border border-slate-300 rounded px-1.5 py-0.5 text-xs flex-1 font-semibold bg-white"
        />
        <button
         type="button"
         onClick={() => removeLargeLeisure(item.id)}
         className="text-slate-400 hover:text-rose-600 p-0.5"
        >
         <Trash2 className="w-3.5 h-3.5" />
        </button>
       </div>
       <div className="flex items-center gap-1.5 text-[11px] font-mono">
        <span className="text-slate-500 font-sans">時期:</span>
        <input
         type="number"
         value={item.age}
         onChange={(e) => handleOneTimeItemUpdate('largeLeisureOneTimes', item.id, 'age', parseInt(e.target.value) || 60)}
         className="w-12 border border-slate-300 rounded px-1 py-0.5 text-right bg-white"
        />
        <span>歳</span>
        <input
         type="number"
         value={item.amount}
         onChange={(e) => handleOneTimeItemUpdate('largeLeisureOneTimes', item.id, 'amount', parseInt(e.target.value) || 0)}
         className="w-16 border border-slate-300 rounded px-1 py-0.5 text-right font-bold text-amber-700 ml-auto bg-white"
        />
        <span>万円</span>
       </div>
      </div>
     ))}
    </div>

    <div className="space-y-1.5 pt-1 border-t border-slate-100">
     <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
       <Clock className="w-3.5 h-3.5 text-slate-600" />
       期間指定の特別支出 (車・学費・仕送り等)：
      </span>
      <button
       type="button"
       onClick={() => addPeriodItem('specialPeriodExpenses', 'マイカーローン・教育等', 50)}
       className="text-[10px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-300 px-2 py-0.5 rounded flex items-center gap-1 shadow-2xs"
      >
       <Plus className="w-3 h-3" />
       追加
      </button>
     </div>

     {(cfg.specialPeriodExpenses || []).map((item) => (
      <div key={item.id} className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs space-y-1">
       <div className="flex items-center justify-between gap-1">
        <input
         type="text"
         value={item.title}
         onChange={(e) => handlePeriodItemUpdate('specialPeriodExpenses', item.id, 'title', e.target.value)}
         className="border border-slate-300 rounded px-1.5 py-0.5 text-xs flex-1 font-semibold bg-white"
        />
        <button
         type="button"
         onClick={() => removePeriodItem('specialPeriodExpenses', item.id)}
         className="text-slate-400 hover:text-rose-600 p-0.5"
        >
         <Trash2 className="w-3.5 h-3.5" />
        </button>
       </div>
       <div className="flex items-center gap-1.5 text-[11px] font-mono">
        <input
         type="number"
         value={item.startAge}
         onChange={(e) => handlePeriodItemUpdate('specialPeriodExpenses', item.id, 'startAge', parseInt(e.target.value) || 0)}
         className="w-12 border border-slate-300 rounded px-1 py-0.5 text-right bg-white"
        />
        <span>〜</span>
        <input
         type="number"
         value={item.endAge}
         onChange={(e) => handlePeriodItemUpdate('specialPeriodExpenses', item.id, 'endAge', parseInt(e.target.value) || 0)}
         className="w-12 border border-slate-300 rounded px-1 py-0.5 text-right bg-white"
        />
        <span>歳</span>
        <input
         type="number"
         value={item.annualAmount}
         onChange={(e) => handlePeriodItemUpdate('specialPeriodExpenses', item.id, 'annualAmount', parseInt(e.target.value) || 0)}
         className="w-14 border border-slate-300 rounded px-1 py-0.5 text-right font-bold ml-auto bg-white"
        />
        <span>万/年</span>
       </div>
      </div>
     ))}
    </div>
   </div>
  </div>
 );
};