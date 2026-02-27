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