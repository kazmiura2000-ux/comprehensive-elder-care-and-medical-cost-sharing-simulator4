export type HouseholdType = 'single' | 'couple';
export type ActivePerspective = 'primary' | 'spouse' | 'both';

export type AppStep = 'step1_wall' | 'step2_lifeplan' | 'step3_asset';
export type AppViewMode = 'matrix' | 'timeline';

export interface PersonProfile {
 name: string;
 ageYears: number;
 ageMonths: number;
 lifeExpectancyYears: number;
 pensionBasicMonthly: number;
 pensionEmployeesMonthly: number;
 pensionAge65Monthly: number;
 pensionStartAge: number;
 careerRetireAge: number;
 careerMonthlySalary: number;
 rehireRetireAge: number;
 rehireMonthlySalary: number;
}

export interface PeriodItem {
 id: string;
 title: string;
 startAge: number;
 endAge: number;
 annualAmount: number;
}

export interface OneTimeItem {
 id: string;
 title: string;
 age: number;
 amount: number;
}

export interface PersonIncomeStrategy {
 careerRetireAge: number;
 careerNetIncomeAnnual: number;
 careerSeverancePayNet: number;
 rehireRetireAge: number;
 rehireNetIncomeAnnual: number;
 rehireSeverancePayNet: number;
 pensionStartAge: number;
 pensionAge65GrossAnnual: number;
 pensionNetRate: number;
 idecoNetTotal: number;
 idecoReceiveAge: number;
 investments: number;
 nisaRemainingCap: number; // NISA生涯枠の残り（最大1800万）
}

export interface LifePlanConfig {
 inflationRate: number;
 investmentReturnRate: number;

 primaryStrategy: PersonIncomeStrategy;
 spouseStrategy: PersonIncomeStrategy;
 temporaryIncomes: OneTimeItem[];

 currentCashSavings: number;
 limitToNisaCap: boolean;
 bucket1Cash: number;
 bucket3Emergency: number;

 housingCosts: PeriodItem[];
 baseLivingCosts: PeriodItem[];
 activeLeisureAnnual: PeriodItem[];
 unforeseenBudgetAnnual: number;
 largeLeisureOneTimes: OneTimeItem[];
 specialPeriodExpenses: PeriodItem[];
}

export interface AdjustableRange {
 enabled: boolean;
 minimum: number | null;
 maximum: number | null;
}

export interface OptimizationSettings {
 minimumEndingAssets: number | null;
 maximumEndingAssets: number | null;
 adjustableRanges: {
  primaryCareerRetireAge: AdjustableRange;
  primaryPensionStartAge: AdjustableRange;
  primaryRehireIncomeAnnual: AdjustableRange;
  spouseCareerRetireAge: AdjustableRange;
  spousePensionStartAge: AdjustableRange;
  spouseRehireIncomeAnnual: AdjustableRange;
  discretionaryExpenseReductionPercent: AdjustableRange;
 };
}

export interface SimulatorState {
 version: number;
 currentStep: AppStep;
 householdType: HouseholdType;
 perspective: ActivePerspective;
 targetAgeYears: number;
 primary: PersonProfile;
 spouse: PersonProfile;
 lifePlan: LifePlanConfig;
 optimization: OptimizationSettings;
}

export type ZoneType = 'A' | 'B' | 'C';

export interface CalculationResult {
 personAge: number;
 personAgeMonths: number;
 isDeceased: boolean;
 isSpouseDeceased: boolean;
 pensionGrossAnnual: number;
 pensionGrossMonthly: number;
 pensionNetMonthly: number;
 survivorPensionMonthly: number;
 survivorPensionAnnual: number;
 salaryGrossAnnual: number;
 salaryGrossMonthly: number;
 totalGrossIncomeAnnual: number;
 householdGrossAnnual: number;
 netDisposableIncomeMonthly: number;
 householdNetDisposableIncomeMonthly: number;

 isTaxFree: boolean;
 careInsuranceRate: 1 | 2 | 3;
 medicalInsuranceRate: 1 | 2 | 3;
 highCostCareLimitMonthly: number;
 highCostMedicalLimitMonthly: number;
 hasNursingHomeFoodSubsidy: boolean;
 zone: ZoneType;

 taxFreeWallMargin: number;
 care20WallMargin: number;
 medical30WallMargin: number;
}

export interface MatrixCellData {
 rowOffset: number;
 colOffset: number;
 pensionStartAge: number;
 salaryModifierLabel: string;
 pensionModifierLabel: string;
 result: CalculationResult;
}

export interface LifetimeYearlyRecord {
 age: number;
 spouseAge: number | null;
 isSinglePeriod: boolean;
 isTransitionToSingle: boolean;
 whoPassedFirst: 'primary' | 'spouse' | 'none';
 firstPassingPersonName: string;
 survivorPersonName: string;
 firstPassingAgeText: string;
 isSpouseDeceased: boolean;
 isPrimaryDeceased: boolean;
 householdGrossAnnual: number;
 primaryGrossAnnual: number;
 spouseGrossAnnual: number;
 pensionGrossAnnual: number;
 survivorPensionMonthly: number;
 salaryGrossAnnual: number;
 netDisposableIncomeMonthly: number;
 householdNetDisposableIncomeMonthly: number;
 isTaxFree: boolean;
 zone: ZoneType;
 careRate: 1 | 2 | 3;
 medicalRate: 1 | 2 | 3;
 hasNursingHomeFoodSubsidy: boolean;
 highCostCareLimitMonthly: number;
 highCostMedicalLimitMonthly: number;
 keyMilestone?: string;
}

export interface LifePlanYearRecord {
 year: number;
 age: number;
 spouseAge: number | null;
 isSpouseDeceased: boolean;
 isPrimaryDeceased: boolean;
 isSinglePeriod: boolean;
 isTransitionToSingle: boolean;
 whoPassedFirst: 'primary' | 'spouse' | 'none';
 firstPassingPersonName: string;
 survivorPersonName: string;
 firstPassingAgeText: string;

 primaryWorkNet: number;
 spouseWorkNet: number;
 primarySeveranceNet: number;
 spouseSeveranceNet: number;
 primaryPensionNet: number;
 spousePensionNet: number;
 survivorPensionNet: number;
 idecoNet: number;
 temporaryIncomeTotal: number;
 totalNetIncome: number;

 housingExpense: number;
 baseLivingExpense: number;
 activeLeisureExpense: number;
 unforeseenExpense: number;
 largeLeisureExpense: number;
 specialPeriodExpense: number;
 totalExpense: number;

 annualCashFlow: number;

 surplusCashBalance: number;
 bucket1Balance: number;
 bucket2Balance: number;
 bucket3Balance: number;
 totalAssets: number;

 eventLabel?: string;
 isDeficit: boolean;
}

export interface AssetYearRecord {
 year: number;
 age: number;
 spouseAge: number | null;
 isSpouseDeceased: boolean;
 isPrimaryDeceased: boolean;
 isSinglePeriod: boolean;
 isTransitionToSingle: boolean;
 firstPassingPersonName: string;
 survivorPersonName: string;
 firstPassingAgeText: string;

 totalNetIncome: number;
 totalExpense: number;
 annualCashFlow: number;

 investToNisa: number;
 investToTaxable: number;
 inheritedTransferredToTaxable?: number;
 taxableSaleTax: number;

 withdrawFromSurplusCash: number;
 withdrawFromTaxable: number;
 withdrawFromNisa: number;
 usedEmergencyBuffer: number;

 nisaBalance: number;
 nisaCumulativeContributed: number;
 taxableBalance: number;
 surplusCashBalance: number;
 bucket1Balance: number;
 bucket3Balance: number;
 totalNetAssets: number;

 // Detailed breakdown for Bucket 2
 primaryNisaPrincipal: number;
 primaryNisaProfit: number;
 primaryTaxablePrincipal: number;
 primaryTaxableProfit: number;

 spouseNisaPrincipal: number;
 spouseNisaProfit: number;
 spouseTaxablePrincipal: number;
 spouseTaxableProfit: number;

 isNisaCapped: boolean;
 isDepleted: boolean;
 eventLabel?: string;
}