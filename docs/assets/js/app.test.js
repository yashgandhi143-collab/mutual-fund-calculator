/**
 * app.test.js — Comprehensive Unit Tests for Mutual Fund Calculator
 * Tests all core calculation functions in app.js with 10+ cases per calculator.
 * Run with: node docs/assets/js/app.test.js
 */

// ─── Load functions under test ────────────────────────────────────────────────
// Re-define all functions here so tests run in Node.js without a browser.

function formatINR(value) {
  return "Rs. " + Math.round(value).toLocaleString("en-IN");
}

function formatPercent(value) {
  return value + "%";
}

function calculateSIP(P, annualRate, years) {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  const futureValue = P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  const totalInvested = P * n;
  const estimatedReturns = futureValue - totalInvested;
  return { futureValue, totalInvested, estimatedReturns };
}

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
    yearlyBreakdown.push({ year: y, monthlySIP, yearlyInvested, corpusAtEndOfYear: corpus });
  }
  const futureValue = corpus;
  const estimatedReturns = futureValue - totalInvested;
  return { futureValue, totalInvested, estimatedReturns, yearlyBreakdown };
}

function calculateInflationAdjusted(nominalValue, inflationRate, years) {
  const inflationAdjustedValue = nominalValue / Math.pow(1 + inflationRate / 100, years);
  const purchasingPowerLoss = nominalValue - inflationAdjustedValue;
  return { inflationAdjustedValue, purchasingPowerLoss };
}

function calculateLumpsum(P, annualRate, years) {
  const r = annualRate / 100;
  const futureValue = P * Math.pow(1 + r, years);
  const estimatedReturns = futureValue - P;
  return { futureValue, totalInvested: P, estimatedReturns };
}

function calculateCAGR(beginValue, endValue, years) {
  return (Math.pow(endValue / beginValue, 1 / years) - 1) * 100;
}

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

// ─── Test runner ──────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition, testName, detail) {
  if (condition) {
    console.log("  ✓ " + testName);
    passed++;
  } else {
    console.error("  ✗ " + testName + (detail ? " | " + detail : ""));
    failed++;
  }
}

function approxEqual(a, b, tolerance) {
  tolerance = tolerance || 1;
  return Math.abs(a - b) <= tolerance;
}

function section(name) {
  console.log("\n── " + name + " ──");
}

// ─── SIP Calculator Tests ─────────────────────────────────────────────────────
section("SIP Calculator — calculateSIP");

// 1. Standard 10-year SIP at 12%
{
  const r = calculateSIP(5000, 12, 10);
  assert(approxEqual(r.totalInvested, 600000, 0), "TC-SIP-01: 10yr totalInvested = 6,00,000",
    "got " + r.totalInvested);
  assert(approxEqual(r.futureValue, 1161695, 2), "TC-SIP-02: 10yr @ 12% futureValue ≈ 11,61,695",
    "got " + r.futureValue.toFixed(2));
}

// 3. estimatedReturns = futureValue − totalInvested
{
  const r = calculateSIP(5000, 12, 10);
  assert(approxEqual(r.estimatedReturns, r.futureValue - r.totalInvested, 1),
    "TC-SIP-03: estimatedReturns = futureValue − totalInvested", "delta=" + (r.estimatedReturns - (r.futureValue - r.totalInvested)));
}

// 4. 1-year SIP
{
  const r = calculateSIP(1000, 12, 1);
  assert(approxEqual(r.totalInvested, 12000, 0), "TC-SIP-04: 1yr totalInvested = 12,000");
  assert(approxEqual(r.futureValue, 12809, 2), "TC-SIP-05: 1yr @ 12% futureValue ≈ 12,809",
    "got " + r.futureValue.toFixed(2));
}

// 6. futureValue must always exceed totalInvested when rate > 0
{
  const cases = [
    [500, 1, 1], [1000, 5, 5], [5000, 12, 10], [10000, 15, 20], [50000, 18, 15]
  ];
  cases.forEach(([P, rate, yrs]) => {
    const r = calculateSIP(P, rate, yrs);
    assert(r.futureValue > r.totalInvested,
      "TC-SIP-06: FV > invested for SIP(" + P + "," + rate + "%," + yrs + "yr)");
  });
}

// 11. Higher rate yields higher corpus (same P, years)
{
  const low  = calculateSIP(5000, 8, 10);
  const high = calculateSIP(5000, 15, 10);
  assert(high.futureValue > low.futureValue,
    "TC-SIP-11: 15% rate yields higher FV than 8% (same P & years)");
}

// 12. Longer duration yields higher corpus (same P, rate)
{
  const short = calculateSIP(5000, 12, 10);
  const long  = calculateSIP(5000, 12, 20);
  assert(long.futureValue > short.futureValue,
    "TC-SIP-12: 20yr yields higher FV than 10yr (same P & rate)");
}

// 13. Higher monthly investment yields higher corpus
{
  const small = calculateSIP(1000, 12, 10);
  const large = calculateSIP(5000, 12, 10);
  assert(large.futureValue > small.futureValue,
    "TC-SIP-13: P=5000 yields higher FV than P=1000 (same rate & years)");
}

// 14. High-rate 40-year SIP produces enormous returns
{
  const r = calculateSIP(100000, 30, 40);
  assert(r.futureValue > r.totalInvested * 10,
    "TC-SIP-14: 30% over 40yr returns > 10× invested");
}

// 15. Minimum SIP values still produce positive returns
{
  const r = calculateSIP(500, 1, 1);
  assert(r.futureValue > 0 && r.estimatedReturns >= 0,
    "TC-SIP-15: Minimum inputs (500, 1%, 1yr) produce valid non-negative results");
}

// ─── Top-Up SIP Tests ─────────────────────────────────────────────────────────
section("Top-Up SIP — calculateTopUpSIP");

// 1. Yearly breakdown length matches years
{
  const r = calculateTopUpSIP(5000, 12, 10, 10);
  assert(r.yearlyBreakdown.length === 10, "TC-TOPUP-01: breakdown has 10 entries for 10-year SIP");
}

// 2. Year 1 monthlySIP equals initial P (no top-up in year 1)
{
  const r = calculateTopUpSIP(5000, 12, 10, 10);
  assert(r.yearlyBreakdown[0].monthlySIP === 5000,
    "TC-TOPUP-02: year 1 monthlySIP = initial P = 5000",
    "got " + r.yearlyBreakdown[0].monthlySIP);
}

// 3. Year 2 monthlySIP = round(P * (1 + topUpRate/100))
{
  const r = calculateTopUpSIP(5000, 12, 10, 10);
  assert(r.yearlyBreakdown[1].monthlySIP === 5500,
    "TC-TOPUP-03: year 2 monthlySIP = 5500 (10% top-up of 5000)",
    "got " + r.yearlyBreakdown[1].monthlySIP);
}

// 4. With 0% top-up, totalInvested ≈ P × 12 × years (within ±1 due to rounding)
{
  const r = calculateTopUpSIP(5000, 12, 10, 0);
  assert(r.totalInvested === 600000,
    "TC-TOPUP-04: 0% top-up totalInvested = 6,00,000",
    "got " + r.totalInvested);
}

// 5. With 0% top-up, futureValue should be close to plain SIP value
{
  const topup = calculateTopUpSIP(5000, 12, 10, 0);
  const plain = calculateSIP(5000, 12, 10);
  assert(approxEqual(topup.futureValue, plain.futureValue, 2),
    "TC-TOPUP-05: 0% top-up FV ≈ plain SIP FV (within ±2)",
    "topup=" + topup.futureValue + " plain=" + Math.round(plain.futureValue));
}

// 6. With top-up > 0, FV > plain SIP FV
{
  const topup = calculateTopUpSIP(5000, 12, 10, 10);
  const plain = calculateSIP(5000, 12, 10);
  assert(topup.futureValue > plain.futureValue,
    "TC-TOPUP-06: 10% top-up FV > plain SIP FV");
}

// 7. Corpus increases each year
{
  const r = calculateTopUpSIP(5000, 12, 10, 10);
  let monotone = true;
  for (let i = 1; i < r.yearlyBreakdown.length; i++) {
    if (r.yearlyBreakdown[i].corpusAtEndOfYear <= r.yearlyBreakdown[i - 1].corpusAtEndOfYear) {
      monotone = false;
      break;
    }
  }
  assert(monotone, "TC-TOPUP-07: corpus grows each year");
}

// 8. estimatedReturns = futureValue − totalInvested
{
  const r = calculateTopUpSIP(5000, 12, 10, 10);
  assert(approxEqual(r.estimatedReturns, r.futureValue - r.totalInvested, 1),
    "TC-TOPUP-08: estimatedReturns = futureValue − totalInvested",
    "delta=" + (r.estimatedReturns - (r.futureValue - r.totalInvested)));
}

// 9. Higher top-up rate yields more total invested and more FV
{
  const low  = calculateTopUpSIP(5000, 12, 10, 5);
  const high = calculateTopUpSIP(5000, 12, 10, 15);
  assert(high.totalInvested > low.totalInvested && high.futureValue > low.futureValue,
    "TC-TOPUP-09: higher top-up rate → more invested and more FV");
}

// 10. Last breakdown entry corpus = futureValue
{
  const r = calculateTopUpSIP(10000, 15, 5, 10);
  const lastEntry = r.yearlyBreakdown[r.yearlyBreakdown.length - 1];
  assert(lastEntry.corpusAtEndOfYear === r.futureValue,
    "TC-TOPUP-10: last breakdown entry corpus = futureValue",
    "last=" + lastEntry.corpusAtEndOfYear + " fv=" + r.futureValue);
}

// 11. Yearly invested = monthlySIP × 12 (no rounding issues)
{
  const r = calculateTopUpSIP(5000, 12, 10, 10);
  const year1 = r.yearlyBreakdown[0];
  assert(year1.yearlyInvested === year1.monthlySIP * 12,
    "TC-TOPUP-11: year 1 yearlyInvested = monthlySIP × 12",
    year1.yearlyInvested + " vs " + year1.monthlySIP * 12);
}

// ─── Lumpsum Calculator Tests ─────────────────────────────────────────────────
section("Lumpsum Calculator — calculateLumpsum");

// 1. Standard 10yr @ 12%
{
  const r = calculateLumpsum(100000, 12, 10);
  assert(approxEqual(r.futureValue, 310585, 1),
    "TC-LS-01: 1L @ 12% for 10yr ≈ 3,10,585",
    "got " + r.futureValue.toFixed(2));
}

// 2. totalInvested = P (lumpsum is one-time)
{
  const r = calculateLumpsum(100000, 12, 10);
  assert(r.totalInvested === 100000, "TC-LS-02: totalInvested = initial principal");
}

// 3. estimatedReturns = futureValue − P
{
  const r = calculateLumpsum(100000, 12, 10);
  assert(approxEqual(r.estimatedReturns, r.futureValue - 100000, 1),
    "TC-LS-03: estimatedReturns = futureValue − P");
}

// 4. 5yr @ 10%
{
  const r = calculateLumpsum(50000, 10, 5);
  assert(approxEqual(r.futureValue, 80526, 1),
    "TC-LS-04: 50K @ 10% for 5yr ≈ 80,526",
    "got " + r.futureValue.toFixed(2));
}

// 5. 1yr @ 12% = P × 1.12
{
  const r = calculateLumpsum(10000, 12, 1);
  assert(approxEqual(r.futureValue, 11200, 1),
    "TC-LS-05: 10K @ 12% for 1yr = 11,200",
    "got " + r.futureValue.toFixed(2));
}

// 6. FV > P for any positive rate
{
  const cases = [[10000, 1, 1], [100000, 12, 10], [500000, 15, 20], [50000, 10, 5]];
  cases.forEach(([P, rate, yrs]) => {
    const r = calculateLumpsum(P, rate, yrs);
    assert(r.futureValue > P,
      "TC-LS-06: FV > P for Lumpsum(" + P + "," + rate + "%," + yrs + "yr)");
  });
}

// 7. Higher rate → higher FV (same P and years)
{
  const low  = calculateLumpsum(100000, 8, 10);
  const high = calculateLumpsum(100000, 15, 10);
  assert(high.futureValue > low.futureValue,
    "TC-LS-07: 15% rate yields higher FV than 8%");
}

// 8. Longer duration → higher FV (same P and rate)
{
  const short = calculateLumpsum(100000, 12, 5);
  const long  = calculateLumpsum(100000, 12, 20);
  assert(long.futureValue > short.futureValue,
    "TC-LS-08: 20yr yields higher FV than 5yr");
}

// 9. Doubling of P doubles FV (linear scaling)
{
  const r1 = calculateLumpsum(100000, 12, 10);
  const r2 = calculateLumpsum(200000, 12, 10);
  assert(approxEqual(r2.futureValue, 2 * r1.futureValue, 1),
    "TC-LS-09: doubling P doubles FV",
    "2×r1=" + (2 * r1.futureValue).toFixed(2) + " r2=" + r2.futureValue.toFixed(2));
}

// 10. 500K @ 15% for 20yr ≈ 81,83,269
{
  const r = calculateLumpsum(500000, 15, 20);
  assert(approxEqual(r.futureValue, 8183269, 2),
    "TC-LS-10: 5L @ 15% for 20yr ≈ 81,83,269",
    "got " + Math.round(r.futureValue));
}

// 11. Minimum lumpsum (10000 per slider) @ 1% for 1yr
{
  const r = calculateLumpsum(10000, 1, 1);
  assert(approxEqual(r.futureValue, 10100, 1),
    "TC-LS-11: 10K @ 1% for 1yr = 10,100");
}

// ─── CAGR Calculator Tests ────────────────────────────────────────────────────
section("CAGR Calculator — calculateCAGR");

// 1. Known CAGR: lumpsum growth at 12% over 10yr
{
  const fv = calculateLumpsum(100000, 12, 10).futureValue;
  const cagr = calculateCAGR(100000, fv, 10);
  assert(approxEqual(cagr, 12, 0.001),
    "TC-CAGR-01: CAGR of 12% lumpsum growth = 12%",
    "got " + cagr.toFixed(4));
}

// 2. No growth → CAGR = 0
{
  const cagr = calculateCAGR(100000, 100000, 5);
  assert(cagr === 0, "TC-CAGR-02: same begin/end value → CAGR = 0%", "got " + cagr);
}

// 3. Doubling in 10yr → CAGR ≈ 7.18%
{
  const cagr = calculateCAGR(100000, 200000, 10);
  assert(approxEqual(cagr, 7.177, 0.001),
    "TC-CAGR-03: 100K→200K in 10yr ≈ 7.18% CAGR",
    "got " + cagr.toFixed(4));
}

// 4. Tripling in 10yr → CAGR ≈ 11.61%
{
  const cagr = calculateCAGR(100000, 300000, 10);
  assert(approxEqual(cagr, 11.61, 0.01),
    "TC-CAGR-04: 100K→300K in 10yr ≈ 11.61% CAGR",
    "got " + cagr.toFixed(4));
}

// 5. 50K → 100K in 7yr → CAGR ≈ 10.41%
{
  const cagr = calculateCAGR(50000, 100000, 7);
  assert(approxEqual(cagr, 10.41, 0.01),
    "TC-CAGR-05: 50K→100K in 7yr ≈ 10.41% CAGR",
    "got " + cagr.toFixed(4));
}

// 6. Higher FV (same P, years) → higher CAGR
{
  const low  = calculateCAGR(100000, 200000, 10);
  const high = calculateCAGR(100000, 400000, 10);
  assert(high > low, "TC-CAGR-06: higher FV → higher CAGR");
}

// 7. Longer duration (same P, FV) → lower CAGR
{
  const short = calculateCAGR(100000, 200000, 5);
  const long  = calculateCAGR(100000, 200000, 10);
  assert(long < short, "TC-CAGR-07: longer duration → lower CAGR for same P→FV");
}

// 8. CAGR is always positive when FV > P
{
  const cagr = calculateCAGR(100000, 310585, 10);
  assert(cagr > 0, "TC-CAGR-08: CAGR > 0 when FV > P");
}

// 9. CAGR round-trip with lumpsum (FV=P*(1+r)^n → CAGR=r)
{
  const rates = [6, 10, 15, 20, 25];
  rates.forEach(rate => {
    const fv = calculateLumpsum(100000, rate, 10).futureValue;
    const cagr = calculateCAGR(100000, fv, 10);
    assert(approxEqual(cagr, rate, 0.001),
      "TC-CAGR-09: round-trip CAGR ≈ " + rate + "% (lumpsum @ " + rate + "% for 10yr)",
      "got " + cagr.toFixed(4));
  });
}

// 10. 4× growth in 5yr → CAGR ≈ 31.95%
{
  const cagr = calculateCAGR(100000, 400000, 5);
  assert(approxEqual(cagr, 31.95, 0.01),
    "TC-CAGR-10: 1L→4L in 5yr ≈ 31.95% CAGR",
    "got " + cagr.toFixed(4));
}

// ─── Inflation-Adjusted Value Tests ───────────────────────────────────────────
section("Inflation Adjustment — calculateInflationAdjusted");

// 1. Adjusted value < nominal value for inflation > 0
{
  const r = calculateInflationAdjusted(1000000, 6, 10);
  assert(r.inflationAdjustedValue < 1000000,
    "TC-INF-01: adjusted value < nominal value");
}

// 2. purchasingPowerLoss = nominalValue − adjustedValue
{
  const r = calculateInflationAdjusted(1000000, 6, 10);
  assert(approxEqual(r.purchasingPowerLoss, 1000000 - r.inflationAdjustedValue, 1),
    "TC-INF-02: purchasingPowerLoss = nominal − adjusted");
}

// 3. Known value: 1000000 @ 6% over 10yr ≈ 558,395
{
  const r = calculateInflationAdjusted(1000000, 6, 10);
  assert(approxEqual(r.inflationAdjustedValue, 558395, 2),
    "TC-INF-03: 10L @ 6% inflation for 10yr ≈ 5,58,395",
    "got " + r.inflationAdjustedValue.toFixed(2));
}

// 4. Higher inflation rate → lower adjusted value
{
  const low  = calculateInflationAdjusted(1000000, 4, 10);
  const high = calculateInflationAdjusted(1000000, 10, 10);
  assert(low.inflationAdjustedValue > high.inflationAdjustedValue,
    "TC-INF-04: higher inflation → lower adjusted value");
}

// 5. Longer period → lower adjusted value (same nominal & rate)
{
  const short = calculateInflationAdjusted(1000000, 6, 5);
  const long  = calculateInflationAdjusted(1000000, 6, 20);
  assert(long.inflationAdjustedValue < short.inflationAdjustedValue,
    "TC-INF-05: longer period → lower adjusted value");
}

// 6. Zero inflation → adjusted = nominal
{
  const r = calculateInflationAdjusted(1000000, 0, 10);
  assert(r.inflationAdjustedValue === 1000000,
    "TC-INF-06: 0% inflation → adjusted = nominal");
}

// 7. 1 year adjustment formula: nominal / (1 + rate/100)
{
  const nominal = 500000;
  const rate = 6;
  const r = calculateInflationAdjusted(nominal, rate, 1);
  const expected = nominal / (1 + rate / 100);
  assert(approxEqual(r.inflationAdjustedValue, expected, 1),
    "TC-INF-07: 1yr adjustment = nominal / (1 + rate/100)",
    "expected=" + expected.toFixed(2) + " got=" + r.inflationAdjustedValue.toFixed(2));
}

// 8. SIP corpus inflation adjusted with known values
{
  const sipFV = calculateSIP(5000, 12, 10).futureValue;
  const r = calculateInflationAdjusted(sipFV, 6, 10);
  assert(approxEqual(r.inflationAdjustedValue, 648684, 2),
    "TC-INF-08: SIP 10yr FV adjusted @ 6% inflation ≈ 6,48,684",
    "got " + r.inflationAdjustedValue.toFixed(2));
}

// 9. purchasingPowerLoss is always non-negative for inflation >= 0
{
  const r = calculateInflationAdjusted(1000000, 8, 15);
  assert(r.purchasingPowerLoss >= 0,
    "TC-INF-09: purchasingPowerLoss >= 0");
}

// 10. Doubling nominal doubles both adjusted value and power loss
{
  const r1 = calculateInflationAdjusted(500000, 6, 10);
  const r2 = calculateInflationAdjusted(1000000, 6, 10);
  assert(approxEqual(r2.inflationAdjustedValue, 2 * r1.inflationAdjustedValue, 1),
    "TC-INF-10: doubling nominal doubles adjusted value");
}

// ─── SWP Calculator Tests ─────────────────────────────────────────────────────
section("SWP Calculator — calculateSWP");

// 1. Corpus lasts finite time when withdrawal > monthly interest
{
  const r = calculateSWP(2000000, 20000, 8);
  assert(!r.isIndefinite, "TC-SWP-01: 20L corpus @ 8% with 20K/mo withdrawal is finite");
  assert(r.years === 13 && r.remainingMonths === 10,
    "TC-SWP-02: 20L/20K/8% lasts 13yr 10mo",
    "got " + r.years + "yr " + r.remainingMonths + "mo");
}

// 3. Corpus is indefinite when monthly interest >= withdrawal
{
  const r = calculateSWP(1000000, 5000, 10);
  assert(r.isIndefinite,
    "TC-SWP-03: 10L @ 10% with 5K/mo withdrawal is indefinite (monthly interest ≈ 8,333 > 5,000)");
}

// 4. totalWithdrawn = monthlyWithdrawal × months
{
  const r = calculateSWP(2000000, 20000, 8);
  assert(r.totalWithdrawn === 20000 * r.months,
    "TC-SWP-04: totalWithdrawn = withdrawal × months",
    "got " + r.totalWithdrawn + " expected " + (20000 * r.months));
}

// 5. When r=0, corpus depletes linearly
{
  const r = calculateSWP(100000, 5000, 0);
  assert(r.months === 20,
    "TC-SWP-05: 1L @ 0% with 5K/mo depletes in 20 months",
    "got " + r.months);
}

// 6. 5L corpus @ 8% with 10K/mo withdrawal — finite, ~5yr 2mo
{
  const r = calculateSWP(500000, 10000, 8);
  assert(!r.isIndefinite, "TC-SWP-06: 5L/10K/8% is finite");
  assert(r.years === 5 && r.remainingMonths === 2,
    "TC-SWP-07: 5L/10K/8% lasts 5yr 2mo",
    "got " + r.years + "yr " + r.remainingMonths + "mo");
}

// 8. 20L @ 8% with 30K/mo — finite
{
  const r = calculateSWP(2000000, 30000, 6);
  assert(!r.isIndefinite, "TC-SWP-08: 20L/30K/6% is finite");
  assert(r.years === 6 && r.remainingMonths === 10,
    "TC-SWP-09: 20L/30K/6% lasts 6yr 10mo",
    "got " + r.years + "yr " + r.remainingMonths + "mo");
}

// 10. Indefinite case: 50L @ 12% with 50K/mo (monthly interest = 50,000 = withdrawal)
{
  const r = calculateSWP(5000000, 50000, 12);
  assert(r.isIndefinite,
    "TC-SWP-10: 50L @ 12% with 50K/mo is indefinite (monthly interest = withdrawal)");
}

// 11. Higher withdrawal rate shortens corpus duration
{
  const low  = calculateSWP(2000000, 15000, 8);
  const high = calculateSWP(2000000, 25000, 8);
  assert(low.months > high.months,
    "TC-SWP-11: lower withdrawal → longer duration");
}

// 12. Higher return rate → longer corpus duration (or indefinite)
{
  const low  = calculateSWP(1000000, 10000, 6);
  const high = calculateSWP(1000000, 10000, 12);
  // 12% rate earns 10K/month = withdrawal → corpus is indefinite (strictly better)
  assert(high.isIndefinite || high.months >= low.months,
    "TC-SWP-12: higher return rate → longer or indefinite duration");
}

// ─── STP Calculator Tests ─────────────────────────────────────────────────────
section("STP Calculator — calculateSTP");

// 1. Breakdown has exactly 'months' entries
{
  const r = calculateSTP(500000, 25000, 7, 14, 24);
  assert(r.breakdown.length === 24,
    "TC-STP-01: breakdown has 24 entries for 24-month STP");
}

// 2. Debt corpus depletes when total transfer >= lump sum + interest
{
  const r = calculateSTP(500000, 25000, 7, 14, 24);
  assert(r.debtCorpus === 0,
    "TC-STP-02: debt corpus depleted after 500K / 25K/mo over 24 months");
}

// 3. Equity corpus > 0 after transfers
{
  const r = calculateSTP(500000, 25000, 7, 14, 24);
  assert(r.equityCorpus > 0, "TC-STP-03: equity corpus built up during STP");
}

// 4. totalCorpus = debtCorpus + equityCorpus
{
  const r = calculateSTP(500000, 25000, 7, 14, 24);
  assert(approxEqual(r.totalCorpus, r.debtCorpus + r.equityCorpus, 1),
    "TC-STP-04: totalCorpus = debtCorpus + equityCorpus");
}

// 5. directEquityValue = lumpSum * (1 + equityRate/12/100)^months
{
  const lumpSum = 500000; const equityRate = 14; const months = 24;
  const r = calculateSTP(lumpSum, 25000, 7, equityRate, months);
  const expected = lumpSum * Math.pow(1 + equityRate / 100 / 12, months);
  assert(approxEqual(r.directEquityValue, expected, 1),
    "TC-STP-05: directEquityValue = lumpsum compound at equity rate",
    "expected=" + expected.toFixed(2) + " got=" + r.directEquityValue.toFixed(2));
}

// 6. debtOnlyValue = lumpSum * (1 + debtRate/12/100)^months
{
  const lumpSum = 500000; const debtRate = 7; const months = 24;
  const r = calculateSTP(lumpSum, 25000, debtRate, 14, months);
  const expected = lumpSum * Math.pow(1 + debtRate / 100 / 12, months);
  assert(approxEqual(r.debtOnlyValue, expected, 1),
    "TC-STP-06: debtOnlyValue = lumpsum compound at debt rate",
    "expected=" + expected.toFixed(2) + " got=" + r.debtOnlyValue.toFixed(2));
}

// 7. Month 1 debt corpus = lumpSum*(1+dr) - min(transfer, debtCorpus)
{
  const lumpSum = 1000000; const debtRate = 7; const transfer = 50000;
  const r = calculateSTP(lumpSum, transfer, debtRate, 12, 1);
  const expectedDebt = lumpSum * (1 + debtRate / 100 / 12) - transfer;
  assert(r.breakdown[0].debtCorpus === Math.round(expectedDebt),
    "TC-STP-07: month 1 debtCorpus = lumpSum*(1+dr) - transfer",
    "expected=" + Math.round(expectedDebt) + " got=" + r.breakdown[0].debtCorpus);
}

// 8. When transfer > debt corpus, transfer is capped at debt corpus
{
  const r = calculateSTP(100000, 200000, 7, 14, 3);
  // After 1st month, debtCorpus should be 0
  assert(r.breakdown[0].debtCorpus === 0 || r.breakdown[1].debtCorpus === 0,
    "TC-STP-08: transfer capped at available debtCorpus (large transfer exhausts debt quickly)");
}

// 9. totalCorpus for large STP (1M, 50K/mo, 24 months)
{
  const r = calculateSTP(1000000, 50000, 6, 12, 24);
  assert(approxEqual(r.totalCorpus, 1215580, 5),
    "TC-STP-09: 1M / 50K/mo / 24mo total ≈ 12,15,580",
    "got " + Math.round(r.totalCorpus));
}

// 10. Higher equity rate → higher equity corpus
{
  const low  = calculateSTP(500000, 25000, 7, 12, 24);
  const high = calculateSTP(500000, 25000, 7, 18, 24);
  assert(high.equityCorpus > low.equityCorpus,
    "TC-STP-10: higher equity rate → higher equity corpus");
}

// 11. Longer STP duration → more equity built (when lumpsum not fully transferred)
{
  const short = calculateSTP(2000000, 50000, 7, 14, 24);
  const long  = calculateSTP(2000000, 50000, 7, 14, 36);
  assert(long.equityCorpus > short.equityCorpus,
    "TC-STP-11: longer duration → more equity corpus");
}

// 12. STP total corpus > 0 always
{
  const r = calculateSTP(500000, 25000, 7, 14, 24);
  assert(r.totalCorpus > 0, "TC-STP-12: totalCorpus > 0");
}

// ─── formatINR Tests ──────────────────────────────────────────────────────────
section("Utility — formatINR");
assert(formatINR(100000) === "Rs. 1,00,000",  "TC-FMT-01: 1,00,000 Indian format");
assert(formatINR(1000000) === "Rs. 10,00,000", "TC-FMT-02: 10,00,000 Indian format");
assert(formatINR(1161695.38) === "Rs. 11,61,695", "TC-FMT-03: 11,61,695 rounds and formats");
assert(formatINR(0) === "Rs. 0", "TC-FMT-04: zero formats correctly");

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log("\n─────────────────────────────────────────");
console.log("Results: " + passed + " passed, " + failed + " failed out of " + (passed + failed) + " tests.");
if (failed > 0) {
  console.error("SOME TESTS FAILED.");
  process.exit(1);
} else {
  console.log("All tests passed.");
}
