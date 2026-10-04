import { SimulatorState } from './types';
import { createDefaultOptimizationSettings } from './optimizationSettings';

export const CURRENT_STATE_VERSION = 8;

export const DEFAULT_STATE: SimulatorState = {
 version: CURRENT_STATE_VERSION,
 currentStep: 'step1_wall',
 householdType: 'couple',
 perspective: 'primary',
 targetAgeYears: 75,
 primary: {
  name: 'ご本人',
  ageYears: 65,
  ageMonths: 0,
  lifeExpectancyYears: 100,
  pensionBasicMonthly: 6.8,
  pensionEmployeesMonthly: 9.7,
  pensionAge65Monthly: 16.5,
  pensionStartAge: 65,
  careerRetireAge: 65,
  careerMonthlySalary: 35,
  rehireRetireAge: 70,
  rehireMonthlySalary: 12,
 },
 spouse: {
  name: '配偶者',
  ageYears: 62,
  ageMonths: 4,
  lifeExpectancyYears: 100,
  pensionBasicMonthly: 6.8,
  pensionEmployeesMonthly: 0.7,
  pensionAge65Monthly: 7.5,
  pensionStartAge: 65,
  careerRetireAge: 60,
  careerMonthlySalary: 18,
  rehireRetireAge: 65,
  rehireMonthlySalary: 8,
 },
 lifePlan: {
  inflationRate: 1.5,
  investmentReturnRate: 4.0,

  primaryStrategy: {
   careerRetireAge: 65,
   careerNetIncomeAnnual: 420,
   careerSeverancePayNet: 1500,
   rehireRetireAge: 70,
   rehireNetIncomeAnnual: 120,
   rehireSeverancePayNet: 0,
   pensionStartAge: 65,
   pensionAge65GrossAnnual: 198,
   pensionNetRate: 85,
   idecoNetTotal: 300,
   idecoReceiveAge: 65,
   investments: 1200,
   nisaRemainingCap: 600, // 1800 - 1200 = 600万残り
  },

  spouseStrategy: {
   careerRetireAge: 60,
   careerNetIncomeAnnual: 180,
   careerSeverancePayNet: 500,
   rehireRetireAge: 65,
   rehireNetIncomeAnnual: 80,
   rehireSeverancePayNet: 0,
   pensionStartAge: 65,
   pensionAge65GrossAnnual: 90,
   pensionNetRate: 85,
   idecoNetTotal: 0,
   idecoReceiveAge: 65,
   investments: 600,
   nisaRemainingCap: 1200, // 1800 - 600 = 1200万残り
  },

  temporaryIncomes: [
   { id: 'ti-1', title: '親からの相続・生前贈与', age: 67, amount: 300 },
   { id: 'ti-2', title: '満期保険金等', age: 72, amount: 150 },
  ],

  currentCashSavings: 1500,
  limitToNisaCap: true,
  bucket1Cash: 300,
  bucket3Emergency: 500,

  housingCosts: [
   { id: 'hc-1', title: '自宅維持費（管理費・修繕積立・固定資産税）', startAge: 65, endAge: 100, annualAmount: 48 },
  ],

  baseLivingCosts: [
   { id: 'blc-1', title: 'アクティブ期 基本生活費 (食費・光熱費・通信費等)', startAge: 65, endAge: 79, annualAmount: 216 },
   { id: 'blc-2', title: '高齢安定期 基本生活費 (サイズダウン)', startAge: 80, endAge: 100, annualAmount: 180 },
  ],

  activeLeisureAnnual: [
   { id: 'ala-1', title: '旅行・趣味・外食（前期ゴールド期）', startAge: 65, endAge: 74, annualAmount: 60 },
   { id: 'ala-2', title: '近場レジャー・孫への支援（後期期）', startAge: 75, endAge: 84, annualAmount: 30 },
  ],

  unforeseenBudgetAnnual: 20,

  largeLeisureOneTimes: [
   { id: 'll-1', title: '定年退職記念 豪華海外旅行', age: 66, amount: 100 },
   { id: 'll-2', title: '金婚式記念 家族旅行', age: 75, amount: 60 },
  ],

  specialPeriodExpenses: [
   { id: 'spe-1', title: 'マイカー買い替え・維持ローン', startAge: 65, endAge: 72, annualAmount: 40 },
   { id: 'spe-2', title: '孫の大学入学・教育祝金', startAge: 68, endAge: 70, annualAmount: 50 },
  ],
 },
 optimization: createDefaultOptimizationSettings(),
};

export const WALL_THRESHOLDS = {
 TAX_FREE_SINGLE: 155,
 TAX_FREE_COUPLE: 211,
 CARE_20_SINGLE: 280,
 CARE_20_COUPLE: 346,
 CARE_30_SINGLE: 340,
 MEDICAL_30_SINGLE: 383,
 MEDICAL_30_COUPLE: 520,
 MEDICAL_20_LATE_SINGLE: 200,
 MEDICAL_20_LATE_COUPLE: 320,
};