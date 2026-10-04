import { buildAssetManagementTimeline } from './assetCalculator';
import { calculatePensionRate } from './calculator';
import { validateOptimizationSettings } from './optimizationSettings';
import { AdjustableRange, HouseholdType, OptimizationSettings, SimulatorState } from './types';

type RangeKey = keyof OptimizationSettings['adjustableRanges'];
type CandidateValues = Partial<Record<RangeKey, number>>;

interface SearchDimension {
 key: RangeKey;
 label: string;
 currentValue: number;
 range: AdjustableRange;
 step: number;
}

export interface OptimizationAdjustmentDetail {
 label: string;
 from: number;
 to: number;
 unit: string;
 diffText: string;
 note?: string;
}

export interface OptimizationAdjustment {
 key: RangeKey;
 label: string;
 from: number;
 to: number;
 unit: string;
 diffText: string;
 impactSummary: string;
 details?: OptimizationAdjustmentDetail[];
}

export interface OptimizationCandidate {
 state: SimulatorState;
 endingAssets: number;
 withinTarget: boolean;
 firstDepletedAge: number | null;
 adjustments: OptimizationAdjustment[];
}

export interface OptimizationSearchResult {
 error: string | null;
 evaluatedCandidates: number;
 baseline: OptimizationCandidate | null;
 candidates: OptimizationCandidate[];
}

const BEAM_WIDTH = 8;
const SEARCH_PASSES = 2;
const MAX_RECOMMENDATIONS = 3;

function getCurrentValue(state: SimulatorState, key: RangeKey): number {
 const cfg = state.lifePlan;
 switch (key) {
  case 'primaryCareerRetireAge': return cfg.primaryStrategy.careerRetireAge;
  case 'primaryRehireRetireAge': return cfg.primaryStrategy.rehireRetireAge;
  case 'primaryPensionStartAge': return cfg.primaryStrategy.pensionStartAge;
  case 'primaryRehireIncomeAnnual': return cfg.primaryStrategy.rehireNetIncomeAnnual;
  case 'spouseCareerRetireAge': return cfg.spouseStrategy.careerRetireAge;
  case 'spouseRehireRetireAge': return cfg.spouseStrategy.rehireRetireAge;
  case 'spousePensionStartAge': return cfg.spouseStrategy.pensionStartAge;
  case 'spouseRehireIncomeAnnual': return cfg.spouseStrategy.rehireNetIncomeAnnual;
  case 'discretionaryExpenseReductionPercent': return 0;
 }
}

function getDimensions(state: SimulatorState): SearchDimension[] {
 const definitions: { key: RangeKey; label: string; unit: string; step: number }[] = [
  { key: 'primaryCareerRetireAge', label: `${state.primary.name}の正職退職年齢`, unit: '歳', step: 1 },
  { key: 'primaryRehireRetireAge', label: `${state.primary.name}の再雇用終了年齢`, unit: '歳', step: 1 },
  { key: 'primaryPensionStartAge', label: `${state.primary.name}の年金開始`, unit: '歳', step: 1 },
  { key: 'primaryRehireIncomeAnnual', label: `${state.primary.name}の再雇用手取り`, unit: '万円/年', step: 10 },
  { key: 'spouseCareerRetireAge', label: `${state.spouse.name}の正職退職年齢`, unit: '歳', step: 1 },
  { key: 'spouseRehireRetireAge', label: `${state.spouse.name}の再雇用終了年齢`, unit: '歳', step: 1 },
  { key: 'spousePensionStartAge', label: `${state.spouse.name}の年金開始`, unit: '歳', step: 1 },
  { key: 'spouseRehireIncomeAnnual', label: `${state.spouse.name}の再雇用手取り`, unit: '万円/年', step: 10 },
  { key: 'discretionaryExpenseReductionPercent', label: '裁量支出の削減率', unit: '%', step: 10 },
 ];

 return definitions
  .filter(({ key }) => state.householdType === 'couple' || !key.startsWith('spouse'))
  .map((definition) => ({
   ...definition,
   currentValue: getCurrentValue(state, definition.key),
   range: state.optimization.adjustableRanges[definition.key],
  }))
  .filter((dimension) => dimension.range.enabled);
}

function getSampleValues(dimension: SearchDimension): number[] {
 const minimum = dimension.range.minimum as number;
 const maximum = dimension.range.maximum as number;
 const midpoint = Math.round(((minimum + maximum) / 2) / dimension.step) * dimension.step;
 const current = Math.min(maximum, Math.max(minimum, dimension.currentValue));
 return [...new Set([minimum, midpoint, maximum, current].map((value) =>
  Math.min(maximum, Math.max(minimum, Math.round(value / dimension.step) * dimension.step))
 ))];
}

function buildCandidateState(base: SimulatorState, values: CandidateValues): SimulatorState {
 const candidate = structuredClone(base);
 const cfg = candidate.lifePlan;

 for (const [key, value] of Object.entries(values) as [RangeKey, number][]) {
  switch (key) {
   case 'primaryCareerRetireAge':
    cfg.primaryStrategy.careerRetireAge = value;
    candidate.primary.careerRetireAge = value;
    break;
   case 'primaryRehireRetireAge':
    cfg.primaryStrategy.rehireRetireAge = value;
    candidate.primary.rehireRetireAge = value;
    break;
   case 'primaryPensionStartAge':
    cfg.primaryStrategy.pensionStartAge = value;
    candidate.primary.pensionStartAge = value;
    break;
   case 'primaryRehireIncomeAnnual':
    cfg.primaryStrategy.rehireNetIncomeAnnual = value;
    break;
   case 'spouseCareerRetireAge':
    cfg.spouseStrategy.careerRetireAge = value;
    candidate.spouse.careerRetireAge = value;
    break;
   case 'spouseRehireRetireAge':
    cfg.spouseStrategy.rehireRetireAge = value;
    candidate.spouse.rehireRetireAge = value;
    break;
   case 'spousePensionStartAge':
    cfg.spouseStrategy.pensionStartAge = value;
    candidate.spouse.pensionStartAge = value;
    break;
   case 'spouseRehireIncomeAnnual':
    cfg.spouseStrategy.rehireNetIncomeAnnual = value;
    break;
   case 'discretionaryExpenseReductionPercent': {
    const multiplier = 1 - value / 100;
    cfg.activeLeisureAnnual = cfg.activeLeisureAnnual.map((item) => ({
     ...item,
     annualAmount: Math.round(item.annualAmount * multiplier * 10) / 10,
    }));
    cfg.largeLeisureOneTimes = cfg.largeLeisureOneTimes.map((item) => ({
     ...item,
     amount: Math.round(item.amount * multiplier * 10) / 10,
    }));
    break;
   }
  }
 }

 return candidate;
}

function getAdjustments(
 baseState: SimulatorState,
 candidateState: SimulatorState,
 dimensions: SearchDimension[],
 values: CandidateValues
): OptimizationAdjustment[] {
 return dimensions.flatMap((dimension) => {
  const value = values[dimension.key] ?? dimension.currentValue;
  if (value === dimension.currentValue) return [];

  let diffText = '';
  let impactSummary = '';
  let details: OptimizationAdjustmentDetail[] = [];

  const isPrimary = !dimension.key.startsWith('spouse');
  const personName = isPrimary ? baseState.primary.name : baseState.spouse.name;
  const baseStrategy = isPrimary ? baseState.lifePlan.primaryStrategy : baseState.lifePlan.spouseStrategy;
  const candidateStrategy = isPrimary ? candidateState.lifePlan.primaryStrategy : candidateState.lifePlan.spouseStrategy;

  switch (dimension.key) {
   case 'primaryCareerRetireAge':
   case 'spouseCareerRetireAge': {
    const diffYears = value - dimension.currentValue;
    diffText = `${diffYears > 0 ? '+' : ''}${diffYears}歳`;
    const annualNet = baseStrategy.careerNetIncomeAnnual;
    const totalImpact = diffYears * annualNet;
    if (diffYears > 0) {
     impactSummary = `就労+${diffYears}年延長：手取り給与 約+${totalImpact.toLocaleString()}万円 (年額${annualNet}万×${diffYears}年)`;
    } else {
     impactSummary = `就労${Math.abs(diffYears)}年短縮：手取り給与 約${totalImpact.toLocaleString()}万円`;
    }
    details = [
     {
      label: `${personName}の正職退職年齢`,
      from: dimension.currentValue,
      to: value,
      unit: '歳',
      diffText: `${diffYears > 0 ? '+' : ''}${diffYears}歳`,
      note: diffYears > 0 ? '退職延伸により取り崩し開始を先送り' : '早期退職',
     },
     {
      label: '正職就労手取り(年額)',
      from: annualNet,
      to: annualNet,
      unit: '万円/年',
      diffText: '同額維持',
     },
     {
      label: '就労期間の増減による手取り影響額',
      from: 0,
      to: totalImpact,
      unit: '万円',
      diffText: `${totalImpact > 0 ? '+' : ''}${totalImpact.toLocaleString()}万円`,
      note: diffYears > 0 ? `正職手取り${annualNet}万円/年 × ${diffYears}年間` : undefined,
     },
    ];
    break;
   }

   case 'primaryRehireRetireAge':
   case 'spouseRehireRetireAge': {
    const diffYears = value - dimension.currentValue;
    diffText = `${diffYears > 0 ? '+' : ''}${diffYears}歳`;
    const rehireNet = candidateStrategy.rehireNetIncomeAnnual;
    const totalImpact = diffYears * rehireNet;
    const oldDuration = Math.max(0, dimension.currentValue - baseStrategy.careerRetireAge);
    const newDuration = Math.max(0, value - candidateStrategy.careerRetireAge);
    if (diffYears > 0) {
     impactSummary = `再雇用期間+${diffYears}年延長：手取り給与 約+${totalImpact.toLocaleString()}万円 (年額${rehireNet}万×${diffYears}年)`;
    } else {
     impactSummary = `再雇用期間${Math.abs(diffYears)}年短縮：手取り給与 約${totalImpact.toLocaleString()}万円`;
    }
    details = [
     {
      label: `${personName}の再雇用終了年齢`,
      from: dimension.currentValue,
      to: value,
      unit: '歳',
      diffText: `${diffYears > 0 ? '+' : ''}${diffYears}歳`,
      note: diffYears > 0 ? '再雇用の就労期間を延長' : '再雇用の就労期間を短縮',
     },
     {
      label: '再雇用の就労期間',
      from: oldDuration,
      to: newDuration,
      unit: '年間',
      diffText: `${diffYears > 0 ? '+' : ''}${diffYears}年`,
      note: `${candidateStrategy.careerRetireAge}歳〜${value}歳まで`,
     },
     {
      label: '再雇用手取り(年額)',
      from: rehireNet,
      to: rehireNet,
      unit: '万円/年',
      diffText: '同額維持',
     },
     {
      label: '再雇用期間増減による手取り影響額',
      from: 0,
      to: totalImpact,
      unit: '万円',
      diffText: `${totalImpact > 0 ? '+' : ''}${totalImpact.toLocaleString()}万円`,
      note: diffYears > 0 ? `再雇用手取り${rehireNet}万円/年 × ${diffYears}年間` : undefined,
     },
    ];
    break;
   }

   case 'primaryPensionStartAge':
   case 'spousePensionStartAge': {
    const diffYears = value - dimension.currentValue;
    diffText = `${diffYears > 0 ? '+' : ''}${diffYears}歳`;
    const fromRate = calculatePensionRate(dimension.currentValue);
    const toRate = calculatePensionRate(value);
    const rateDiff = Math.round((toRate - fromRate) * 100 * 10) / 10;
    const gross65 = baseStrategy.pensionAge65GrossAnnual;
    const netRatio = baseStrategy.pensionNetRate / 100;
    const fromAnnualNet = Math.round(gross65 * fromRate * netRatio * 10) / 10;
    const toAnnualNet = Math.round(gross65 * toRate * netRatio * 10) / 10;
    const annualNetDiff = Math.round((toAnnualNet - fromAnnualNet) * 10) / 10;
    const monthlyNetDiff = Math.round((annualNetDiff / 12) * 10) / 10;
    const toMonthlyNet = Math.round((toAnnualNet / 12) * 10) / 10;
    const fromMonthlyNet = Math.round((fromAnnualNet / 12) * 10) / 10;

    impactSummary = `受給率 ${(toRate * 100).toFixed(1)}% (${rateDiff >= 0 ? '+' : ''}${rateDiff.toFixed(1)}%)：手取り ${annualNetDiff >= 0 ? '+' : ''}${annualNetDiff.toFixed(1)}万円/年 (月額 ${monthlyNetDiff >= 0 ? '+' : ''}${monthlyNetDiff.toFixed(1)}万円)`;
    details = [
     {
      label: `${personName}の年金受給開始年齢`,
      from: dimension.currentValue,
      to: value,
      unit: '歳',
      diffText: `${diffYears > 0 ? '+' : ''}${diffYears}歳`,
      note: value > 65 ? `65歳から${value - 65}年繰下げ` : value < 65 ? `65歳から${65 - value}年繰上げ` : '65歳標準受給',
     },
     {
      label: '受給改定率(65歳比)',
      from: Math.round(fromRate * 1000) / 10,
      to: Math.round(toRate * 1000) / 10,
      unit: '%',
      diffText: `${rateDiff >= 0 ? '+' : ''}${rateDiff.toFixed(1)}%`,
     },
     {
      label: '年金手取り(年額)',
      from: fromAnnualNet,
      to: toAnnualNet,
      unit: '万円/年',
      diffText: `${annualNetDiff >= 0 ? '+' : ''}${annualNetDiff.toFixed(1)}万円/年`,
     },
     {
      label: '年金手取り(月額換算)',
      from: fromMonthlyNet,
      to: toMonthlyNet,
      unit: '万円/月',
      diffText: `${monthlyNetDiff >= 0 ? '+' : ''}${monthlyNetDiff.toFixed(1)}万円/月`,
     },
    ];
    break;
   }

   case 'primaryRehireIncomeAnnual':
   case 'spouseRehireIncomeAnnual': {
    const diffAnnual = value - dimension.currentValue;
    diffText = `${diffAnnual > 0 ? '+' : ''}${diffAnnual}万円/年`;
    const rehireYears = Math.max(0, candidateStrategy.rehireRetireAge - candidateStrategy.careerRetireAge);
    const totalRehireDiff = Math.round(diffAnnual * rehireYears * 10) / 10;
    impactSummary = `再雇用手取り ${diffAnnual > 0 ? '+' : ''}${diffAnnual}万円/年 (再雇用期間${rehireYears}年で計 ${totalRehireDiff > 0 ? '+' : ''}${totalRehireDiff.toLocaleString()}万円)`;
    details = [
     {
      label: `${personName}の再雇用手取り(年額)`,
      from: dimension.currentValue,
      to: value,
      unit: '万円/年',
      diffText: `${diffAnnual > 0 ? '+' : ''}${diffAnnual}万円/年`,
     },
     {
      label: `再雇用期間(${candidateStrategy.careerRetireAge}〜${candidateStrategy.rehireRetireAge}歳・${rehireYears}年間)総手取り`,
      from: Math.round(dimension.currentValue * rehireYears * 10) / 10,
      to: Math.round(value * rehireYears * 10) / 10,
      unit: '万円',
      diffText: `${totalRehireDiff > 0 ? '+' : ''}${totalRehireDiff.toLocaleString()}万円`,
     },
    ];
    break;
   }

   case 'discretionaryExpenseReductionPercent': {
    diffText = `-${value}% 削減`;
    const baseLifePlan = baseState.lifePlan;
    const candidateLifePlan = candidateState.lifePlan;
    const multiplier = 1 - value / 100;

    const activeDetails: OptimizationAdjustmentDetail[] = baseLifePlan.activeLeisureAnnual.map((item) => {
     const durationYears = Math.max(1, item.endAge - item.startAge + 1);
     const candItem = candidateLifePlan.activeLeisureAnnual.find((c) => c.id === item.id);
     const toAmount = candItem ? candItem.annualAmount : Math.round(item.annualAmount * multiplier * 10) / 10;
     const itemAnnualDiff = Math.round((toAmount - item.annualAmount) * 10) / 10;
     const itemTotalDiff = Math.round(itemAnnualDiff * durationYears * 10) / 10;
     return {
      label: `${item.title} (${item.startAge}-${item.endAge}歳・年額)`,
      from: item.annualAmount,
      to: toAmount,
      unit: '万円/年',
      diffText: `${itemAnnualDiff > 0 ? '+' : ''}${itemAnnualDiff}万円/年`,
      note: `期間${durationYears}年間で計 ${itemTotalDiff}万円 削減`,
     };
    });

    const largeDetails: OptimizationAdjustmentDetail[] = baseLifePlan.largeLeisureOneTimes.map((item) => {
     const candItem = candidateLifePlan.largeLeisureOneTimes.find((c) => c.id === item.id);
     const toAmount = candItem ? candItem.amount : Math.round(item.amount * multiplier * 10) / 10;
     const itemDiff = Math.round((toAmount - item.amount) * 10) / 10;
     return {
      label: `${item.title} (${item.age}歳・単発)`,
      from: item.amount,
      to: toAmount,
      unit: '万円',
      diffText: `${itemDiff > 0 ? '+' : ''}${itemDiff}万円`,
      note: '単発娯楽費の抑制',
     };
    });

    details = [...activeDetails, ...largeDetails];

    const baseActiveSum = baseLifePlan.activeLeisureAnnual.reduce((sum, item) => sum + item.annualAmount, 0);
    const candActiveSum = candidateLifePlan.activeLeisureAnnual.reduce((sum, item) => sum + item.annualAmount, 0);
    const activeAnnualDiff = Math.round((candActiveSum - baseActiveSum) * 10) / 10;

    const activeLifetimeSaved = baseLifePlan.activeLeisureAnnual.reduce(
     (sum, item) => sum + (item.annualAmount - (candidateLifePlan.activeLeisureAnnual.find((c) => c.id === item.id)?.annualAmount ?? item.annualAmount)) * Math.max(1, item.endAge - item.startAge + 1),
     0
    );
    const largeLifetimeSaved = baseLifePlan.largeLeisureOneTimes.reduce(
     (sum, item) => sum + (item.amount - (candidateLifePlan.largeLeisureOneTimes.find((c) => c.id === item.id)?.amount ?? item.amount)),
     0
    );
    const totalLifetimeSaved = Math.round((activeLifetimeSaved + largeLifetimeSaved) * 10) / 10;

    if (baseLifePlan.activeLeisureAnnual.length === 0 && baseLifePlan.largeLeisureOneTimes.length === 0) {
     impactSummary = `削減率${value}% (現在登録されている娯楽費がないため実際の金額削減はありません)`;
    } else {
     impactSummary = `アクティブ娯楽費 年間約 ${activeAnnualDiff}万円 削減 (全期間累計で約 -${totalLifetimeSaved.toFixed(1)}万円 支出抑制)`;
    }
    break;
   }
  }

  const adjustment: OptimizationAdjustment = {
   key: dimension.key,
   label: dimension.label,
   from: dimension.currentValue,
   to: value,
   unit: dimension.unit,
   diffText,
   impactSummary,
   details,
  };

  return [adjustment];
 });
}

function valuesKey(dimensions: SearchDimension[], values: CandidateValues): string {
 return dimensions.map((dimension) => values[dimension.key] ?? dimension.currentValue).join('|');
}

function createCandidate(
 baseState: SimulatorState,
 state: SimulatorState,
 dimensions: SearchDimension[],
 values: CandidateValues
): OptimizationCandidate {
 const records = buildAssetManagementTimeline(state);
 const finalRecord = records[records.length - 1];
 const endingAssets = finalRecord?.totalNetAssets ?? 0;
 const firstDepleted = records.find((record) => record.isDepleted);
 const settings = state.optimization;

 return {
  state,
  endingAssets,
  withinTarget: endingAssets >= (settings.minimumEndingAssets as number) &&
   endingAssets <= (settings.maximumEndingAssets as number),
  firstDepletedAge: firstDepleted?.age ?? null,
  adjustments: getAdjustments(baseState, state, dimensions, values),
 };
}

function rankCandidates(left: OptimizationCandidate, right: OptimizationCandidate, settings: OptimizationSettings): number {
 const leftDepleted = left.firstDepletedAge === null ? 0 : 1;
 const rightDepleted = right.firstDepletedAge === null ? 0 : 1;
 if (leftDepleted !== rightDepleted) return leftDepleted - rightDepleted;
 if (left.withinTarget !== right.withinTarget) return left.withinTarget ? -1 : 1;

 const minimum = settings.minimumEndingAssets as number;
 const maximum = settings.maximumEndingAssets as number;
 const midpoint = (minimum + maximum) / 2;
 const leftTargetDistance = left.withinTarget
  ? Math.abs(left.endingAssets - midpoint)
  : Math.max(minimum - left.endingAssets, 0, left.endingAssets - maximum);
 const rightTargetDistance = right.withinTarget
  ? Math.abs(right.endingAssets - midpoint)
  : Math.max(minimum - right.endingAssets, 0, right.endingAssets - maximum);
 if (leftTargetDistance !== rightTargetDistance) return leftTargetDistance - rightTargetDistance;
 return left.adjustments.length - right.adjustments.length;
}

function isValidCandidate(state: SimulatorState): boolean {
 return state.lifePlan.primaryStrategy.careerRetireAge <= state.lifePlan.primaryStrategy.rehireRetireAge &&
  (state.householdType !== 'couple' ||
   state.lifePlan.spouseStrategy.careerRetireAge <= state.lifePlan.spouseStrategy.rehireRetireAge);
}

export function findOptimizationCandidates(state: SimulatorState): OptimizationSearchResult {
 const errors = validateOptimizationSettings(state.optimization, state.householdType);
 if (errors.length > 0) {
  return { error: errors[0], evaluatedCandidates: 0, baseline: null, candidates: [] };
 }

 const dimensions = getDimensions(state);
 if (dimensions.length === 0) {
  return { error: 'この世帯で変更できる項目を選択してください。', evaluatedCandidates: 0, baseline: null, candidates: [] };
 }

 const baseline = createCandidate(state, structuredClone(state), dimensions, {});
 const candidateCache = new Map<string, OptimizationCandidate>([[valuesKey(dimensions, {}), baseline]]);
 let beam: CandidateValues[] = [{}];

 for (let pass = 0; pass < SEARCH_PASSES; pass++) {
  for (const dimension of dimensions) {
   const expanded = new Map<string, CandidateValues>();
   for (const values of beam) {
    const currentKey = valuesKey(dimensions, values);
    expanded.set(currentKey, values);
    for (const value of getSampleValues(dimension)) {
     const nextValues = { ...values, [dimension.key]: value };
     const key = valuesKey(dimensions, nextValues);
     if (!candidateCache.has(key)) {
      const candidateState = buildCandidateState(state, nextValues);
      if (isValidCandidate(candidateState)) {
      candidateCache.set(key, createCandidate(state, candidateState, dimensions, nextValues));
      }
     }
     if (candidateCache.has(key)) expanded.set(key, nextValues);
    }
   }

   beam = [...expanded.entries()]
    .filter(([key]) => candidateCache.has(key))
    .sort(([leftKey], [rightKey]) => rankCandidates(
     candidateCache.get(leftKey) as OptimizationCandidate,
     candidateCache.get(rightKey) as OptimizationCandidate,
     state.optimization
    ))
    .slice(0, BEAM_WIDTH)
    .map(([, values]) => values);
  }
 }

 const candidates = [...new Set(beam.map((values) => valuesKey(dimensions, values)))]
  .map((key) => candidateCache.get(key))
  .filter((candidate): candidate is OptimizationCandidate => !!candidate && candidate.adjustments.length > 0)
  .sort((left, right) => rankCandidates(left, right, state.optimization))
  .slice(0, MAX_RECOMMENDATIONS);

 return {
  error: null,
  evaluatedCandidates: candidateCache.size,
  baseline,
  candidates,
 };
}