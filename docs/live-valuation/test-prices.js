/**
 * test-prices.js — Stress Test for FMP API with NSE ISINs
 */

const apiKeyInput = document.getElementById('apiKey');
const startBtn = document.getElementById('startBtn');
const statusDiv = document.getElementById('status');
const progressBar = document.getElementById('progressBar');
const summaryDiv = document.getElementById('summary');
const resultsTableContainer = document.getElementById('resultsTableContainer');

const NSE_CSV_URL = 'https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv';
const PROXY_URL = 'https://api.allorigins.win/raw?url=';
const FMP_PROFILE_URL = 'https://financialmodelingprep.com/stable/profile?symbol=';

let testResults = [];
let successCount = 0;
let errorCount = 0;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchNSEData() {
    statusDiv.innerText = 'Fetching EQUITY_L.csv from NSE...';
    try {
        const response = await fetch(`${PROXY_URL}${encodeURIComponent(NSE_CSV_URL)}`);
        if (!response.ok) throw new Error('Failed to fetch NSE CSV');
        const text = await response.text();
        return parseCSV(text);
    } catch (error) {
        statusDiv.innerHTML = `<span class="status-error">Error fetching NSE data: ${error.message}</span>`;
        throw error;
    }
}

function parseCSV(text) {
    const lines = text.split('\n');
    const results = [];
    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',');
        if (cols.length > 6) {
            results.push({
                symbol: cols[0].trim(),
                isin: cols[6].trim()
            });
        }
    }
    return results;
}

async function fetchPrice(symbol, apiKey) {
    const ticker = `${symbol}.NS`;
    try {
        const response = await fetch(`${PROXY_URL}${encodeURIComponent(`${FMP_PROFILE_URL}${ticker}&apikey=${apiKey}`)}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data && data.length > 0 && data[0].price !== undefined) {
            return { price: data[0].price, status: 'Success' };
        }
        return { price: null, status: 'Not Found' };
    } catch (error) {
        return { price: null, status: 'Error', error: error.message };
    }
}

async function startTesting() {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        alert('Please enter an FMP API Key');
        return;
    }

    startBtn.disabled = true;
    testResults = [];
    successCount = 0;
    errorCount = 0;
    summaryDiv.innerHTML = '';
    resultsTableContainer.innerHTML = '';

    try {
        const stocks = await fetchNSEData();
        const total = stocks.length;
        statusDiv.innerText = `Starting test for ${total} stocks...`;

        // Create table shell
        resultsTableContainer.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Symbol</th>
                        <th>ISIN</th>
                        <th>Price</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody id="resultsBody"></tbody>
            </table>
        `;
        const resultsBody = document.getElementById('resultsBody');

        for (let i = 0; i < total; i++) {
            const stock = stocks[i];

            // Wait to avoid aggressive rate limiting
            await delay(200);

            const result = await fetchPrice(stock.symbol, apiKey);

            if (result.status === 'Success') {
                successCount++;
            } else {
                errorCount++;
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${stock.symbol}</td>
                <td>${stock.isin}</td>
                <td>${result.price !== null ? '₹' + result.price : 'N/A'}</td>
                <td class="status-${result.status.toLowerCase()}">${result.status}${result.error ? ': ' + result.error : ''}</td>
            `;
            // Append at the top so user sees latest
            resultsBody.prepend(row);

            // Update Progress
            const progress = ((i + 1) / total) * 100;
            progressBar.style.width = `${progress}%`;
            statusDiv.innerText = `Testing: ${i + 1} / ${total} stocks...`;

            updateSummary(i + 1, total);
        }

        statusDiv.innerText = 'Testing Complete.';
        startBtn.disabled = false;

    } catch (error) {
        console.error(error);
        startBtn.disabled = false;
    }
}

function updateSummary(current, total) {
    const successRate = ((successCount / current) * 100).toFixed(2);
    summaryDiv.innerHTML = `
        <div style="margin-top: 10px; font-weight: bold;">
            Success: ${successCount} | Fail/Not Found: ${errorCount} | Total: ${current} / ${total}<br>
            Success Rate: ${successRate}%
        </div>
    `;
}

startBtn.addEventListener('click', startTesting);
