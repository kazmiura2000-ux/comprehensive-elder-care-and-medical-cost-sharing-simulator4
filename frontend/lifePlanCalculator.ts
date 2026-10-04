import { SimulatorState, LifePlanYearRecord } from './types';
import { calculatePensionRate, calculateSurvivorPensionMonthly } from './calculator';

export function buildLifePlanTimeline(state: SimulatorState): LifePlanYearRecord[] {
 const isSingle = state.householdType === 'single';
 const cfg = state.lifePlan;

 const currentYear = new Date().getFullYear();
 const startAge = state.primary.ageYears;

 const diffMonths =
  state.spouse.ageYears * 12 + state.spouse.ageMonths - (state.primary.ageYears * 12 + state.primary.ageMonths);

 const endAge = isSingle
  ? Math.min(120, state.primary.lifeExpectancyYears)
  : Math.min(120, Math.max(state.primary.lifeExpectancyYears, Math.floor((state.spouse.lifeExpectancyYears * 12 - diffMonths) / 12) + 2));

 const records: LifePlanYearRecord[] = [];

 const totalInvestments = cfg.primaryStrategy.investments +
  (isSingle ? 0 : cfg.spouseStrategy.investments);
 const cashAvailable = Math.max(0, cfg.currentCashSavings);
 let currentBucket1 = Math.min(Math.max(0, cfg.bucket1Cash), cashAvailable);
 let currentBucket3 = Math.min(
  Math.max(0, cfg.bucket3Emergency),
  cashAvailable - currentBucket1
 );
 let currentSurplusCash = Math.max(0, cashAvailable - currentBucket1 - currentBucket3);
 let currentBucket2 = totalInvestments;

 const inflation = cfg.inflationRate / 100;
 const investmentReturn = cfg.investmentReturnRate / 100;

 let wasSinglePeriodBefore = isSingle;

 for (let age = startAge; age <= endAge; age++) {
  const elapsedYears = age - startAge;
  const year = currentYear + elapsedYears;

  const primaryTargetMonths = age * 12 + state.primary.ageMonths;
  const spouseTargetMonths = primaryTargetMonths + diffMonths;
  const spouseAgeNumber = Math.floor(spouseTargetMonths / 12);

  const isPrimaryDeceased = age >= state.primary.lifeExpectancyYears;
  const isSpouseDeceased = !isSingle && spouseAgeNumber >= state.spouse.lifeExpectancyYears;
  const isSinglePeriod = isSingle || isPrimaryDeceased || isSpouseDeceased;
  const isTransitionToSingle = !isSingle && !wasSinglePeriodBefore && isSinglePeriod;

  let whoPassedFirst: 'primary' | 'spouse' | 'none' = 'none';
  let firstPassingPersonName = '';
  let survivorPersonName = '';
  let firstPassingAgeText = '';

  if (!isSingle && (isPrimaryDeceased || isSpouseDeceased)) {
   const spousePassedAtPrimaryAge = Math.floor((state.spouse.lifeExpectancyYears * 12 - diffMonths) / 12);
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

  let primaryWorkNet = 0;
  let spouseWorkNet = 0;
  let primarySeveranceNet = 0;
  let spouseSeveranceNet = 0;
  let primaryPensionNet = 0;
  let spousePensionNet = 0;
  let survivorPensionNet = 0;
  let idecoNet = 0;
  let temporaryIncomeTotal = 0;

  if (!isPrimaryDeceased) {
   const pStrat = cfg.primaryStrategy;

   if (age < pStrat.careerRetireAge) {
    primaryWorkNet = pStrat.careerNetIncomeAnnual;
   } else if (age < pStrat.rehireRetireAge) {
    primaryWorkNet = pStrat.rehireNetIncomeAnnual;
   }

   if (age === pStrat.careerRetireAge && pStrat.careerSeverancePayNet > 0) {
    primarySeveranceNet += pStrat.careerSeverancePayNet;
   }
   if (age === pStrat.rehireRetireAge && pStrat.rehireSeverancePayNet > 0) {
    primarySeveranceNet += pStrat.rehireSeverancePayNet;
   }

   if (age >= pStrat.pensionStartAge) {
    const pRate = calculatePensionRate(pStrat.pensionStartAge);
    primaryPensionNet = Math.round(pStrat.pensionAge65GrossAnnual * pRate * (pStrat.pensionNetRate / 100) * 10) / 10;
   }

   if (age === pStrat.idecoReceiveAge && pStrat.idecoNetTotal > 0) {
    idecoNet += pStrat.idecoNetTotal;
   }
  }

  if (!isSingle && !isSpouseDeceased) {
   const sStrat = cfg.spouseStrategy;

   if (spouseAgeNumber < sStrat.careerRetireAge) {
    spouseWorkNet = sStrat.careerNetIncomeAnnual;
   } else if (spouseAgeNumber < sStrat.rehireRetireAge) {
    spouseWorkNet = sStrat.rehireNetIncomeAnnual;
   }

   if (spouseAgeNumber === sStrat.careerRetireAge && sStrat.careerSeverancePayNet > 0) {
    spouseSeveranceNet += sStrat.careerSeverancePayNet;
   }
   if (spouseAgeNumber === sStrat.rehireRetireAge && sStrat.rehireSeverancePayNet > 0) {
    spouseSeveranceNet += sStrat.rehireSeverancePayNet;
   }

   if (spouseAgeNumber >= sStrat.pensionStartAge) {
    const sRate = calculatePensionRate(sStrat.pensionStartAge);
    spousePensionNet = Math.round(sStrat.pensionAge65GrossAnnual * sRate * (sStrat.pensionNetRate / 100) * 10) / 10;
   }

   if (spouseAgeNumber === sStrat.idecoReceiveAge && sStrat.idecoNetTotal > 0) {
    idecoNet += sStrat.idecoNetTotal;
   }
  }

  if (!isSingle) {
   if (isPrimaryDeceased && !isSpouseDeceased) {
    const survivorMonthly = calculateSurvivorPensionMonthly(state.primary, state.spouse, spouseAgeNumber);
    survivorPensionNet = Math.round(survivorMonthly * 12 * 10) / 10;
   } else if (!isPrimaryDeceased && isSpouseDeceased) {
    const survivorMonthly = calculateSurvivorPensionMonthly(state.spouse, state.primary, age);
    survivorPensionNet = Math.round(survivorMonthly * 12 * 10) / 10;
   }
  }

  const matchedTempIncomes = (cfg.temporaryIncomes || []).filter((item) => item.age === age);
  temporaryIncomeTotal = matchedTempIncomes.reduce((sum, item) => sum + (item.amount || 0), 0);

  const totalNetIncome =
   Math.round(
    (primaryWorkNet +
     spouseWorkNet +
     primarySeveranceNet +
     spouseSeveranceNet +
     primaryPensionNet +
     spousePensionNet +
     survivorPensionNet +
     idecoNet +
     temporaryIncomeTotal) *
     10
   ) / 10;

  const inflationFactor = Math.pow(1 + inflation, elapsedYears);

  const matchedHousing = (cfg.housingCosts || []).filter(
   (item) => age >= item.startAge && age <= item.endAge
  );
  const housingExpense = Math.round(
   matchedHousing.reduce((sum, item) => sum + item.annualAmount, 0) * inflationFactor * 10
  ) / 10;

  const matchedLiving = (cfg.baseLivingCosts || []).filter(
   (item) => age >= item.startAge && age <= item.endAge
  );
  let livingSum = matchedLiving.reduce((sum, item) => sum + item.annualAmount, 0);
  if (!isSingle && (isSpouseDeceased || isPrimaryDeceased)) {
   livingSum *= 0.75;
  }
  const baseLivingExpense = Math.round(livingSum * inflationFactor * 10) / 10;

  const matchedLeisure = (cfg.activeLeisureAnnual || []).filter(
   (item) => age >= item.startAge && age <= item.endAge
  );
  const activeLeisureExpense = Math.round(
   matchedLeisure.reduce((sum, item) => sum + item.annualAmount, 0) * inflationFactor * 10
  ) / 10;

  const unforeseenExpense = Math.round((cfg.unforeseenBudgetAnnual || 0) * inflationFactor * 10) / 10;

  const matchedLargeLeisure = (cfg.largeLeisureOneTimes || []).filter((item) => item.age === age);
  const largeLeisureExpense = Math.round(
   matchedLargeLeisure.reduce((sum, item) => sum + item.amount, 0) * inflationFactor * 10
  ) / 10;

  const matchedSpecial = (cfg.specialPeriodExpenses || []).filter(
   (item) => age >= item.startAge && age <= item.endAge
  );
  const specialPeriodExpense = Math.round(
   matchedSpecial.reduce((sum, item) => sum + item.annualAmount, 0) * inflationFactor * 10
  ) / 10;

  const totalExpense =
   Math.round(
    (housingExpense +
     baseLivingExpense +
     activeLeisureExpense +
     unforeseenExpense +
     largeLeisureExpense +
     specialPeriodExpense) *
     10
   ) / 10;

  const annualCashFlow = Math.round((totalNetIncome - totalExpense) * 10) / 10;

  let remainingCashFlow = annualCashFlow;
  if (remainingCashFlow < 0 && currentSurplusCash > 0) {
   const cashWithdrawal = Math.min(currentSurplusCash, Math.abs(remainingCashFlow));
   currentSurplusCash = Math.round((currentSurplusCash - cashWithdrawal) * 10) / 10;
   remainingCashFlow = Math.round((remainingCashFlow + cashWithdrawal) * 10) / 10;
  }

  const previousBucket2 = currentBucket2;
  if (previousBucket2 > 0) {
   currentBucket2 = Math.round((previousBucket2 * (1 + investmentReturn) + remainingCashFlow) * 10) / 10;
  } else {
   currentBucket2 = Math.round((previousBucket2 + remainingCashFlow) * 10) / 10;
  }

  const totalAssets = Math.round(
   (currentSurplusCash + currentBucket1 + currentBucket2 + currentBucket3) * 10
  ) / 10;

  let eventLabel: string | undefined = undefined;
  if (isTransitionToSingle) {
   eventLabel = `🕊️ ${firstPassingPersonName}が他界し、${survivorPersonName}の単身世帯へ移行`;
  } else if (primarySeveranceNet > 0 || spouseSeveranceNet > 0) {
   eventLabel = '🎉 退職金受取';
  } else if (age === cfg.primaryStrategy.pensionStartAge && !isPrimaryDeceased) {
   eventLabel = `65歳：${state.primary.name}年金受給開始`;
  } else if (age === cfg.primaryStrategy.idecoReceiveAge && cfg.primaryStrategy.idecoNetTotal > 0) {
   eventLabel = '💰 iDeCo受給';
  } else if (largeLeisureExpense > 0) {
   eventLabel = `✈️ ${matchedLargeLeisure.map((i) => i.title).join(' / ')}`;
  }

  records.push({
   year,
   age,
   spouseAge: isSpouseDeceased ? null : spouseAgeNumber,
   isSpouseDeceased,
   isPrimaryDeceased,
   isSinglePeriod,
   isTransitionToSingle,
  whoPassedFirst,
   firstPassingPersonName,
   survivorPersonName,
   firstPassingAgeText,
   primaryWorkNet,
   spouseWorkNet,
   primarySeveranceNet,
   spouseSeveranceNet,
   primaryPensionNet,
   spousePensionNet,
   survivorPensionNet,
   idecoNet,
   temporaryIncomeTotal,
   totalNetIncome,
   housingExpense,
   baseLivingExpense,
   activeLeisureExpense,
   unforeseenExpense,
   largeLeisureExpense,
   specialPeriodExpense,
   totalExpense,
   annualCashFlow,
  surplusCashBalance: currentSurplusCash,
   bucket1Balance: currentBucket1,
   bucket2Balance: currentBucket2,
   bucket3Balance: currentBucket3,
   totalAssets,
   eventLabel,
   isDeficit: currentBucket2 < 0,
  });

  wasSinglePeriodBefore = isSinglePeriod;
 }

 return records;
}