/**
 * logic.test.js — Unit Tests for Live Valuation Logic
 */

function isMarketOpenAt(date) {
    // IST is UTC + 5:30
    const istTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    const hours = istTime.getUTCHours();
    const minutes = istTime.getUTCMinutes();
    const day = istTime.getUTCDay();

    if (day === 0 || day === 6) return false;

    const currentTimeInMinutes = hours * 60 + minutes;
    const marketOpenTimeInMinutes = 9 * 60 + 15;
    const marketCloseTimeInMinutes = 15 * 60 + 30;

    return currentTimeInMinutes >= marketOpenTimeInMinutes && currentTimeInMinutes <= marketCloseTimeInMinutes;
}

function calculatePercentChange(current, saved) {
    if (!saved) return null;
    return ((current - saved) / saved) * 100;
}

// Test Runner
let passed = 0;
let failed = 0;

function assert(condition, testName) {
    if (condition) {
        console.log(`  ✓ ${testName}`);
        passed++;
    } else {
        console.error(`  ✗ ${testName}`);
        failed++;
    }
}

console.log("── Live Valuation Logic Tests ──");

// 1. Market Hours Tests (IST)
{
    // Monday 10:00 AM IST -> UTC 4:30 AM
    const mon10amIST = new Date('2026-03-09T04:30:00Z');
    assert(isMarketOpenAt(mon10amIST) === true, "Market should be open at 10:00 AM IST on Monday");

    // Monday 9:00 AM IST -> UTC 3:30 AM
    const mon9amIST = new Date('2026-03-09T03:30:00Z');
    assert(isMarketOpenAt(mon9amIST) === false, "Market should be closed at 9:00 AM IST on Monday");

    // Monday 3:45 PM IST -> UTC 10:15 AM
    const mon345pmIST = new Date('2026-03-09T10:15:00Z');
    assert(isMarketOpenAt(mon345pmIST) === false, "Market should be closed at 3:45 PM IST on Monday");

    // Sunday 12:00 PM IST -> UTC 6:30 AM
    const sun12pmIST = new Date('2026-03-08T06:30:00Z');
    assert(isMarketOpenAt(sun12pmIST) === false, "Market should be closed on Sunday");
}

// 2. Percent Change Tests
{
    assert(calculatePercentChange(110, 100) === 10, "100 -> 110 should be 10%");
    assert(calculatePercentChange(90, 100) === -10, "100 -> 90 should be -10%");
    assert(calculatePercentChange(100, 100) === 0, "100 -> 100 should be 0%");
}

console.log("\n─────────────────────────────────────────");
console.log(`Results: ${passed} passed, ${failed} failed.`);

if (failed > 0) process.exit(1);
