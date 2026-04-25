/**
 * app.js — Mutual Fund Portfolio Intelligence & Monitoring
 */

const searchInput = document.querySelector('.search-input');
const holdingsBody = document.getElementById('holdings-body');
const sectorBody = document.getElementById('sector-body');
const alertsContainer = document.getElementById('alerts-container');
const newsFeed = document.getElementById('news-feed');

// UI Elements for performance
const perf1Y = document.getElementById('perf-1y');
const perf3Y = document.getElementById('perf-3y');
const perf5Y = document.getElementById('perf-5y');
const perfSI = document.getElementById('perf-si');
const fundMetaTitle = document.getElementById('fund-meta-title');

/**
 * Mock Data for demonstration
 */
const mockFunds = {
    'Parag Parikh Flexi Cap': {
        schemeCode: '122639', // Direct Plan
        holdings: [
            { stock: 'HDFC Bank Ltd.', action: 'NEW BUY', weight: '4.20%', change: '+4.20%', type: 'buy' },
            { stock: 'Reliance Industries', action: 'Increased', weight: '8.45%', change: '+0.85%', type: 'inc' },
            { stock: 'Infosys Ltd.', action: 'Decreased', weight: '5.10%', change: '-1.20%', type: 'dec' },
            { stock: 'Alphabet Inc. (Google)', action: 'Maintained', weight: '4.80%', change: '0.00%', type: 'none' },
            { stock: 'ITC Ltd.', action: 'EXITED', weight: '0.00%', change: '-2.45%', type: 'exit' }
        ],
        sectors: [
            { name: 'Financial Services', current: '32.4%', prev: '28.1%', change: '+4.3%', alert: true },
            { name: 'Information Technology', current: '14.2%', prev: '15.8%', change: '-1.6%', alert: false },
            { name: 'Consumer Staples', current: '9.5%', prev: '12.2%', change: '-2.7%', alert: true }
        ],
        alerts: [
            { type: 'manager', title: 'Fund Manager Change', msg: 'Rajeev Thakkar joined as Co-Manager.', meta: '2 days ago' },
            { type: 'allocation', title: 'Asset Allocation Shift', msg: 'Cash levels increased from 4% to 12.5%.', meta: '1 week ago', critical: true }
        ],
        news: [
            { title: 'Why Parag Parikh Flexi Cap is betting on power sector', source: 'Value Research', time: '4h ago' },
            { title: 'PPFAS Mutual Fund declares dividend for Flexi Cap scheme', source: 'MoneyControl', time: '1d ago' }
        ]
    },
    'Quant Small Cap': {
        schemeCode: '120847', // Direct Plan
        holdings: [
            { stock: 'Reliance Power', action: 'NEW BUY', weight: '3.10%', change: '+3.10%', type: 'buy' },
            { stock: 'Adani Enterprises', action: 'EXITED', weight: '0.00%', change: '-4.20%', type: 'exit' },
            { stock: 'Jindal Steel', action: 'Increased', weight: '5.40%', change: '+1.10%', type: 'inc' }
        ],
        sectors: [
            { name: 'Energy', current: '18.4%', prev: '15.2%', change: '+3.2%', alert: true },
            { name: 'Metals', current: '12.2%', prev: '11.5%', change: '+0.7%', alert: false },
            { name: 'Healthcare', current: '8.1%', prev: '9.8%', change: '-1.7%', alert: false }
        ],
        alerts: [
            { type: 'category', title: 'Category Reclassification', msg: 'Potential shift from Small Cap to Mid Cap based on AUM.', meta: 'Upcoming' },
            { type: 'objective', title: 'Objective Change Alert', msg: 'No change detected in investment objective.', meta: 'Verified today' }
        ],
        news: [
            { title: 'Quant Mutual Fund top performers in 2025-26', source: 'Mint', time: '2d ago' },
            { title: 'Small cap funds see record inflows in February', source: 'ET Money', time: '3d ago' }
        ]
    },
    'Mirae Asset Large Cap': {
        schemeCode: '119063',
        holdings: [
            { stock: 'ICICI Bank', action: 'Increased', weight: '9.20%', change: '+0.40%', type: 'inc' },
            { stock: 'TCS', action: 'Decreased', weight: '7.10%', change: '-0.30%', type: 'dec' }
        ],
        sectors: [
            { name: 'Financial Services', current: '35.1%', prev: '34.2%', change: '+0.9%', alert: false },
            { name: 'IT', current: '12.5%', prev: '13.1%', change: '-0.6%', alert: false }
        ],
        alerts: [],
        news: []
    }
};

/**
 * Fetch performance data from MFAPI.in (Public API)
 */
async function updatePerformanceUI(fundName) {
    const fund = mockFunds[fundName];
    if (!fund || !fund.schemeCode) return;

    // Set loading state
    perf1Y.textContent = '...';
    fundMetaTitle.textContent = `Analyzing ${fundName}...`;

    try {
        const response = await fetch(`https://api.mfapi.in/mf/${fund.schemeCode}`);
        const data = await response.json();

        if (data && data.data && data.data.length > 0) {
            const latestNav = parseFloat(data.data[0].nav);

            // Calculate 1 Year Return (approx 250 trading days)
            let return1Y = 'N/A';
            if (data.data.length > 250) {
                const nav1Y = parseFloat(data.data[250].nav);
                const gain = ((latestNav - nav1Y) / nav1Y) * 100;
                return1Y = gain.toFixed(1) + '%';
            }

            perf1Y.textContent = return1Y;
            fundMetaTitle.textContent = data.meta.scheme_name;

            // In a real app, we'd calculate 3Y and 5Y similarly if data is available
            // For now, let's keep them as realistic mocks or N/A
            perf3Y.textContent = '19.4%'; // Mocked CAGR
            perf5Y.textContent = '21.1%'; // Mocked CAGR
            perfSI.textContent = '18.2%'; // Mocked since inception
        }
    } catch (error) {
        console.error('Error fetching MF data:', error);
        perf1Y.textContent = 'Error';
    }
}

/**
 * Render Holdings
 */
function renderHoldings(fundName) {
    const data = mockFunds[fundName] || mockFunds['Parag Parikh Flexi Cap'];
    holdingsBody.innerHTML = '';

    data.holdings.forEach(item => {
        const tr = document.createElement('tr');
        let actionHtml = `<span>${item.action}</span>`;
        if (item.type === 'buy') actionHtml = `<span class="badge badge-buy">NEW BUY</span>`;
        if (item.type === 'exit') actionHtml = `<span class="badge badge-exit">EXITED</span>`;

        const changeClass = item.type === 'dec' || item.type === 'exit' ? 'badge-dec' : 'badge-inc';

        tr.innerHTML = `
            <td>${item.stock}</td>
            <td>${actionHtml}</td>
            <td>${item.weight}</td>
            <td class="${changeClass}">${item.change}</td>
        `;
        holdingsBody.appendChild(tr);
    });
}

/**
 * Render Sectors
 */
function renderSectors(fundName) {
    const data = mockFunds[fundName] || mockFunds['Parag Parikh Flexi Cap'];
    sectorBody.innerHTML = '';

    if (!data.sectors) return;

    data.sectors.forEach(sector => {
        const tr = document.createElement('tr');
        const changeClass = sector.change.startsWith('+') ? 'badge-inc' : 'badge-dec';
        const alertHtml = sector.alert ? ' 🚨' : '';
        const weightStyle = sector.alert ? 'style="font-weight:700;"' : '';

        tr.innerHTML = `
            <td>${sector.name}</td>
            <td>${sector.current}</td>
            <td>${sector.prev}</td>
            <td class="${changeClass}" ${weightStyle}>${sector.change}${alertHtml}</td>
        `;
        sectorBody.appendChild(tr);
    });
}

/**
 * Render Alerts
 */
function renderAlerts(fundName) {
    const data = mockFunds[fundName] || mockFunds['Parag Parikh Flexi Cap'];
    alertsContainer.innerHTML = '';

    if (!data.alerts || data.alerts.length === 0) {
        alertsContainer.innerHTML = '<div style="text-align:center; padding:20px; color:rgba(255,255,255,0.3); font-size:0.85rem;">No active alerts for this fund.</div>';
        return;
    }

    data.alerts.forEach(alert => {
        const div = document.createElement('div');
        div.className = 'alert-item';
        if (alert.critical) {
            div.style.borderColor = 'rgba(248,113,113,0.3)';
            div.style.background = 'rgba(248,113,113,0.05)';
        }

        let icon = 'ph-bell';
        if (alert.type === 'manager') icon = 'ph-user-circle-plus';
        if (alert.type === 'allocation') icon = 'ph-warning-circle';
        if (alert.type === 'category') icon = 'ph-tag';
        if (alert.type === 'objective') icon = 'ph-target';

        div.innerHTML = `
            <i class="ph ${icon} alert-icon" ${alert.critical ? 'style="color:#F87171;"' : ''}></i>
            <div class="alert-content">
                <div style="font-size:0.85rem; font-weight:600;">${alert.title}</div>
                <div style="font-size:0.8rem; color:rgba(255,255,255,0.7); margin-top:2px;">${alert.msg}</div>
                <div class="alert-meta">${alert.meta} • ${fundName}</div>
            </div>
        `;
        alertsContainer.appendChild(div);
    });
}

/**
 * Render News
 */
function renderNews(fundName) {
    const data = mockFunds[fundName] || mockFunds['Parag Parikh Flexi Cap'];
    newsFeed.innerHTML = '';

    if (!data.news || data.news.length === 0) {
        newsFeed.innerHTML = '<div style="text-align:center; padding:20px; color:rgba(255,255,255,0.3); font-size:0.85rem;">No recent news found.</div>';
        return;
    }

    data.news.forEach(item => {
        const div = document.createElement('div');
        div.className = 'news-item';
        div.innerHTML = `
            <a href="#" class="news-title">${item.title}</a>
            <div class="news-source">
                <i class="ph ph-globe"></i> ${item.source} • ${item.time}
            </div>
        `;
        newsFeed.appendChild(div);
    });
}

/**
 * Initialize
 */
function init() {
    const defaultFund = 'Parag Parikh Flexi Cap';
    renderHoldings(defaultFund);
    renderSectors(defaultFund);
    renderAlerts(defaultFund);
    renderNews(defaultFund);
    updatePerformanceUI(defaultFund);

    // Add event listeners to "Watchlist" pills
    document.querySelectorAll('.watchlist-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const fundName = pill.textContent;

            // Update UI styles for pills
            document.querySelectorAll('.watchlist-pill').forEach(p => {
                p.style.background = 'rgba(255,255,255,0.1)';
                p.style.color = '#fff';
                p.style.border = '1px solid rgba(255,255,255,0.2)';
            });
            pill.style.background = '#D4AF37';
            pill.style.color = '#0D1B4B';
            pill.style.border = 'none';

            renderHoldings(fundName);
            renderSectors(fundName);
            renderAlerts(fundName);
            renderNews(fundName);
            updatePerformanceUI(fundName);
        });
    });

    // Search Handler (Mock)
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value;
            alert(`Searching intelligence data for: ${query}\n(In a production app, this would query the backend/API for factsheet comparison data)`);
        }
    });
}

document.addEventListener('DOMContentLoaded', init);
