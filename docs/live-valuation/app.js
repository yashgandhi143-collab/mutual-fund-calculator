/**
 * app.js — Live Portfolio Valuation Logic
 */

const fileInput = document.getElementById('fileInput');
const sheetNameInput = document.getElementById('sheetName');
const apiKeyInput = document.getElementById('apiKey');
const saveEodBtn = document.getElementById('saveEodBtn');
const resultDiv = document.getElementById('result');
const tableContainer = document.getElementById('tableContainer');

let portfolioData = [];
let lastFetchedSheetName = '';

// Proxy and API configuration
const PROXY_URL = 'https://api.allorigins.win/raw?url=';
const NSE_CSV_URL = 'https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv';
const FMP_PROFILE_URL = 'https://financialmodelingprep.com/stable/profile?symbol=';

let nseIsinMap = null;

/**
 * Fetch and parse NSE EQUITY_L CSV to map ISIN to Symbol
 */
async function loadNseIsinMapping() {
    if (nseIsinMap) return;
    try {
        const response = await fetch(`${PROXY_URL}${encodeURIComponent(NSE_CSV_URL)}`);
        if (!response.ok) throw new Error(`NSE CSV fetch failed: ${response.status}`);
        const csvText = await response.text();
        const lines = csvText.split('\n');
        nseIsinMap = {};

        // Skip header, parse lines
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            if (cols.length >= 7) {
                const symbol = cols[0].trim();
                const isin = cols[6].trim();
                if (symbol && isin) {
                    nseIsinMap[isin] = symbol;
                }
            }
        }
    } catch (error) {
        console.error('Error loading NSE ISIN mapping:', error);
        throw new Error('Failed to load ISIN-to-Symbol mapping');
    }
}

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
    const marketCloseTimeInMinutes = 15 * 60 + 30;

    return currentTimeInMinutes >= marketOpenTimeInMinutes && currentTimeInMinutes <= marketCloseTimeInMinutes;
}

/**
 * Delay execution for a specified time
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch Ticker from ISIN
 */
async function fetchTicker(isin) {
    try {
        await loadNseIsinMapping();
        if (nseIsinMap && nseIsinMap[isin]) {
            return nseIsinMap[isin] + '.NS';
        }
        throw new Error('Symbol not found in NSE mapping for this ISIN');
    } catch (error) {
        throw error;
    }
}

/**
 * Fetch Current Market Price for a Ticker
 */
async function fetchPrice(ticker) {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) throw new Error('FMP API Key is required');

    try {
        const response = await fetch(`${PROXY_URL}${encodeURIComponent(`${FMP_PROFILE_URL}${ticker}&apikey=${apiKey}`)}`);
        if (!response.ok) throw new Error(`Price API returned ${response.status}`);
        const data = await response.json();
        if (data && data.length > 0 && data[0].price !== undefined) {
            return data[0].price;
        }
        throw new Error('Price data not available');
    } catch (error) {
        throw error;
    }
}

/**
 * Update the valuation results
 */
async function updateValuation() {
    if (portfolioData.length === 0) return;

    resultDiv.innerHTML = 'Refreshing prices...';

    // Initialize statuses if not present
    portfolioData.forEach(item => {
        if (!item.status) item.status = 'Pending';
        if (!item.error) item.error = '';
    });

    // Initial display
    displayResults(calculateGrandTotal(portfolioData), portfolioData);

    for (const item of portfolioData) {
        item.status = 'Fetching';
        item.error = '';
        displayResults(calculateGrandTotal(portfolioData), portfolioData);

        try {
            // Rate limiting: wait 500ms between requests
            await delay(500);

            let ticker = item.ticker;
            if (!ticker) {
                ticker = await fetchTicker(item.isin);
                item.ticker = ticker; // Cache it
            }

            const price = await fetchPrice(ticker);

            if (price !== null) {
                item.price = price;
                item.total = item.quantity * price;
                item.status = 'Success';
            } else {
                item.total = 0;
                item.status = 'Error';
                item.error = 'Price not available';
            }
        } catch (error) {
            console.error(`Error updating valuation for ${item.isin}:`, error);
            item.total = 0;
            item.status = 'Error';
            item.error = error.message;
        }

        displayResults(calculateGrandTotal(portfolioData), portfolioData);
    }
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

    resultDiv.innerHTML = `
        <div class="valuation-header">
            ${lastFetchedSheetName} - Current Valuation: ₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        ${comparisonHtml}
    `;

    let tableHtml = `
        <table>
            <thead>
                <tr>
                    <th>ISIN</th>
                    <th>Ticker</th>
                    <th>Quantity</th>
                    <th>CMP</th>
                    <th>Row Total</th>
                    <th>Status / Error</th>
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
                <td>${(row.price != null && row.price !== 'N/A') ? '₹' + row.price.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : 'N/A'}</td>
                <td>${(row.total != null && row.total !== 'N/A' && row.status === 'Success') ? '₹' + row.total.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : 'N/A'}</td>
                <td class="${statusClass}">${displayStatus}</td>
            </tr>
        `;
    });

    tableHtml += `
            </tbody>
            <tfoot>
                <tr style="font-weight: bold; background-color: #f9f9f9;">
                    <td colspan="4" style="text-align: right;">Grand Total:</td>
                    <td>₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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

// Auto-refresh logic
setInterval(() => {
    if (isMarketOpen()) {
        updateValuation();
    }
}, 60000);
