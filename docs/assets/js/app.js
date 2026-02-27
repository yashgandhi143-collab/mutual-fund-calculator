/**
 * app.js — Shared JavaScript Utilities
 * Mutual Fund Calculator
 * Licensed under MIT License — Free to reuse with attribution.
 */

/**
 * Format a number as Indian Rupees (INR)
 * @param {number} value
 * @returns {string} e.g. "Rs. 1,20,000"
 */
function formatINR(value) {
  return "Rs. " + Math.round(value).toLocaleString("en-IN");
}

/**
 * Format a number as a percentage string
 * @param {number} value
 * @returns {string} e.g. "12%"
 */
function formatPercent(value) {
  return value + "%";
}

/**
 * Calculate SIP Future Value
 * Formula: P x ((1 + r)^n - 1) / r x (1 + r)
 * @param {number} P - Monthly investment amount
 * @param {number} annualRate - Annual return rate in %
 * @param {number} years - Investment duration in years
 * @returns {object} { futureValue, totalInvested, estimatedReturns }
 */
function calculateSIP(P, annualRate, years) {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  const futureValue = P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  const totalInvested = P * n;
  const estimatedReturns = futureValue - totalInvested;
  return { futureValue, totalInvested, estimatedReturns };
}

/**
 * Calculate Top-Up SIP Future Value (year-by-year simulation)
 * Each year the monthly SIP amount is increased by topUpRate %
 * @param {number} P - Initial monthly investment amount
 * @param {number} annualRate - Annual return rate in %
 * @param {number} years - Investment duration in years
 * @param {number} topUpRate - Annual top-up rate in %
 * @returns {object} { futureValue, totalInvested, estimatedReturns, yearlyBreakdown }
 *   yearlyBreakdown: Array of { year, monthlySIP, yearlyInvested, corpusAtEndOfYear }
 */
function calculateTopUpSIP(P, annualRate, years, topUpRate) {
  const r = annualRate / 100 / 12;
  let corpus = 0;
  let totalInvested = 0;
  const yearlyBreakdown = [];

  for (let y = 1; y <= years; y++) {
    const monthlySIP = Math.round(P * Math.pow(1 + topUpRate / 100, y - 1));
    let yearlyInvested = 0;

    for (let m = 0; m < 12; m++) {
      corpus = (corpus + monthlySIP) * (1 + r);
      yearlyInvested += monthlySIP;
    }

    totalInvested += yearlyInvested;
    corpus = Math.round(corpus);

    yearlyBreakdown.push({
      year: y,
      monthlySIP: monthlySIP,
      yearlyInvested: yearlyInvested,
      corpusAtEndOfYear: corpus
    });
  }

  const futureValue = corpus;
  const estimatedReturns = futureValue - totalInvested;
  return { futureValue, totalInvested, estimatedReturns, yearlyBreakdown };
}

/**
 * Calculate Inflation-Adjusted (Real) Value
 * Formula: nominalValue / (1 + inflationRate/100)^years
 * @param {number} nominalValue - The future value (corpus)
 * @param {number} inflationRate - Annual inflation rate in %
 * @param {number} years - Investment duration in years
 * @returns {object} { inflationAdjustedValue, purchasingPowerLoss }
 */
function calculateInflationAdjusted(nominalValue, inflationRate, years) {
  const inflationAdjustedValue = nominalValue / Math.pow(1 + inflationRate / 100, years);
  const purchasingPowerLoss = nominalValue - inflationAdjustedValue;
  return { inflationAdjustedValue, purchasingPowerLoss };
}

/**
 * Calculate Lumpsum Future Value
 * Formula: P x (1 + r)^n
 * @param {number} P - One-time investment amount
 * @param {number} annualRate - Annual return rate in %
 * @param {number} years - Investment duration in years
 * @returns {object} { futureValue, totalInvested, estimatedReturns }
 */
function calculateLumpsum(P, annualRate, years) {
  const r = annualRate / 100;
  const futureValue = P * Math.pow(1 + r, years);
  const estimatedReturns = futureValue - P;
  return { futureValue, totalInvested: P, estimatedReturns };
}

/**
 * Calculate CAGR
 * Formula: ((End Value / Begin Value) ^ (1 / years)) - 1
 * @param {number} beginValue
 * @param {number} endValue
 * @param {number} years
 * @returns {number} CAGR in %
 */
function calculateCAGR(beginValue, endValue, years) {
  return (Math.pow(endValue / beginValue, 1 / years) - 1) * 100;
}

/**
 * Calculate SWP (Systematic Withdrawal Plan)
 * Uses annuity-depletion formula: n = -ln(1 - C*r/W) / ln(1+r)
 * @param {number} corpus - Initial corpus amount
 * @param {number} monthlyWithdrawal - Monthly withdrawal amount
 * @param {number} annualRate - Annual return rate in %
 * @returns {object} { months, years, remainingMonths, totalWithdrawn, isIndefinite }
 *   isIndefinite: true when monthly interest earned >= monthly withdrawal
 */
function calculateSWP(corpus, monthlyWithdrawal, annualRate) {
  const r = annualRate / 100 / 12;
  if (monthlyWithdrawal <= corpus * r) {
    return { months: 0, years: 0, remainingMonths: 0, totalWithdrawn: 0, isIndefinite: true };
  }
  const n = r === 0
    ? corpus / monthlyWithdrawal
    : -Math.log(1 - (corpus * r) / monthlyWithdrawal) / Math.log(1 + r);
  const months = Math.ceil(n);
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  const totalWithdrawn = monthlyWithdrawal * months;
  return { months, years, remainingMonths, totalWithdrawn, isIndefinite: false };
}

/**
 * Calculate STP (Systematic Transfer Plan) from Debt to Equity
 * Each month: debt grows at debtRate, transfer moves to equity which grows at equityRate
 * @param {number} lumpSum - Initial lump sum amount placed in debt fund
 * @param {number} monthlyTransfer - Monthly transfer amount from debt to equity
 * @param {number} debtRate - Annual return rate of debt fund in %
 * @param {number} equityRate - Annual return rate of equity fund in %
 * @param {number} months - STP duration in months
 * @returns {object} { debtCorpus, equityCorpus, totalCorpus, totalTransferred,
 *                     breakdown, directEquityValue, debtOnlyValue }
 *   breakdown: Array of { month, debtCorpus, equityCorpus, totalCorpus }
 */
function calculateSTP(lumpSum, monthlyTransfer, debtRate, equityRate, months) {
  const dr = debtRate / 100 / 12;
  const er = equityRate / 100 / 12;
  let debtCorpus = lumpSum;
  let equityCorpus = 0;
  let totalTransferred = 0;
  const breakdown = [];

  for (let m = 1; m <= months; m++) {
    debtCorpus = debtCorpus * (1 + dr);
    const transfer = Math.min(monthlyTransfer, debtCorpus);
    debtCorpus -= transfer;
    totalTransferred += transfer;
    equityCorpus = (equityCorpus + transfer) * (1 + er);
    breakdown.push({
      month: m,
      debtCorpus: Math.round(debtCorpus),
      equityCorpus: Math.round(equityCorpus),
      totalCorpus: Math.round(debtCorpus + equityCorpus)
    });
  }

  const totalCorpus = debtCorpus + equityCorpus;
  const directEquityValue = lumpSum * Math.pow(1 + equityRate / 100 / 12, months);
  const debtOnlyValue = lumpSum * Math.pow(1 + debtRate / 100 / 12, months);

  return { debtCorpus, equityCorpus, totalCorpus, totalTransferred, breakdown, directEquityValue, debtOnlyValue };
}