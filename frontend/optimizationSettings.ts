import { AdjustableRange, HouseholdType, OptimizationSettings } from './types';

const createDisabledRange = (): AdjustableRange => ({
 enabled: false,
 minimum: null,
 maximum: null,
});

export function createDefaultOptimizationSettings(): OptimizationSettings {
 return {
  minimumEndingAssets: null,
  maximumEndingAssets: null,
  adjustableRanges: {
   primaryCareerRetireAge: createDisabledRange(),
   primaryRehireRetireAge: createDisabledRange(),
   primaryPensionStartAge: createDisabledRange(),
   primaryRehireIncomeAnnual: createDisabledRange(),
   spouseCareerRetireAge: createDisabledRange(),
   spouseRehireRetireAge: createDisabledRange(),
   spousePensionStartAge: createDisabledRange(),
   spouseRehireIncomeAnnual: createDisabledRange(),
   discretionaryExpenseReductionPercent: createDisabledRange(),
  },
 };
}

function asRecord(value: unknown): Record<string, unknown> {
 return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

function asNonNegativeNumberOrNull(value: unknown): number | null {
 return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function normalizeRange(value: unknown): AdjustableRange {
 const range = asRecord(value);
 return {
  enabled: typeof range.enabled === 'boolean' ? range.enabled : false,
  minimum: asNonNegativeNumberOrNull(range.minimum),
  maximum: asNonNegativeNumberOrNull(range.maximum),
 };
}

export const OPTIMIZATION_RANGE_LIMITS: Record<keyof OptimizationSettings['adjustableRanges'], { minimum: number; maximum: number }> = {
 primaryCareerRetireAge: { minimum: 55, maximum: 90 },
 primaryRehireRetireAge: { minimum: 55, maximum: 90 },
 primaryPensionStartAge: { minimum: 60, maximum: 75 },
 primaryRehireIncomeAnnual: { minimum: 0, maximum: 2000 },
 spouseCareerRetireAge: { minimum: 55, maximum: 90 },
 spouseRehireRetireAge: { minimum: 55, maximum: 90 },
 spousePensionStartAge: { minimum: 60, maximum: 75 },
 spouseRehireIncomeAnnual: { minimum: 0, maximum: 2000 },
 discretionaryExpenseReductionPercent: { minimum: 0, maximum: 100 },
};

export function normalizeOptimizationSettings(value: unknown): OptimizationSettings {
 const source = asRecord(value);
 const ranges = asRecord(source.adjustableRanges);

 return {
  minimumEndingAssets: asNonNegativeNumberOrNull(source.minimumEndingAssets),
  maximumEndingAssets: asNonNegativeNumberOrNull(source.maximumEndingAssets),
  adjustableRanges: {
   primaryCareerRetireAge: normalizeRange(ranges.primaryCareerRetireAge),
   primaryRehireRetireAge: normalizeRange(ranges.primaryRehireRetireAge),
   primaryPensionStartAge: normalizeRange(ranges.primaryPensionStartAge),
   primaryRehireIncomeAnnual: normalizeRange(ranges.primaryRehireIncomeAnnual),
   spouseCareerRetireAge: normalizeRange(ranges.spouseCareerRetireAge),
   spouseRehireRetireAge: normalizeRange(ranges.spouseRehireRetireAge),
   spousePensionStartAge: normalizeRange(ranges.spousePensionStartAge),
   spouseRehireIncomeAnnual: normalizeRange(ranges.spouseRehireIncomeAnnual),
   discretionaryExpenseReductionPercent: normalizeRange(ranges.discretionaryExpenseReductionPercent),
  },
 };
}

export function validateOptimizationSettings(
 settings: OptimizationSettings,
 householdType: HouseholdType = 'couple'
): string[] {
 const errors: string[] = [];
 const applicableRanges = Object.entries(settings.adjustableRanges).filter(([key]) =>
  householdType === 'couple' || !key.startsWith('spouse')
 );

 if (settings.minimumEndingAssets === null || settings.maximumEndingAssets === null) {
  errors.push('想定寿命時点の目標残高の下限と上限を入力してください。');
 } else if (settings.minimumEndingAssets > settings.maximumEndingAssets) {
  errors.push('目標残高の下限は上限以下にしてください。');
 }

 if (!applicableRanges.some(([, range]) => range.enabled)) {
    errors.push('最適化で変更する項目を1つ以上選択してください。');
 }

 for (const [key, range] of applicableRanges) {
  if (!range.enabled) continue;
    const limits = OPTIMIZATION_RANGE_LIMITS[key as keyof OptimizationSettings['adjustableRanges']];
  if (range.minimum === null || range.maximum === null) {
   errors.push(`${key}の最小値と最大値を入力してください。`);
  } else if (range.minimum > range.maximum) {
   errors.push(`${key}の最小値は最大値以下にしてください。`);
    } else if (range.minimum < limits.minimum || range.maximum > limits.maximum) {
     errors.push(`${key}は${limits.minimum}から${limits.maximum}の範囲で入力してください。`);
  }
 }

 return errors;
}