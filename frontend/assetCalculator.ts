import { SimulatorState, AssetYearRecord } from './types';
import { buildLifePlanTimeline } from './lifePlanCalculator';

const TAXABLE_GAIN_TAX_RATE = 0.20315;

function splitWithdrawal(amount: number, primaryBalance: number, spouseBalance: number): [number, number] {
 const totalBalance = primaryBalance + spouseBalance;
 const withdrawal = Math.min(Math.max(0, amount), totalBalance);
 if (totalBalance <= 0 || withdrawal <= 0) return [0, 0];

 let primaryWithdrawal = Math.min(
  primaryBalance,
  Math.round((withdrawal * primaryBalance / totalBalance) * 10) / 10
 );
 let spouseWithdrawal = Math.min(
  spouseBalance,
  Math.round((withdrawal - primaryWithdrawal) * 10) / 10
 );
 let remainder = Math.round((withdrawal - primaryWithdrawal - spouseWithdrawal) * 10) / 10;

 if (remainder > 0) {
  const addToPrimary = Math.min(primaryBalance - primaryWithdrawal, remainder);
  primaryWithdrawal = Math.round((primaryWithdrawal + addToPrimary) * 10) / 10;
  remainder = Math.round((remainder - addToPrimary) * 10) / 10;
  spouseWithdrawal = Math.round(
   (spouseWithdrawal + Math.min(spouseBalance - spouseWithdrawal, remainder)) * 10
  ) / 10;
 }

 return [primaryWithdrawal, spouseWithdrawal];
}

function sellHoldings(
 amount: number,
 primaryPrincipal: number,
 primaryProfit: number,
 spousePrincipal: number,
 spouseProfit: number,
 taxRate: number
) {
 const primaryBalance = Math.max(0, primaryPrincipal + primaryProfit);
 const spouseBalance = Math.max(0, spousePrincipal + spouseProfit);
 const saleAmount = Math.min(Math.max(0, amount), primaryBalance + spouseBalance);
 const [primarySale, spouseSale] = splitWithdrawal(saleAmount, primaryBalance, spouseBalance);
 const primaryPrincipalWithdrawal = primaryBalance > 0
  ? Math.min(primaryPrincipal, Math.round((primarySale * primaryPrincipal / primaryBalance) * 10) / 10)
  : 0;
 const spousePrincipalWithdrawal = spouseBalance > 0
  ? Math.min(spousePrincipal, Math.round((spouseSale * spousePrincipal / spouseBalance) * 10) / 10)
  : 0;
 const primaryRealizedGain = Math.round((primarySale - primaryPrincipalWithdrawal) * 10) / 10;
 const spouseRealizedGain = Math.round((spouseSale - spousePrincipalWithdrawal) * 10) / 10;
 const tax = Math.round(
  (Math.max(0, primaryRealizedGain) + Math.max(0, spouseRealizedGain)) * taxRate * 10
 ) / 10;

 return {
  primaryPrincipal: Math.round((primaryPrincipal - primaryPrincipalWithdrawal) * 10) / 10,
  primaryProfit: Math.round((primaryProfit - primaryRealizedGain) * 10) / 10,
  spousePrincipal: Math.round((spousePrincipal - spousePrincipalWithdrawal) * 10) / 10,
  spouseProfit: Math.round((spouseProfit - spouseRealizedGain) * 10) / 10,
  primaryPrincipalWithdrawal,
  spousePrincipalWithdrawal,
  saleAmount,
  tax,
  netProceeds: Math.round((saleAmount - tax) * 10) / 10,
 };
}

export function buildAssetManagementTimeline(
 state: SimulatorState,
 overrideNisaOnly?: boolean
): AssetYearRecord[] {
 const isSingle = state.householdType === 'single';
 const cfg = state.lifePlan;

 const isNisaOnly = overrideNisaOnly !== undefined ? overrideNisaOnly : cfg.limitToNisaCap;

 const lifePlanRecords = buildLifePlanTimeline(state);

 const returnRate = cfg.investmentReturnRate / 100;

 const cashAvailable = Math.max(0, cfg.currentCashSavings);
 const b1Init = Math.min(Math.max(0, cfg.bucket1Cash), cashAvailable);
 const b3Init = Math.min(Math.max(0, cfg.bucket3Emergency), cashAvailable - b1Init);

 let currentSurplusCash = Math.max(0, cashAvailable - b1Init - b3Init);
 let currentB1 = b1Init;
 let currentB3 = b3Init;

 // Initial assets distribution for primary & spouse
 const primaryInv = cfg.primaryStrategy.investments;
 const spouseInv = isSingle ? 0 : cfg.spouseStrategy.investments;

 // Primary initial NISA & taxable split based on remaining cap
 const pNisaCapRemaining = cfg.primaryStrategy.nisaRemainingCap ?? Math.max(0, 1800 - primaryInv);
 let pNisaPrin = Math.min(primaryInv, Math.max(0, 1800 - pNisaCapRemaining));
 let pTaxablePrin = Math.max(0, primaryInv - pNisaPrin);
 let pNisaProf = 0;
 let pTaxableProf = 0;

 let sNisaPrin = 0;
 let sTaxablePrin = 0;
 let sNisaProf = 0;
 let sTaxableProf = 0;

 if (!isSingle) {
  const sNisaCapRemaining = cfg.spouseStrategy.nisaRemainingCap ?? Math.max(0, 1800 - spouseInv);
  sNisaPrin = Math.min(spouseInv, Math.max(0, 1800 - sNisaCapRemaining));
  sTaxablePrin = Math.max(0, spouseInv - sNisaPrin);
 }

 const records: AssetYearRecord[] = [];
 let hasHandledInheritance = false;
 let activeNisaOwner: 'primary' | 'spouse' = 'primary';
 let primaryNisaCapUsed = Math.max(0, 1800 - (cfg.primaryStrategy.nisaRemainingCap ?? Math.max(0, 1800 - primaryInv)));
 let spouseNisaCapUsed = isSingle
  ? 0
  : Math.max(0, 1800 - (cfg.spouseStrategy.nisaRemainingCap ?? Math.max(0, 1800 - spouseInv)));
 let primaryNisaCapRestoreNextYear = 0;
 let spouseNisaCapRestoreNextYear = 0;

 for (let i = 0; i < lifePlanRecords.length; i++) {
  const lp = lifePlanRecords[i];
  primaryNisaCapUsed = Math.max(0, Math.round((primaryNisaCapUsed - primaryNisaCapRestoreNextYear) * 10) / 10);
  spouseNisaCapUsed = Math.max(0, Math.round((spouseNisaCapUsed - spouseNisaCapRestoreNextYear) * 10) / 10);
  primaryNisaCapRestoreNextYear = 0;
  spouseNisaCapRestoreNextYear = 0;
  const netIncome = lp.totalNetIncome;
  const expense = lp.totalExpense;
  const cashFlow = lp.annualCashFlow;

  let investToNisa = 0;
  let investToTaxable = 0;
  let inheritedTransferredToTaxable = 0;
  let taxableSaleTax = 0;

  let withdrawFromSurplusCash = 0;
  let withdrawFromTaxable = 0;
  let withdrawFromNisa = 0;
  let usedEmergencyBuffer = 0;

  // 1. Apply annual return rate to principals and profits independently (compounding)
  pNisaProf = Math.round(((pNisaPrin + pNisaProf) * (1 + returnRate) - pNisaPrin) * 10) / 10;
  pTaxableProf = Math.round(((pTaxablePrin + pTaxableProf) * (1 + returnRate) - pTaxablePrin) * 10) / 10;

  if (!isSingle) {
   sNisaProf = Math.round(((sNisaPrin + sNisaProf) * (1 + returnRate) - sNisaPrin) * 10) / 10;
   sTaxableProf = Math.round(((sTaxablePrin + sTaxableProf) * (1 + returnRate) - sTaxablePrin) * 10) / 10;
  }

  // 2. Handle spouse passing transition
  if (!isSingle && lp.isTransitionToSingle && !hasHandledInheritance) {
   hasHandledInheritance = true;
   const survivorIsPrimary = lp.whoPassedFirst === 'spouse';

   const survivorNisaPrin = survivorIsPrimary ? pNisaPrin : sNisaPrin;
   const survivorNisaProf = survivorIsPrimary ? pNisaProf : sNisaProf;
   const survivorTaxablePrin = survivorIsPrimary ? pTaxablePrin : sTaxablePrin;
   const survivorTaxableProf = survivorIsPrimary ? pTaxableProf : sTaxableProf;

   const deceasedNisaPrin = survivorIsPrimary ? sNisaPrin : pNisaPrin;
   const deceasedNisaProf = survivorIsPrimary ? sNisaProf : pNisaProf;
   const deceasedTaxablePrin = survivorIsPrimary ? sTaxablePrin : pTaxablePrin;
   const deceasedTaxableProf = survivorIsPrimary ? sTaxableProf : pTaxableProf;

    const deceasedNisaValue = deceasedNisaPrin + deceasedNisaProf;
    const deceasedTaxableValue = deceasedTaxablePrin + deceasedTaxableProf;
    const inheritedTotal = Math.round((deceasedNisaValue + deceasedTaxableValue) * 10) / 10;
   inheritedTransferredToTaxable = inheritedTotal;

    const newTaxablePrin = Math.round((survivorTaxablePrin + deceasedTaxablePrin + deceasedNisaValue) * 10) / 10;
    const newTaxableProf = Math.round((survivorTaxableProf + deceasedTaxableProf) * 10) / 10;
   const newNisaPrin = survivorNisaPrin;
   const newNisaProf = survivorNisaProf;

   if (survivorIsPrimary) {
    activeNisaOwner = 'primary';
    spouseNisaCapUsed = 0;
    spouseNisaCapRestoreNextYear = 0;
    pNisaPrin = newNisaPrin;
    pNisaProf = newNisaProf;
    pTaxablePrin = newTaxablePrin;
    pTaxableProf = newTaxableProf;
    sNisaPrin = 0;
    sNisaProf = 0;
    sTaxablePrin = 0;
    sTaxableProf = 0;
   } else {
    activeNisaOwner = 'spouse';
    primaryNisaCapUsed = 0;
    primaryNisaCapRestoreNextYear = 0;
    sNisaPrin = newNisaPrin;
    sNisaProf = newNisaProf;
    sTaxablePrin = newTaxablePrin;
    sTaxableProf = newTaxableProf;
    pNisaPrin = 0;
    pNisaProf = 0;
    pTaxablePrin = 0;
    pTaxableProf = 0;
   }

  }

  let currentNisa = Math.round((pNisaPrin + pNisaProf + sNisaPrin + sNisaProf) * 10) / 10;
  let currentTaxable = Math.round((pTaxablePrin + pTaxableProf + sTaxablePrin + sTaxableProf) * 10) / 10;
  let nisaContributed = isSingle || lp.isSinglePeriod
   ? activeNisaOwner === 'primary' ? primaryNisaCapUsed : spouseNisaCapUsed
   : Math.round((primaryNisaCapUsed + spouseNisaCapUsed) * 10) / 10;

  const activeNisaCap = isSingle || lp.isSinglePeriod ? 1800 : 3600;
  const getNisaCapUsed = () => isSingle || lp.isSinglePeriod
   ? activeNisaOwner === 'primary' ? primaryNisaCapUsed : spouseNisaCapUsed
   : Math.round((primaryNisaCapUsed + spouseNisaCapUsed) * 10) / 10;

  const refreshCurrentBalances = () => {
   currentNisa = Math.round((pNisaPrin + pNisaProf + sNisaPrin + sNisaProf) * 10) / 10;
   currentTaxable = Math.round((pTaxablePrin + pTaxableProf + sTaxablePrin + sTaxableProf) * 10) / 10;
  nisaContributed = getNisaCapUsed();
  };

  // 3. Cashflow allocation (Surplus or Deficit)
  if (cashFlow > 0) {
   let surplus = cashFlow;

  const primaryNisaRoom = Math.min(360, Math.max(0, 1800 - primaryNisaCapUsed));
  const spouseNisaRoom = Math.min(360, Math.max(0, 1800 - spouseNisaCapUsed));
  let primaryNisaContribution = 0;
  let spouseNisaContribution = 0;

  if (isSingle || lp.isSinglePeriod) {
   const room = activeNisaOwner === 'primary' ? primaryNisaRoom : spouseNisaRoom;
   investToNisa = Math.min(surplus, room);
   if (activeNisaOwner === 'primary') primaryNisaContribution = investToNisa;
   else spouseNisaContribution = investToNisa;
  } else {
   primaryNisaContribution = Math.min(surplus / 2, primaryNisaRoom);
   spouseNisaContribution = Math.min(surplus / 2, spouseNisaRoom);
   let remainingRoom = Math.round((surplus - primaryNisaContribution - spouseNisaContribution) * 10) / 10;
   const extraPrimary = Math.min(remainingRoom, primaryNisaRoom - primaryNisaContribution);
   primaryNisaContribution = Math.round((primaryNisaContribution + extraPrimary) * 10) / 10;
   remainingRoom = Math.round((remainingRoom - extraPrimary) * 10) / 10;
   const extraSpouse = Math.min(remainingRoom, spouseNisaRoom - spouseNisaContribution);
   spouseNisaContribution = Math.round((spouseNisaContribution + extraSpouse) * 10) / 10;
   investToNisa = Math.round((primaryNisaContribution + spouseNisaContribution) * 10) / 10;
  }

  if (investToNisa > 0) {
   primaryNisaCapUsed = Math.round((primaryNisaCapUsed + primaryNisaContribution) * 10) / 10;
   spouseNisaCapUsed = Math.round((spouseNisaCapUsed + spouseNisaContribution) * 10) / 10;
   nisaContributed = getNisaCapUsed();
    surplus = Math.round((surplus - investToNisa) * 10) / 10;

   pNisaPrin = Math.round((pNisaPrin + primaryNisaContribution) * 10) / 10;
   sNisaPrin = Math.round((sNisaPrin + spouseNisaContribution) * 10) / 10;
    refreshCurrentBalances();
   }

   if (surplus > 0) {
    if (!isNisaOnly) {
     investToTaxable = surplus;
     if (isSingle || lp.isSinglePeriod) {
      pTaxablePrin = Math.round((pTaxablePrin + investToTaxable) * 10) / 10;
     } else {
      const halfTaxable = investToTaxable / 2;
      pTaxablePrin = Math.round((pTaxablePrin + halfTaxable) * 10) / 10;
      sTaxablePrin = Math.round((sTaxablePrin + halfTaxable) * 10) / 10;
     }
    } else {
     currentSurplusCash = Math.round((currentSurplusCash + surplus) * 10) / 10;
    }
   }
  } else if (cashFlow < 0) {
   let deficit = Math.abs(cashFlow);

   if (currentSurplusCash > 0) {
    withdrawFromSurplusCash = Math.min(currentSurplusCash, deficit);
    currentSurplusCash = Math.round((currentSurplusCash - withdrawFromSurplusCash) * 10) / 10;
    deficit = Math.round((deficit - withdrawFromSurplusCash) * 10) / 10;
   }

   if (deficit > 0 && currentTaxable > 0) {
    const taxableTotal = pTaxablePrin + pTaxableProf + sTaxablePrin + sTaxableProf;
        let grossSale = Math.min(taxableTotal, deficit);
        let sale = sellHoldings(grossSale, pTaxablePrin, pTaxableProf, sTaxablePrin, sTaxableProf, TAXABLE_GAIN_TAX_RATE);
        for (let attempt = 0; attempt < 3 && grossSale < taxableTotal; attempt++) {
         const requiredSale = Math.min(taxableTotal, Math.ceil((deficit + sale.tax) * 10) / 10);
         if (requiredSale <= grossSale) break;
         grossSale = requiredSale;
         sale = sellHoldings(grossSale, pTaxablePrin, pTaxableProf, sTaxablePrin, sTaxableProf, TAXABLE_GAIN_TAX_RATE);
        }
        pTaxablePrin = sale.primaryPrincipal;
        pTaxableProf = sale.primaryProfit;
        sTaxablePrin = sale.spousePrincipal;
        sTaxableProf = sale.spouseProfit;
        withdrawFromTaxable = sale.saleAmount;
        taxableSaleTax = sale.tax;
        deficit = Math.round((deficit - sale.netProceeds) * 10) / 10;
   }

   if (deficit > 0 && currentNisa > 0) {
    const nisaTotal = pNisaPrin + pNisaProf + sNisaPrin + sNisaProf;
    const takeFromNisa = Math.min(nisaTotal, deficit);
        const sale = sellHoldings(takeFromNisa, pNisaPrin, pNisaProf, sNisaPrin, sNisaProf, 0);
        pNisaPrin = sale.primaryPrincipal;
        pNisaProf = sale.primaryProfit;
        sNisaPrin = sale.spousePrincipal;
        sNisaProf = sale.spouseProfit;
        withdrawFromNisa = sale.saleAmount;
    if (activeNisaOwner === 'primary') {
         primaryNisaCapRestoreNextYear = Math.round((primaryNisaCapRestoreNextYear + sale.primaryPrincipalWithdrawal) * 10) / 10;
    } else {
         spouseNisaCapRestoreNextYear = Math.round((spouseNisaCapRestoreNextYear + sale.spousePrincipalWithdrawal) * 10) / 10;
    }
    deficit = Math.round((deficit - takeFromNisa) * 10) / 10;
    refreshCurrentBalances();
   }

   if (deficit > 0) {
    const availableEmergency = currentB1 + currentB3;
    usedEmergencyBuffer = Math.min(availableEmergency, deficit);
    if (currentB1 >= usedEmergencyBuffer) {
     currentB1 = Math.round((currentB1 - usedEmergencyBuffer) * 10) / 10;
    } else {
     const fromB3 = usedEmergencyBuffer - currentB1;
     currentB1 = 0;
     currentB3 = Math.max(0, Math.round((currentB3 - fromB3) * 10) / 10);
    }
    deficit = Math.round((deficit - usedEmergencyBuffer) * 10) / 10;
   }

   if (deficit > 0) {
    pNisaPrin = 0;
    pNisaProf = 0;
    pTaxablePrin = 0;
    pTaxableProf = 0;
    sNisaPrin = 0;
    sNisaProf = 0;
    sTaxablePrin = 0;
    sTaxableProf = 0;
    currentSurplusCash = 0;
    currentB1 = 0;
    currentB3 = 0;
   }
  }

  const finalNisaBal = Math.round((pNisaPrin + pNisaProf + sNisaPrin + sNisaProf) * 10) / 10;
  const finalTaxableBal = Math.round((pTaxablePrin + pTaxableProf + sTaxablePrin + sTaxableProf) * 10) / 10;

  const totalNetAssets = Math.round(
   (finalNisaBal + finalTaxableBal + currentSurplusCash + currentB1 + currentB3) * 10
  ) / 10;

  const isDepleted = totalNetAssets <= 0;

  records.push({
   year: lp.year,
   age: lp.age,
   spouseAge: lp.spouseAge,
   isSpouseDeceased: lp.isSpouseDeceased,
   isPrimaryDeceased: lp.isPrimaryDeceased,
   isSinglePeriod: lp.isSinglePeriod,
   isTransitionToSingle: lp.isTransitionToSingle,
   firstPassingPersonName: lp.firstPassingPersonName,
   survivorPersonName: lp.survivorPersonName,
   firstPassingAgeText: lp.firstPassingAgeText,
   totalNetIncome: netIncome,
    totalExpense: Math.round((expense + taxableSaleTax) * 10) / 10,
    annualCashFlow: Math.round((cashFlow - taxableSaleTax) * 10) / 10,
   investToNisa,
   investToTaxable,
   inheritedTransferredToTaxable,
    taxableSaleTax,
   withdrawFromSurplusCash,
   withdrawFromTaxable,
   withdrawFromNisa,
   usedEmergencyBuffer,
   nisaBalance: finalNisaBal,
   nisaCumulativeContributed: nisaContributed,
   taxableBalance: finalTaxableBal,
   surplusCashBalance: currentSurplusCash,
   bucket1Balance: currentB1,
   bucket3Balance: currentB3,
   totalNetAssets,
   primaryNisaPrincipal: Math.round(pNisaPrin * 10) / 10,
   primaryNisaProfit: Math.round(pNisaProf * 10) / 10,
   primaryTaxablePrincipal: Math.round(pTaxablePrin * 10) / 10,
   primaryTaxableProfit: Math.round(pTaxableProf * 10) / 10,
   spouseNisaPrincipal: Math.round(sNisaPrin * 10) / 10,
   spouseNisaProfit: Math.round(sNisaProf * 10) / 10,
   spouseTaxablePrincipal: Math.round(sTaxablePrin * 10) / 10,
   spouseTaxableProfit: Math.round(sTaxableProf * 10) / 10,
   isNisaCapped: nisaContributed >= activeNisaCap,
   isDepleted,
   eventLabel: lp.eventLabel,
  });
 }

 return records;
}