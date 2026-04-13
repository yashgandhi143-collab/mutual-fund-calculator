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
    const marketCloseTimeInMinutes = 14 * 60; // 2:00 PM IST

    return currentTimeInMinutes >= marketOpenTimeInMinutes && currentTimeInMinutes <= marketCloseTimeInMinutes;
}

function calculatePercentChange(current, saved) {
    if (!saved) return null;
    return ((current - saved) / saved) * 100;
}

function parsePortfolioData(rows) {
    let isinIdx = -1;
    let qtyIdx = -1;
    let headerRowIdx = -1;

    const isinHeaders = ['isin', 'isin code'];
    const qtyHeaders = ['quantity'];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!Array.isArray(row)) continue;

        for (let j = 0; j < row.length; j++) {
            const cell = String(row[j] || '').toLowerCase().trim();
            if (isinIdx === -1 && isinHeaders.includes(cell)) {
                isinIdx = j;
            }
            if (qtyIdx === -1 && qtyHeaders.includes(cell)) {
                qtyIdx = j;
            }
        }

        if (isinIdx !== -1 && qtyIdx !== -1) {
            headerRowIdx = i;
            break;
        } else {
            isinIdx = -1;
            qtyIdx = -1;
        }
    }

    if (headerRowIdx === -1) return [];

    const data = [];
    for (let i = headerRowIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        const isin = String(row[isinIdx] || '').trim();
        const quantity = parseFloat(row[qtyIdx]);

        if (isin && !isNaN(quantity) && isin.toLowerCase() !== 'nil') {
            data.push({ isin, quantity });
        }
    }
    return data;
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

    // Monday 2:15 PM IST -> UTC 8:45 AM
    const mon215pmIST = new Date('2026-03-09T08:45:00Z');
    assert(isMarketOpenAt(mon215pmIST) === false, "Market should be closed at 2:15 PM IST on Monday");

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

// 3. Portfolio Parsing Tests
{
    // Case 1: Standard headers on first row
    const rows1 = [
        ['ISIN', 'Quantity'],
        ['INF209K01157', 100],
        ['INF209K01165', 50]
    ];
    const data1 = parsePortfolioData(rows1);
    assert(data1.length === 2, "Should parse 2 rows with standard headers on first row");
    assert(data1[0].isin === 'INF209K01157' && data1[0].quantity === 100, "First row data should match");

    // Case 2: Headers on 5th row
    const rows2 = [
        ['Portfolio Report'],
        [],
        ['Date: 2026-04-13'],
        [],
        ['ISIN', 'Other Column', 'Quantity'],
        ['INF209K01157', 'PPLCF', 100],
        ['INF209K01165', 'PPLCF', 50]
    ];
    const data2 = parsePortfolioData(rows2);
    assert(data2.length === 2, "Should parse 2 rows with headers on 5th row");
    assert(data2[1].isin === 'INF209K01165' && data2[1].quantity === 50, "Second row data should match");

    // Case 3: Alias "ISIN Code"
    const rows3 = [
        ['ISIN Code', 'Quantity'],
        ['INF209K01157', 100]
    ];
    const data3 = parsePortfolioData(rows3);
    assert(data3.length === 1 && data3[0].isin === 'INF209K01157', "Should handle 'ISIN Code' alias");

    // Case 4: Handle "NIL" and invalid quantities
    const rows4 = [
        ['ISIN', 'Quantity'],
        ['NIL', 'NIL'],
        ['INF209K01157', 100],
        ['', 50],
        ['INF209K01165', 'abc']
    ];
    const data4 = parsePortfolioData(rows4);
    assert(data4.length === 1, "Should filter out NIL, empty ISIN, and invalid quantity");
    assert(data4[0].isin === 'INF209K01157', "Only valid row should be INF209K01157");
}

console.log("\n─────────────────────────────────────────");
console.log(`Results: ${passed} passed, ${failed} failed.`);

if (failed > 0) process.exit(1);
