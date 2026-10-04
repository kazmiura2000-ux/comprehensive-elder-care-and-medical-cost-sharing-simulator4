import { SimulatorState, PersonProfile, CalculationResult, ZoneType, MatrixCellData, LifetimeYearlyRecord } from './types';
import { WALL_THRESHOLDS } from './constants';

export function calculatePensionRate(startAge: number): number {
 if (startAge < 65) {
  const monthsEarly = (65 - startAge) * 12;
  return Math.max(0.76, 1 - monthsEarly * 0.004);
 } else if (startAge > 65) {
  const monthsLate = (startAge - 65) * 12;
  return 1 + monthsLate * 0.007;
 }
 return 1.0;
}

export function getMonthlySalaryAtAge(profile: PersonProfile, age: number, salaryScale: number = 1.0): number {
 let baseSalary = 0;
 if (age < profile.careerRetireAge) {
  baseSalary = profile.careerMonthlySalary;
 } else if (age < profile.rehireRetireAge) {
  baseSalary = profile.rehireMonthlySalary;
 } else {
  baseSalary = 0;
 }
 return Math.max(0, baseSalary * salaryScale);
}

export function calculateSurvivorPensionMonthly(
 deceasedProfile: PersonProfile,
 survivorProfile: PersonProfile,
 survivorAgeYears: number
): number {
 const deceasedEmployees3Quarter = deceasedProfile.pensionEmployeesMonthly * 0.75;

 let ownEmployeesPensionMonthly = 0;
 if (survivorAgeYears >= survivorProfile.pensionStartAge) {
  ownEmployeesPensionMonthly = survivorProfile.pensionEmployeesMonthly;
 }

 const survivorPension = Math.max(0, deceasedEmployees3Quarter - ownEmployeesPensionMonthly);
 return Math.round(survivorPension * 10) / 10;
}

export function evaluatePersonSituation(
 profile: PersonProfile,
 ageInMonthsTotal: number,
 otherProfile: PersonProfile | null,
 otherAgeMonthsTotal: number | null,
 isSingleHousehold: boolean,
 pensionAgeOverride?: number,
 salaryScaleModifier: number = 1.0
): CalculationResult {
 const currentAgeYears = Math.floor(ageInMonthsTotal / 12);
 const currentAgeMonths = ageInMonthsTotal % 12;

 const isDeceased = currentAgeYears >= profile.lifeExpectancyYears;

 let isSpouseDeceased = false;
 let otherAgeYears = 0;
 if (!isSingleHousehold && otherProfile && otherAgeMonthsTotal !== null) {
  otherAgeYears = Math.floor(otherAgeMonthsTotal / 12);
  isSpouseDeceased = otherAgeYears >= otherProfile.lifeExpectancyYears;
 }

 const isBereavedSingle = !isSingleHousehold && otherProfile !== null && isSpouseDeceased && !isDeceased;
 const isEffectiveSingle = isSingleHousehold || isBereavedSingle;

 const actualStartAge = pensionAgeOverride !== undefined ? pensionAgeOverride : profile.pensionStartAge;
 const pensionRate = calculatePensionRate(actualStartAge);

 const baseMonthlyTotal =
  (profile.pensionBasicMonthly || 0) + (profile.pensionEmployeesMonthly || 0) > 0
   ? profile.pensionBasicMonthly + profile.pensionEmployeesMonthly
   : profile.pensionAge65Monthly;

 let pensionGrossMonthly = 0;
 if (currentAgeYears >= actualStartAge && !isDeceased) {
  pensionGrossMonthly = baseMonthlyTotal * pensionRate;
 }
 const pensionGrossAnnual = pensionGrossMonthly * 12;
 const pensionNetMonthly = Math.round(pensionGrossMonthly * 0.85 * 10) / 10;

 let survivorPensionMonthly = 0;
 if (isBereavedSingle && otherProfile && !isDeceased) {
  survivorPensionMonthly = calculateSurvivorPensionMonthly(otherProfile, profile, currentAgeYears);
 }
 const survivorPensionAnnual = survivorPensionMonthly * 12;

 const salaryGrossMonthly = !isDeceased ? getMonthlySalaryAtAge(profile, currentAgeYears, salaryScaleModifier) : 0;
 const salaryGrossAnnual = salaryGrossMonthly * 12;

 const totalGrossIncomeAnnual = pensionGrossAnnual + salaryGrossAnnual;

 let householdGrossAnnual = totalGrossIncomeAnnual;
 let spouseNetMonthly = 0;

 if (!isEffectiveSingle && otherProfile && otherAgeMonthsTotal !== null && !isSpouseDeceased) {
  const otherPensionRate = calculatePensionRate(otherProfile.pensionStartAge);
  const otherBaseMonthly =
   (otherProfile.pensionBasicMonthly || 0) + (otherProfile.pensionEmployeesMonthly || 0) > 0
    ? otherProfile.pensionBasicMonthly + otherProfile.pensionEmployeesMonthly
    : otherProfile.pensionAge65Monthly;

  const otherPensionMonthly = otherAgeYears >= otherProfile.pensionStartAge ? otherBaseMonthly * otherPensionRate : 0;
  const otherSalaryMonthly = getMonthlySalaryAtAge(otherProfile, otherAgeYears, 1.0);
  householdGrossAnnual += (otherPensionMonthly + otherSalaryMonthly) * 12;

  const otherPensionNet = Math.round(otherPensionMonthly * 0.85 * 10) / 10;
  const otherSalaryNet = Math.round(otherSalaryMonthly * 0.8 * 10) / 10;
  spouseNetMonthly = otherPensionNet + otherSalaryNet;
 }

 const taxFreeThreshold = isEffectiveSingle ? WALL_THRESHOLDS.TAX_FREE_SINGLE : WALL_THRESHOLDS.TAX_FREE_COUPLE;
 const isTaxFree = householdGrossAnnual <= taxFreeThreshold;

 let careInsuranceRate: 1 | 2 | 3 = 1;
 const care20Limit = isEffectiveSingle ? WALL_THRESHOLDS.CARE_20_SINGLE : WALL_THRESHOLDS.CARE_20_COUPLE;
 const care30Limit = isEffectiveSingle ? WALL_THRESHOLDS.CARE_30_SINGLE : 463;
 if (householdGrossAnnual >= care30Limit) {
  careInsuranceRate = 3;
 } else if (householdGrossAnnual >= care20Limit) {
  careInsuranceRate = 2;
 } else {
  careInsuranceRate = 1;
 }

 let medicalInsuranceRate: 1 | 2 | 3 = 1;
 const medical30Limit = isEffectiveSingle ? WALL_THRESHOLDS.MEDICAL_30_SINGLE : WALL_THRESHOLDS.MEDICAL_30_COUPLE;
 const medical20LateLimit = isEffectiveSingle ? WALL_THRESHOLDS.MEDICAL_20_LATE_SINGLE : WALL_THRESHOLDS.MEDICAL_20_LATE_COUPLE;

 if (currentAgeYears < 70) {
  medicalInsuranceRate = 3;
 } else if (currentAgeYears >= 70 && currentAgeYears < 75) {
  if (householdGrossAnnual >= medical30Limit) {
   medicalInsuranceRate = 3;
  } else {
   medicalInsuranceRate = 2;
  }
 } else {
  if (householdGrossAnnual >= medical30Limit) {
   medicalInsuranceRate = 3;
  } else if (householdGrossAnnual >= medical20LateLimit && !isTaxFree) {
   medicalInsuranceRate = 2;
  } else {
   medicalInsuranceRate = 1;
  }
 }

 let highCostCareLimitMonthly = 44400;
 let hasNursingHomeFoodSubsidy = false;

 if (isTaxFree) {
  highCostCareLimitMonthly = 24600;
  hasNursingHomeFoodSubsidy = true;
 } else if (careInsuranceRate === 3) {
  highCostCareLimitMonthly = 93000;
 } else {
  highCostCareLimitMonthly = 44400;
 }

 let highCostMedicalLimitMonthly = 57600;
 if (currentAgeYears >= 70) {
  if (isTaxFree) {
   highCostMedicalLimitMonthly = 24600;
  } else if (householdGrossAnnual >= medical30Limit) {
   highCostMedicalLimitMonthly = 80100;
  } else {
   highCostMedicalLimitMonthly = 57600;
  }
 } else {
  if (householdGrossAnnual < 370) {
   highCostMedicalLimitMonthly = 57600;
  } else if (householdGrossAnnual < 770) {
   highCostMedicalLimitMonthly = 80100;
  } else {
   highCostMedicalLimitMonthly = 167400;
  }
 }

 let zone: ZoneType = 'B';
 if (isTaxFree) {
  zone = 'A';
 } else if (careInsuranceRate >= 2 || medicalInsuranceRate === 3 || householdGrossAnnual >= care20Limit) {
  zone = 'C';
 } else {
  zone = 'B';
 }

 const salaryNetMonthly = Math.round(salaryGrossMonthly * 0.8 * 10) / 10;
 const netDisposableIncomeMonthly = !isDeceased
  ? Math.round((pensionNetMonthly + survivorPensionMonthly + salaryNetMonthly) * 10) / 10
  : 0;

 const householdNetDisposableIncomeMonthly = isEffectiveSingle
  ? netDisposableIncomeMonthly
  : Math.round((netDisposableIncomeMonthly + spouseNetMonthly) * 10) / 10;

 const taxFreeWallMargin = Math.round((taxFreeThreshold - householdGrossAnnual) * 10) / 10;
 const care20WallMargin = Math.round((care20Limit - householdGrossAnnual) * 10) / 10;
 const medical30WallMargin = Math.round((medical30Limit - householdGrossAnnual) * 10) / 10;

 return {
  personAge: currentAgeYears,
  personAgeMonths: currentAgeMonths,
  isDeceased,
  isSpouseDeceased,
  pensionGrossAnnual: Math.round(pensionGrossAnnual * 10) / 10,
  pensionGrossMonthly: Math.round(pensionGrossMonthly * 10) / 10,
  pensionNetMonthly,
  survivorPensionMonthly,
  survivorPensionAnnual,
  salaryGrossAnnual: Math.round(salaryGrossAnnual * 10) / 10,
  salaryGrossMonthly: Math.round(salaryGrossMonthly * 10) / 10,
  totalGrossIncomeAnnual: Math.round(totalGrossIncomeAnnual * 10) / 10,
  householdGrossAnnual: Math.round(householdGrossAnnual * 10) / 10,
  netDisposableIncomeMonthly,
  householdNetDisposableIncomeMonthly,
  isTaxFree,
  careInsuranceRate,
  medicalInsuranceRate,
  highCostCareLimitMonthly,
  highCostMedicalLimitMonthly,
  hasNursingHomeFoodSubsidy,
  zone,
  taxFreeWallMargin,
  care20WallMargin,
  medical30WallMargin,
 };
}

export function buildMatrix(state: SimulatorState, forcedPerspective?: 'primary' | 'spouse'): MatrixCellData[][] {
 const isSingle = state.householdType === 'single';
 const effectivePerspective: 'primary' | 'spouse' =
  forcedPerspective || (state.perspective === 'both' ? 'primary' : state.perspective);

 const subject = effectivePerspective === 'primary' ? state.primary : state.spouse;
 const other = isSingle ? null : effectivePerspective === 'primary' ? state.spouse : state.primary;

 const primaryTotalMonthsNow = state.primary.ageYears * 12 + state.primary.ageMonths;
 const spouseTotalMonthsNow = state.spouse.ageYears * 12 + state.spouse.ageMonths;
 const monthsDiff = spouseTotalMonthsNow - primaryTotalMonthsNow;

 const primaryTargetMonths = state.targetAgeYears * 12 + state.primary.ageMonths;
 const spouseTargetMonths = primaryTargetMonths + monthsDiff;

 const subjectAgeMonthsTotal = effectivePerspective === 'primary' ? primaryTargetMonths : spouseTargetMonths;
 const otherAgeMonthsTotal = isSingle ? null : effectivePerspective === 'primary' ? spouseTargetMonths : primaryTargetMonths;

 const salaryRowModifiers = [
  { scale: 1.5, label: '+50%増収・延長' },
  { scale: 1.0, label: '現在設定どおり' },
  { scale: 0.0, label: '給与0円・完全引退' },
 ];

 const pensionColOffsets = [
  { offset: -2, label: '-2歳 繰上げ' },
  { offset: 0, label: '現在受給年齢' },
  { offset: 2, label: '+2歳 繰下げ' },
 ];

 const matrix: MatrixCellData[][] = [];

 for (let r = 0; r < 3; r++) {
  const row: MatrixCellData[] = [];
  const rowMod = salaryRowModifiers[r];

  for (let c = 0; c < 3; c++) {
   const colMod = pensionColOffsets[c];
   const targetPensionAge = Math.min(75, Math.max(60, subject.pensionStartAge + colMod.offset));

   const calc = evaluatePersonSituation(
    subject,
    subjectAgeMonthsTotal,
    other,
    otherAgeMonthsTotal,
    isSingle,
    targetPensionAge,
    rowMod.scale
   );

   row.push({
    rowOffset: r === 0 ? 1 : r === 1 ? 0 : -1,
    colOffset: colMod.offset,
    pensionStartAge: targetPensionAge,
    salaryModifierLabel: rowMod.label,
    pensionModifierLabel: colMod.label,
    result: calc,
   });
  }
  matrix.push(row);
 }

 return matrix;
}

export function buildLifetimeTimeline(state: SimulatorState): LifetimeYearlyRecord[] {
 const isSingle = state.householdType === 'single';
 const effectivePerspective: 'primary' | 'spouse' =
  state.perspective === 'both' ? 'primary' : state.perspective;

 const subject = effectivePerspective === 'primary' ? state.primary : state.spouse;
 const other = isSingle ? null : effectivePerspective === 'primary' ? state.spouse : state.primary;

 const primaryTotalMonthsNow = state.primary.ageYears * 12 + state.primary.ageMonths;
 const spouseTotalMonthsNow = state.spouse.ageYears * 12 + state.spouse.ageMonths;
 const monthsDiff = spouseTotalMonthsNow - primaryTotalMonthsNow;

 const startAge = Math.min(60, Math.floor(primaryTotalMonthsNow / 12));

 const endAge = isSingle
  ? Math.min(120, state.primary.lifeExpectancyYears)
  : Math.min(120, Math.max(state.primary.lifeExpectancyYears, Math.floor((state.spouse.lifeExpectancyYears * 12 - monthsDiff) / 12) + 2));

 const timeline: LifetimeYearlyRecord[] = [];

 let wasSinglePeriodBefore = isSingle;

 for (let age = startAge; age <= endAge; age++) {
  const primaryTargetMonths = age * 12 + state.primary.ageMonths;
  const spouseTargetMonths = primaryTargetMonths + monthsDiff;
  const spouseAgeNumber = Math.floor(spouseTargetMonths / 12);

  const subjectAgeMonthsTotal = effectivePerspective === 'primary' ? primaryTargetMonths : spouseTargetMonths;
  const otherAgeMonthsTotal = isSingle ? null : effectivePerspective === 'primary' ? spouseTargetMonths : primaryTargetMonths;

  const isPrimaryDeceased = age >= state.primary.lifeExpectancyYears;
  const isSpouseDeceased = !isSingle && spouseAgeNumber >= state.spouse.lifeExpectancyYears;

  const isSinglePeriod = isSingle || isPrimaryDeceased || isSpouseDeceased;

  const isTransitionToSingle = !isSingle && !wasSinglePeriodBefore && isSinglePeriod;

  let whoPassedFirst: 'primary' | 'spouse' | 'none' = 'none';
  let firstPassingPersonName = '';
  let survivorPersonName = '';
  let firstPassingAgeText = '';

  if (!isSingle && (isPrimaryDeceased || isSpouseDeceased)) {
   const spousePassedAtPrimaryAge = Math.floor((state.spouse.lifeExpectancyYears * 12 - monthsDiff) / 12);

   if (state.primary.lifeExpectancyYears < spousePassedAtPrimaryAge) {
    whoPassedFirst = 'primary';
    firstPassingPersonName = state.primary.name;
    survivorPersonName = state.spouse.name;
    firstPassingAgeText = `${state.primary.name} ${state.primary.lifeExpectancyYears}歳`;
   } else {
    whoPassedFirst = 'spouse';
    firstPassingPersonName = state.spouse.name;
    survivorPersonName = state.primary.name;
    firstPassingAgeText = `${state.spouse.name} ${state.spouse.lifeExpectancyYears}歳`;
   }
  }

  let primaryGross = 0;
  let spouseGross = 0;
  let survivorPensionMonthly = 0;

  if (!isPrimaryDeceased) {
   const primaryPensionRate = calculatePensionRate(state.primary.pensionStartAge);
   const primaryBaseMonthly =
    (state.primary.pensionBasicMonthly || 0) + (state.primary.pensionEmployeesMonthly || 0) > 0
     ? state.primary.pensionBasicMonthly + state.primary.pensionEmployeesMonthly
     : state.primary.pensionAge65Monthly;
   const primaryPensionMonthly = age >= state.primary.pensionStartAge ? primaryBaseMonthly * primaryPensionRate : 0;
   const primarySalaryMonthly = getMonthlySalaryAtAge(state.primary, age, 1.0);
   primaryGross = Math.round((primaryPensionMonthly + primarySalaryMonthly) * 12 * 10) / 10;
  }

  if (!isSingle && !isSpouseDeceased) {
   const spousePensionRate = calculatePensionRate(state.spouse.pensionStartAge);
   const spouseBaseMonthly =
    (state.spouse.pensionBasicMonthly || 0) + (state.spouse.pensionEmployeesMonthly || 0) > 0
     ? state.spouse.pensionBasicMonthly + state.spouse.pensionEmployeesMonthly
     : state.spouse.pensionAge65Monthly;
   const spousePensionMonthly = spouseAgeNumber >= state.spouse.pensionStartAge ? spouseBaseMonthly * spousePensionRate : 0;
   const spouseSalaryMonthly = getMonthlySalaryAtAge(state.spouse, spouseAgeNumber, 1.0);
   spouseGross = Math.round((spousePensionMonthly + spouseSalaryMonthly) * 12 * 10) / 10;
  }

  if (!isSingle) {
   if (isPrimaryDeceased && !isSpouseDeceased) {
    survivorPensionMonthly = calculateSurvivorPensionMonthly(state.primary, state.spouse, spouseAgeNumber);
   } else if (!isPrimaryDeceased && isSpouseDeceased) {
    survivorPensionMonthly = calculateSurvivorPensionMonthly(state.spouse, state.primary, age);
   }
  }

  let calc = evaluatePersonSituation(
   subject,
   subjectAgeMonthsTotal,
   other,
   otherAgeMonthsTotal,
   isSingle
  );

  let householdGrossAnnual = primaryGross + spouseGross;
  let netDisposableIncomeMonthly = calc.netDisposableIncomeMonthly;
  let householdNetDisposableIncomeMonthly = calc.householdNetDisposableIncomeMonthly;

  if (!isSingle && isSinglePeriod) {
   const livingPersonGross = isPrimaryDeceased ? spouseGross : primaryGross;
   householdGrossAnnual = livingPersonGross;

   const isTaxFreeNow = householdGrossAnnual <= WALL_THRESHOLDS.TAX_FREE_SINGLE;

   const livingPensionMonthly = isPrimaryDeceased
    ? (spouseAgeNumber >= state.spouse.pensionStartAge ? state.spouse.pensionAge65Monthly * calculatePensionRate(state.spouse.pensionStartAge) : 0)
    : (age >= state.primary.pensionStartAge ? state.primary.pensionAge65Monthly * calculatePensionRate(state.primary.pensionStartAge) : 0);
   const livingSalaryMonthly = isPrimaryDeceased
    ? getMonthlySalaryAtAge(state.spouse, spouseAgeNumber, 1.0)
    : getMonthlySalaryAtAge(state.primary, age, 1.0);

   const netPension = Math.round(livingPensionMonthly * 0.85 * 10) / 10;
   const netSalary = Math.round(livingSalaryMonthly * 0.8 * 10) / 10;
   const totalNetMonthly = Math.round((netPension + netSalary + survivorPensionMonthly) * 10) / 10;

   netDisposableIncomeMonthly = totalNetMonthly;
   householdNetDisposableIncomeMonthly = totalNetMonthly;

   calc = {
    ...calc,
    isTaxFree: isTaxFreeNow,
    householdGrossAnnual,
    netDisposableIncomeMonthly: totalNetMonthly,
    householdNetDisposableIncomeMonthly: totalNetMonthly,
    survivorPensionMonthly,
   };
  }

  let milestone: string | undefined = undefined;
  if (isTransitionToSingle) {
   milestone = `🕊️ ${firstPassingPersonName}が他界し、${survivorPersonName}の単身世帯へ移行（単身155万枠へ）`;
  } else if (age === 65) {
   milestone = '65歳：年金受給本番 & 介護第1号被保険者化';
  } else if (age === 70) {
   milestone = '70歳：前期高齢者入り（窓口原則2割）';
  } else if (age === 75) {
   milestone = '75歳：後期高齢者医療へ移行（原則1割・上限2.46万化）';
  } else if (age === subject.rehireRetireAge) {
   milestone = `${age}歳：完全リタイア（就労給与ゼロへ）`;
  }

  timeline.push({
   age,
   spouseAge: isSpouseDeceased ? null : spouseAgeNumber,
   isSinglePeriod,
   isTransitionToSingle,
   whoPassedFirst,
   firstPassingPersonName,
   survivorPersonName,
   firstPassingAgeText,
   isSpouseDeceased,
   isPrimaryDeceased,
   householdGrossAnnual,
   primaryGrossAnnual: primaryGross,
   spouseGrossAnnual: spouseGross,
   pensionGrossAnnual: calc.pensionGrossAnnual,
   survivorPensionMonthly,
   salaryGrossAnnual: calc.salaryGrossAnnual,
   netDisposableIncomeMonthly,
   householdNetDisposableIncomeMonthly,
   isTaxFree: calc.isTaxFree,
   zone: calc.zone,
   careRate: calc.careInsuranceRate,
   medicalRate: calc.medicalInsuranceRate,
   hasNursingHomeFoodSubsidy: calc.hasNursingHomeFoodSubsidy,
   highCostCareLimitMonthly: calc.highCostCareLimitMonthly,
   highCostMedicalLimitMonthly: calc.highCostMedicalLimitMonthly,
   keyMilestone: milestone,
  });

  wasSinglePeriodBefore = isSinglePeriod;
 }

 return timeline;
}