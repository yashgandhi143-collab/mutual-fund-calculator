/**
 * app.js — Live Portfolio Valuation Logic
 */

const fileInput = document.getElementById('fileInput');
const sheetNameInput = document.getElementById('sheetName');
const saveEodBtn = document.getElementById('saveEodBtn');
const resultDiv = document.getElementById('result');
const tableContainer = document.getElementById('tableContainer');

let portfolioData = [];
let lastFetchedSheetName = '';

// Proxy and API configuration
const PROXY_URL = 'https://api.allorigins.win/raw?url=';
const YAHOO_SEARCH_URL = 'https://query2.finance.yahoo.com/v1/finance/search?q=';
const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/';

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
 * Fetch Ticker from ISIN
 */
async function fetchTicker(isin) {
    try {
        const response = await fetch(`${PROXY_URL}${encodeURIComponent(YAHOO_SEARCH_URL + isin)}`);
        if (!response.ok) throw new Error('Search API failed');
        const data = await response.json();
        if (data.quotes && data.quotes.length > 0) {
            return data.quotes[0].symbol;
        }
    } catch (error) {
        console.error(`Error fetching ticker for ${isin}:`, error);
    }
    return null;
}

/**
 * Fetch Current Market Price for a Ticker
 */
async function fetchPrice(ticker) {
    try {
        const response = await fetch(`${PROXY_URL}${encodeURIComponent(`${YAHOO_CHART_URL}${ticker}?interval=1m&range=1d`)}`);
        if (!response.ok) throw new Error('Chart API failed');
        const data = await response.json();
        if (data.chart && data.chart.result && data.chart.result[0]) {
            return data.chart.result[0].meta.regularMarketPrice;
        }
    } catch (error) {
        console.error(`Error fetching price for ${ticker}:`, error);
    }
    return null;
}

/**
 * Update the valuation results
 */
async function updateValuation() {
    if (portfolioData.length === 0) return;

    resultDiv.innerHTML = 'Refreshing prices...';

    let grandTotal = 0;
    const updatedRows = [];

    for (const item of portfolioData) {
        let ticker = item.ticker;
        if (!ticker) {
            ticker = await fetchTicker(item.isin);
            item.ticker = ticker; // Cache it
        }

        let price = null;
        if (ticker) {
            price = await fetchPrice(ticker);
        }

        const rowTotal = price ? item.quantity * price : 0;
        grandTotal += rowTotal;

        updatedRows.push({
            ...item,
            ticker: ticker || 'N/A',
            price: price || 'N/A',
            total: rowTotal
        });
    }

    displayResults(grandTotal, updatedRows);
}

/**
 * Display the results in the UI
 */
function displayResults(grandTotal, rows) {
    const savedEod = JSON.parse(localStorage.getItem('eodValue') || 'null');
    let percentChangeHtml = '';
    let changeClass = '';

    if (savedEod && savedEod.value) {
        const change = ((grandTotal - savedEod.value) / savedEod.value) * 100;
        changeClass = change >= 0 ? 'positive' : 'negative';
        percentChangeHtml = ` (<span class="${changeClass}">${change.toFixed(2)}%</span>)`;
    }

    resultDiv.innerHTML = `${lastFetchedSheetName} - Current Valuation: ₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${percentChangeHtml}`;

    let tableHtml = `
        <table>
            <thead>
                <tr>
                    <th>ISIN</th>
                    <th>Ticker</th>
                    <th>Quantity</th>
                    <th>CMP</th>
                    <th>Row Total</th>
                </tr>
            </thead>
            <tbody>
    `;

    rows.forEach(row => {
        tableHtml += `
            <tr>
                <td>${row.isin}</td>
                <td>${row.ticker}</td>
                <td>${row.quantity}</td>
                <td>${row.price !== 'N/A' ? '₹' + row.price.toLocaleString('en-IN') : 'N/A'}</td>
                <td>${row.total ? '₹' + row.total.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : 'N/A'}</td>
            </tr>
        `;
    });

    tableHtml += '</tbody></table>';
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
