/**
 * app.js — Live Portfolio Valuation Logic
 */

const fileInput = document.getElementById('fileInput');
const sheetNameInput = document.getElementById('sheetName');
const saveEodBtn = document.getElementById('saveEodBtn');
const refreshValuationBtn = document.getElementById('refreshValuationBtn');
const resultDiv = document.getElementById('result');
const tableContainer = document.getElementById('tableContainer');

let portfolioData = [];
let lastFetchedSheetName = '';
let isinToSymbolMap = null;

// Proxy and API configuration
const NSE_CSV_URL = '../assets/EQUITY_L.csv';
const API_BASE_URL = 'https://nse-api-ruby.vercel.app';

/**
 * Check if current time is within Indian Market Hours (9:15 AM - 3:30 PM IST)
 * IST is UTC + 5:30
 */
function isMarketOpen() {
    const now = new Date();
    // Convert current time to IST
    const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const hours = istTime.getUTCHours();
    const minutes = istTime.getUTCMinutes();
    const day = istTime.getUTCDay();

    // Market is closed on Saturday (6) and Sunday (0)
    if (day === 0 || day === 6) return false;

    const currentTimeInMinutes = hours * 60 + minutes;
    const marketOpenTimeInMinutes = 9 * 60 + 15;
    const marketCloseTimeInMinutes = 14 * 60; // 2:00 PM IST

    return currentTimeInMinutes >= marketOpenTimeInMinutes && currentTimeInMinutes <= marketCloseTimeInMinutes;
}

/**
 * Delay execution for a specified time
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch NSE ISIN Mapping
 */
async function fetchISINMapping() {
    if (isinToSymbolMap) return isinToSymbolMap;

    try {
        const response = await fetch(NSE_CSV_URL);
        if (!response.ok) throw new Error('Failed to fetch NSE ISIN mapping');
        const text = await response.text();
        const lines = text.split('\n');
        const mapping = {};

        // Skip header, parse SYMBOL (col 0) and ISIN (col 6)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const cols = line.split(',');
            if (cols.length > 6) {
                const symbol = cols[0].trim();
                const isin = cols[6].trim();
                if (symbol && isin) {
                    mapping[isin] = symbol + '.NS';
                }
            }
        }
        isinToSymbolMap = mapping;
        return isinToSymbolMap;
    } catch (error) {
        console.error('Error fetching ISIN mapping:', error);
        throw new Error('Could not load ISIN mapping from NSE');
    }
}

/**
 * Get Ticker from ISIN using Search API and NSE Mapping fallback
 */
async function getTicker(isin) {
    // Try Search API first
    try {
        const response = await fetch(`${API_BASE_URL}/search?q=${isin}`);
        if (response.ok) {
            const data = await response.json();
            if (data.status === 'success' && data.results && data.results.length > 0) {
                return data.results[0].symbol + '.NS';
            }
        }
    } catch (error) {
        console.warn(`Search API failed for ${isin}, falling back to NSE list:`, error);
    }

    // Fallback to NSE ISIN mapping
    const mapping = await fetchISINMapping();
    if (mapping[isin]) {
        return mapping[isin];
    }
    throw new Error(`Symbol not found for ISIN ${isin}`);
}

/**
 * Update the valuation results using Batch API
 */
async function updateValuation() {
    if (portfolioData.length === 0) return;

    resultDiv.innerHTML = 'Refreshing prices...';

    // 1. Resolve all tickers first
    for (const item of portfolioData) {
        if (!item.ticker) {
            try {
                item.status = 'Fetching Ticker';
                displayResults(calculateGrandTotal(portfolioData), portfolioData);
                item.ticker = await getTicker(item.isin);
            } catch (error) {
                item.status = 'Error';
                item.error = 'Ticker not found';
            }
        }
    }

    // 2. Identify tickers that need updating (not in cache or expired)
    const oneHour = 60 * 60 * 1000;
    const tickersToFetch = [];

    portfolioData.forEach(item => {
        if (!item.ticker) return;

        const cacheKey = `price_${item.ticker}`;
        const cachedData = localStorage.getItem(cacheKey);

        if (cachedData) {
            const { price, changesPercentage, timestamp } = JSON.parse(cachedData);
            if (Date.now() - timestamp < oneHour) {
                item.price = price;
                item.changesPercentage = changesPercentage;
                item.total = item.quantity * price;
                item.status = 'Success';
                return;
            }
        }
        tickersToFetch.push(item.ticker);
        item.status = 'Fetching Price';
    });

    displayResults(calculateGrandTotal(portfolioData), portfolioData);

    // 3. Batch Fetch Prices
    if (tickersToFetch.length > 0) {
        try {
            // Remove duplicates for the API call
            const uniqueTickers = [...new Set(tickersToFetch)];
            const response = await fetch(`${API_BASE_URL}/stock/list?symbols=${uniqueTickers.join(',')}&res=num`);

            if (!response.ok) throw new Error(`API returned ${response.status}`);
            const data = await response.json();

            if (data.status === 'success' && data.stocks) {
                data.stocks.forEach(stock => {
                    const priceData = {
                        price: stock.last_price,
                        changesPercentage: stock.percent_change,
                        timestamp: Date.now()
                    };
                    localStorage.setItem(`price_${stock.ticker}`, JSON.stringify(priceData));

                    // Update all items in portfolio with this ticker
                    portfolioData.forEach(item => {
                        if (item.ticker === stock.ticker) {
                            item.price = stock.last_price;
                            item.changesPercentage = stock.percent_change;
                            item.total = item.quantity * item.price;
                            item.status = 'Success';
                        }
                    });
                });
            }

            // Mark remaining as error if not found in response
            portfolioData.forEach(item => {
                if (item.status === 'Fetching Price') {
                    item.status = 'Error';
                    item.error = 'Price not available';
                }
            });

        } catch (error) {
            console.error('Batch fetch failed:', error);
            portfolioData.forEach(item => {
                if (item.status === 'Fetching Price') {
                    item.status = 'Error';
                    item.error = error.message;
                }
            });
        }
    }

    // 4. Final Recalculation and Display
    const currentGrandTotal = calculateGrandTotal(portfolioData);
    portfolioData.forEach(row => {
        if (row.status === 'Success' && currentGrandTotal > 0) {
            row.weightage = (row.total / currentGrandTotal) * 100;
            row.impact = (row.weightage / 100) * row.changesPercentage;
        } else {
            row.weightage = 0;
            row.impact = 0;
        }
    });

    displayResults(currentGrandTotal, portfolioData);
}

/**
 * Helper to calculate grand total from current portfolio data
 */
function calculateGrandTotal(rows) {
    return rows.reduce((acc, row) => acc + (typeof row.total === 'number' ? row.total : 0), 0);
}

/**
 * Display the results in the UI
 */
function displayResults(grandTotal, rows) {
    const savedEod = JSON.parse(localStorage.getItem('eodValue') || 'null');
    let comparisonHtml = '';

    if (savedEod && savedEod.value) {
        const changeValue = grandTotal - savedEod.value;
        const changePercent = (changeValue / savedEod.value) * 100;
        const changeClass = changeValue >= 0 ? 'positive' : 'negative';
        const sign = changeValue >= 0 ? '+' : '';

        comparisonHtml = `
            <div class="comparison-summary">
                Compared to saved EOD:
                <span class="${changeClass}">
                    ${sign}₹${changeValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    (${sign}${changePercent.toFixed(2)}%)
                </span>
            </div>
        `;
    }

    const totalImpact = rows.reduce((acc, row) => acc + (row.impact || 0), 0);
    const impactClass = totalImpact >= 0 ? 'positive' : 'negative';
    const impactSign = totalImpact >= 0 ? '+' : '';

    resultDiv.innerHTML = `
        <div class="valuation-header">
            ${lastFetchedSheetName} - Current Valuation: ₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span class="${impactClass}" style="margin-left: 10px; font-size: 0.9rem;">
                (${impactSign}${totalImpact.toFixed(2)}% Impact)
            </span>
        </div>
        ${comparisonHtml}
    `;

    let tableHtml = `
        <table>
            <thead>
                <tr>
                    <th>ISIN</th>
                    <th>Ticker</th>
                    <th>Qty</th>
                    <th>CMP</th>
                    <th>Weight (%)</th>
                    <th>Day Chg (%)</th>
                    <th>Impact (%)</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    rows.forEach(row => {
        const statusClass = `status-${(row.status || 'pending').toLowerCase()}`;
        const displayStatus = row.status === 'Error' ? `Error: ${row.error || 'Unknown'}` : (row.status || 'Pending');

        tableHtml += `
            <tr>
                <td>${row.isin}</td>
                <td>${row.ticker || 'N/A'}</td>
                <td>${row.quantity}</td>
                <td>${(row.price != null) ? '₹' + row.price.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : 'N/A'}</td>
                <td>${(row.weightage != null && row.status === 'Success') ? row.weightage.toFixed(2) + '%' : 'N/A'}</td>
                <td>${(row.changesPercentage != null && row.status === 'Success') ? row.changesPercentage.toFixed(2) + '%' : 'N/A'}</td>
                <td>${(row.impact != null && row.status === 'Success') ? row.impact.toFixed(4) + '%' : 'N/A'}</td>
                <td class="${statusClass}">${displayStatus}</td>
            </tr>
        `;
    });

    tableHtml += `
            </tbody>
            <tfoot>
                <tr style="font-weight: bold; background-color: #f9f9f9;">
                    <td colspan="4" style="text-align: right;">Total Portfolio Impact:</td>
                    <td colspan="3" class="${impactClass}">${impactSign}${totalImpact.toFixed(2)}%</td>
                    <td></td>
                </tr>
                <tr style="font-weight: bold; background-color: #f9f9f9;">
                    <td colspan="4" style="text-align: right;">Grand Total:</td>
                    <td colspan="3">₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td></td>
                </tr>
            </tfoot>
        </table>
    `;
    tableContainer.innerHTML = tableHtml;
}

/**
 * Parse Portfolio Data from raw rows (2D array)
 */
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

/**
 * Handle File Upload
 */
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const sheetName = sheetNameInput.value || 'Sheet1';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames.includes(sheetName)) {
            resultDiv.innerHTML = `<span class="negative">Sheet "${sheetName}" not found!</span>`;
            return;
        }

        lastFetchedSheetName = sheetName;
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        portfolioData = parsePortfolioData(rows);

        if (portfolioData.length === 0) {
            resultDiv.innerHTML = '<span class="negative">No valid data found in ISIN and Quantity columns.</span>';
        } else {
            updateValuation();
        }
    };
    reader.readAsArrayBuffer(file);
});

/**
 * Save EOD Value
 */
saveEodBtn.addEventListener('click', () => {
    const match = resultDiv.innerText.match(/Current Valuation: ₹([\d,.]+)/);
    if (match) {
        const total = parseFloat(match[1].replace(/,/g, ''));
        localStorage.setItem('eodValue', JSON.stringify({
            value: total,
            timestamp: Date.now()
        }));
        alert(`Saved EOD Value: ₹${total.toLocaleString('en-IN')}`);
        updateValuation(); // Refresh to show % change immediately
    } else {
        alert('No valuation data to save.');
    }
});

/**
 * Handle Refresh Valuation
 */
refreshValuationBtn.addEventListener('click', () => {
    // Clear price cache to force fresh data
    portfolioData.forEach(item => {
        if (item.ticker) {
            localStorage.removeItem(`price_${item.ticker}`);
        }
    });
    updateValuation();
});

// Auto-refresh logic
setInterval(() => {
    if (isMarketOpen()) {
        updateValuation();
    }
}, 60000);
