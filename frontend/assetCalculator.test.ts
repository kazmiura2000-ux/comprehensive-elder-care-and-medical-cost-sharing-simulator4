import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE } from './constants';
import { buildAssetManagementTimeline } from './assetCalculator';
import { buildLifePlanTimeline } from './lifePlanCalculator';
import { findOptimizationCandidates } from './lifePlanOptimizer';
import { normalizeOptimizationSettings, validateOptimizationSettings } from './optimizationSettings';
import { SimulatorState } from './types';

function createBaseState(): SimulatorState {
 const state = structuredClone(DEFAULT_STATE);
 state.householdType = 'single';
 state.primary.ageYears = 65;
 state.primary.ageMonths = 0;
 state.primary.lifeExpectancyYears = 100;
 state.spouse.ageYears = 65;
 state.spouse.ageMonths = 0;
 state.spouse.lifeExpectancyYears = 100;

 state.lifePlan.inflationRate = 0;
 state.lifePlan.investmentReturnRate = 0;
 state.lifePlan.temporaryIncomes = [];
 state.lifePlan.housingCosts = [];
 state.lifePlan.baseLivingCosts = [];
 state.lifePlan.activeLeisureAnnual = [];
 state.lifePlan.unforeseenBudgetAnnual = 0;
 state.lifePlan.largeLeisureOneTimes = [];
 state.lifePlan.specialPeriodExpenses = [];
 state.lifePlan.currentCashSavings = 0;
 state.lifePlan.bucket1Cash = 0;
 state.lifePlan.bucket3Emergency = 0;
 state.lifePlan.limitToNisaCap = false;

 state.lifePlan.primaryStrategy = {
  ...state.lifePlan.primaryStrategy,
  careerRetireAge: 65,
  careerNetIncomeAnnual: 0,
  careerSeverancePayNet: 0,
  rehireRetireAge: 65,
  rehireNetIncomeAnnual: 0,
  rehireSeverancePayNet: 0,
  pensionStartAge: 65,
  pensionAge65GrossAnnual: 0,
  pensionNetRate: 100,
  idecoNetTotal: 0,
  investments: 0,
  nisaRemainingCap: 1800,
 };
 state.lifePlan.spouseStrategy = {
  ...state.lifePlan.spouseStrategy,
  careerRetireAge: 65,
  careerNetIncomeAnnual: 0,
  careerSeverancePayNet: 0,
  rehireRetireAge: 65,
  rehireNetIncomeAnnual: 0,
  rehireSeverancePayNet: 0,
  pensionStartAge: 65,
  pensionAge65GrossAnnual: 0,
  pensionNetRate: 100,
  idecoNetTotal: 0,
  investments: 0,
  nisaRemainingCap: 1800,
 };

 return state;
}

describe('asset timeline calculation baselines', () => {
 it('keeps the step 2 and step 3 asset totals aligned with surplus cash', () => {
  const state = createBaseState();
  state.primary.lifeExpectancyYears = 67;
  state.lifePlan.primaryStrategy.pensionAge65GrossAnnual = 120;
  state.lifePlan.primaryStrategy.investments = 100;
  state.lifePlan.primaryStrategy.nisaRemainingCap = 1700;
  state.lifePlan.currentCashSavings = 200;
  state.lifePlan.bucket1Cash = 50;
  state.lifePlan.bucket3Emergency = 50;
  state.lifePlan.limitToNisaCap = true;
  state.lifePlan.baseLivingCosts = [
   { id: 'living', title: 'Living costs', startAge: 65, endAge: 100, annualAmount: 100 },
  ];

  const lifePlan = buildLifePlanTimeline(state).slice(0, 3);
  const assets = buildAssetManagementTimeline(state).slice(0, 3);

  expect(lifePlan.map((record) => record.totalAssets)).toEqual([320, 340, 240]);
  expect(assets.map((record) => record.totalNetAssets)).toEqual([320, 340, 240]);
  expect(lifePlan.map((record) => record.surplusCashBalance)).toEqual([100, 100, 0]);
  expect(assets.map((record) => record.surplusCashBalance)).toEqual([100, 100, 0]);
 });

 it('reduces single-owner accounts by exactly the recorded withdrawals', () => {
  const state = createBaseState();
  state.primary.lifeExpectancyYears = 67;
  state.lifePlan.primaryStrategy.investments = 500;
  state.lifePlan.primaryStrategy.nisaRemainingCap = 1500;
  state.lifePlan.currentCashSavings = 500;
  state.lifePlan.bucket1Cash = 50;
  state.lifePlan.bucket3Emergency = 100;
  state.lifePlan.baseLivingCosts = [
   { id: 'living', title: 'Living costs', startAge: 65, endAge: 100, annualAmount: 300 },
  ];

  const records = buildAssetManagementTimeline(state).slice(0, 3);
  const withdrawals = records.map(
   (record) =>
    record.withdrawFromSurplusCash +
    record.withdrawFromTaxable +
    record.withdrawFromNisa +
    record.usedEmergencyBuffer
  );

  expect(records.map((record) => record.totalNetAssets)).toEqual([700, 400, 100]);
  expect(withdrawals).toEqual([300, 300, 300]);
  expect(records.map((record) => [record.nisaBalance, record.taxableBalance])).toEqual([
   [300, 200],
   [250, 0],
   [0, 0],
  ]);
  expect(records.map((record) => record.bucket1Balance + record.bucket3Balance)).toEqual([150, 150, 100]);
 });

 it('moves a deceased owner NISA balance to taxable assets without inheriting the NISA allowance', () => {
  const state = createBaseState();
  state.householdType = 'couple';
  state.primary.lifeExpectancyYears = 65;
  state.spouse.lifeExpectancyYears = 80;
  state.lifePlan.primaryStrategy.investments = 100;
  state.lifePlan.primaryStrategy.nisaRemainingCap = 1700;
  state.lifePlan.spouseStrategy.investments = 200;
  state.lifePlan.spouseStrategy.nisaRemainingCap = 1600;
  state.lifePlan.spouseStrategy.pensionAge65GrossAnnual = 120;
  state.lifePlan.currentCashSavings = 100;
  state.lifePlan.bucket1Cash = 10;
  state.lifePlan.bucket3Emergency = 10;
  state.lifePlan.baseLivingCosts = [
    { id: 'living', title: 'Living costs', startAge: 65, endAge: 100, annualAmount: 100 },
  ];

  const lifePlan = buildLifePlanTimeline(state)[0];
  const assets = buildAssetManagementTimeline(state)[0];

  expect(lifePlan.isTransitionToSingle).toBe(true);
  expect(lifePlan.totalAssets).toBe(524.2);
  expect(assets.totalNetAssets).toBe(524.2);
  expect(assets.inheritedTransferredToTaxable).toBe(100);
  expect(assets.taxableBalance).toBe(100);
  expect(assets.nisaBalance).toBe(324.2);
  expect(assets).not.toHaveProperty('inheritedRolloverToNisa');
 });

 it('keeps the same inheritance treatment when the spouse passes first', () => {
  const state = createBaseState();
  state.householdType = 'couple';
  state.primary.lifeExpectancyYears = 80;
  state.spouse.lifeExpectancyYears = 65;
  state.lifePlan.primaryStrategy.investments = 100;
  state.lifePlan.primaryStrategy.nisaRemainingCap = 1700;
  state.lifePlan.primaryStrategy.pensionAge65GrossAnnual = 120;
  state.lifePlan.spouseStrategy.investments = 200;
  state.lifePlan.spouseStrategy.nisaRemainingCap = 1600;
  state.lifePlan.currentCashSavings = 100;
  state.lifePlan.bucket1Cash = 10;
  state.lifePlan.bucket3Emergency = 10;
  state.lifePlan.baseLivingCosts = [
   { id: 'living', title: 'Living costs', startAge: 65, endAge: 100, annualAmount: 100 },
  ];

  const lifePlan = buildLifePlanTimeline(state)[0];
  const assets = buildAssetManagementTimeline(state)[0];

  expect(lifePlan.isTransitionToSingle).toBe(true);
  expect(lifePlan.firstPassingPersonName).toBe(state.spouse.name);
  expect(lifePlan.totalAssets).toBe(445);
  expect(assets.totalNetAssets).toBe(445);
  expect(assets.inheritedTransferredToTaxable).toBe(200);
  expect(assets.taxableBalance).toBe(200);
  expect(assets.nisaBalance).toBe(145);
 });

 it('restores sold NISA principal room in the following year', () => {
  const state = createBaseState();
  state.primary.lifeExpectancyYears = 66;
  state.lifePlan.limitToNisaCap = true;
  state.lifePlan.primaryStrategy.investments = 1800;
  state.lifePlan.primaryStrategy.nisaRemainingCap = 0;
  state.lifePlan.largeLeisureOneTimes = [
   { id: 'trip', title: 'One-time expense', age: 65, amount: 360 },
  ];
  state.lifePlan.temporaryIncomes = [{ id: 'income', title: 'One-time income', age: 66, amount: 500 }];

  const records = buildAssetManagementTimeline(state).slice(0, 2);

  expect(records[0].withdrawFromNisa).toBe(360);
  expect(records[0].nisaCumulativeContributed).toBe(1800);
  expect(records[1].investToNisa).toBe(360);
  expect(records[1].nisaBalance).toBe(1800);
  expect(records[1].surplusCashBalance).toBe(140);
 });

 it('retains existing investments above the NISA cap in the taxable account', () => {
  const state = createBaseState();
  state.primary.lifeExpectancyYears = 66;
  state.lifePlan.limitToNisaCap = true;
  state.lifePlan.primaryStrategy.investments = 2200;
  state.lifePlan.primaryStrategy.nisaRemainingCap = 0;
  state.lifePlan.currentCashSavings = 500;
  state.lifePlan.bucket1Cash = 150;
  state.lifePlan.bucket3Emergency = 200;

  const lifePlan = buildLifePlanTimeline(state)[0];
  const assets = buildAssetManagementTimeline(state)[0];

  expect(lifePlan.totalAssets).toBe(2700);
  expect(assets.totalNetAssets).toBe(2700);
  expect(assets.nisaBalance).toBe(1800);
  expect(assets.taxableBalance).toBe(400);
  expect(assets.surplusCashBalance).toBe(150);
 });

 it('includes estimated capital-gains tax in taxable sale proceeds', () => {
  const state = createBaseState();
  state.primary.lifeExpectancyYears = 65;
  state.lifePlan.investmentReturnRate = 10;
  state.lifePlan.primaryStrategy.investments = 1500;
  state.lifePlan.primaryStrategy.nisaRemainingCap = 1800;
  state.lifePlan.baseLivingCosts = [
   { id: 'living', title: 'Living costs', startAge: 65, endAge: 100, annualAmount: 100 },
  ];

  const record = buildAssetManagementTimeline(state)[0];

  expect(record.withdrawFromTaxable).toBe(101.9);
  expect(record.taxableSaleTax).toBe(1.9);
  expect(record.withdrawFromTaxable - record.taxableSaleTax).toBe(100);
  expect(record.annualCashFlow).toBe(-101.9);
  expect(record.totalNetAssets).toBe(1548.1);
 });

 it('does not charge capital-gains tax on a taxable-account loss', () => {
  const state = createBaseState();
  state.primary.lifeExpectancyYears = 65;
  state.lifePlan.investmentReturnRate = -10;
  state.lifePlan.primaryStrategy.investments = 1500;
  state.lifePlan.primaryStrategy.nisaRemainingCap = 1800;
  state.lifePlan.baseLivingCosts = [
   { id: 'living', title: 'Living costs', startAge: 65, endAge: 100, annualAmount: 100 },
  ];

  const record = buildAssetManagementTimeline(state)[0];

  expect(record.withdrawFromTaxable).toBe(100);
  expect(record.taxableSaleTax).toBe(0);
  expect(record.annualCashFlow).toBe(-100);
  expect(record.totalNetAssets).toBe(1250);
 });

 it('fills optimization defaults when loading settings from an older saved state', () => {
  const settings = normalizeOptimizationSettings(undefined);

  expect(settings.minimumEndingAssets).toBeNull();
  expect(settings.maximumEndingAssets).toBeNull();
  expect(Object.values(settings.adjustableRanges).every((range) =>
   !range.enabled && range.minimum === null && range.maximum === null
  )).toBe(true);
 });

 it('requires a complete target range and valid bounds for enabled adjustments', () => {
  const settings = normalizeOptimizationSettings({
   minimumEndingAssets: 500,
   maximumEndingAssets: 300,
   adjustableRanges: {
    primaryPensionStartAge: { enabled: true, minimum: 70, maximum: 65 },
   },
  });

  expect(validateOptimizationSettings(settings)).toContain('目標残高の下限は上限以下にしてください。');
  expect(validateOptimizationSettings(settings)).toContain(
   'primaryPensionStartAgeの最小値は最大値以下にしてください。'
  );

  settings.maximumEndingAssets = 1000;
  settings.adjustableRanges.primaryPensionStartAge.minimum = 60;
  settings.adjustableRanges.primaryPensionStartAge.maximum = 75;
  expect(validateOptimizationSettings(settings)).toEqual([]);
 });

 it('does not change current calculations when only optimization settings change', () => {
  const baseline = createBaseState();
  baseline.primary.lifeExpectancyYears = 66;
  baseline.lifePlan.primaryStrategy.investments = 500;
  baseline.lifePlan.primaryStrategy.nisaRemainingCap = 1500;
  baseline.lifePlan.currentCashSavings = 500;
  baseline.lifePlan.bucket1Cash = 50;
  baseline.lifePlan.bucket3Emergency = 100;
  baseline.lifePlan.baseLivingCosts = [
   { id: 'living', title: 'Living costs', startAge: 65, endAge: 100, annualAmount: 300 },
  ];
  const withOptimizationSettings = structuredClone(baseline);
  withOptimizationSettings.optimization = normalizeOptimizationSettings({
   minimumEndingAssets: 100,
   maximumEndingAssets: 500,
   adjustableRanges: {
    primaryPensionStartAge: { enabled: true, minimum: 60, maximum: 70 },
   },
  });

  expect(buildAssetManagementTimeline(withOptimizationSettings)).toEqual(
   buildAssetManagementTimeline(baseline)
  );
 });

 it('finds a no-depletion candidate inside the target without applying it automatically', () => {
  const state = createBaseState();
  state.primary.lifeExpectancyYears = 66;
  state.lifePlan.currentCashSavings = 50;
  state.lifePlan.primaryStrategy.careerRetireAge = 60;
  state.lifePlan.primaryStrategy.rehireRetireAge = 66;
  state.lifePlan.baseLivingCosts = [
    { id: 'living', title: 'Living costs', startAge: 65, endAge: 65, annualAmount: 100 },
  ];
  state.optimization.minimumEndingAssets = 50;
  state.optimization.maximumEndingAssets = 50;
  state.optimization.adjustableRanges.primaryRehireIncomeAnnual = {
   enabled: true,
   minimum: 0,
   maximum: 100,
  };

  const result = findOptimizationCandidates(state);

  expect(result.error).toBeNull();
  expect(result.baseline?.endingAssets).toBe(0);
  expect(result.candidates[0].withinTarget).toBe(true);
  expect(result.candidates[0].firstDepletedAge).toBeNull();
  expect(result.candidates[0].state.lifePlan.primaryStrategy.rehireNetIncomeAnnual).toBe(100);
  expect(state.lifePlan.primaryStrategy.rehireNetIncomeAnnual).toBe(0);
 });

 it('shows the exact annual and one-time expense changes for a discretionary reduction', () => {
  const state = createBaseState();
  state.primary.lifeExpectancyYears = 66;
  state.lifePlan.currentCashSavings = 1000;
  state.lifePlan.activeLeisureAnnual = [
   { id: 'travel', title: '旅行・趣味', startAge: 65, endAge: 70, annualAmount: 60 },
  ];
  state.lifePlan.largeLeisureOneTimes = [
   { id: 'trip', title: '記念旅行', age: 65, amount: 50 },
  ];
  state.optimization.minimumEndingAssets = 0;
  state.optimization.maximumEndingAssets = 10000;
  state.optimization.adjustableRanges.discretionaryExpenseReductionPercent = {
   enabled: true,
   minimum: 0,
   maximum: 20,
  };

  const result = findOptimizationCandidates(state);
  const twentyPercentCandidate = result.candidates.find((candidate) =>
   candidate.adjustments.some((adjustment) => adjustment.to === 20)
  );

  expect(twentyPercentCandidate).toBeDefined();
  expect(twentyPercentCandidate?.adjustments[0].details).toEqual([
   {
    label: '旅行・趣味 (65-70歳・年額)',
    from: 60,
    to: 48,
    unit: '万円/年',
    diffText: '-12万円/年',
    note: '期間6年間で計 -72万円 削減',
   },
   {
    label: '記念旅行 (65歳・単発)',
    from: 50,
    to: 40,
    unit: '万円',
    diffText: '-10万円',
    note: '単発娯楽費の抑制',
   },
  ]);
 });

 it('adjusts primary rehire retire age and calculates duration and income impacts', () => {
  const state = createBaseState();
  state.primary.lifeExpectancyYears = 75;
  state.lifePlan.primaryStrategy.careerRetireAge = 60;
  state.lifePlan.primaryStrategy.rehireRetireAge = 65;
  state.lifePlan.primaryStrategy.rehireNetIncomeAnnual = 240;
  state.optimization.minimumEndingAssets = 0;
  state.optimization.maximumEndingAssets = 50000;
  state.optimization.adjustableRanges.primaryRehireRetireAge = {
   enabled: true,
   minimum: 65,
   maximum: 70,
  };

  const result = findOptimizationCandidates(state);
  const extendedCandidate = result.candidates.find((candidate) =>
   candidate.adjustments.some((adj) => adj.key === 'primaryRehireRetireAge' && adj.to === 70)
  );

  expect(extendedCandidate).toBeDefined();
  const rehireAdj = extendedCandidate?.adjustments.find((adj) => adj.key === 'primaryRehireRetireAge');
  expect(rehireAdj?.from).toBe(65);
  expect(rehireAdj?.to).toBe(70);
  expect(rehireAdj?.diffText).toBe('+5歳');
  expect(rehireAdj?.impactSummary).toContain('再雇用期間+5年延長');
 });
});