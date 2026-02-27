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