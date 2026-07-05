/**
 * scanner.js — Visiting Card AI Scanner (Anthropic Claude Vision Edition)
 */

// --- Constants & Definitions ---
const FIELD_DEFS = [
    { key:"company_name",        label:"Company",         icon:"🏢" },
    { key:"designation",         label:"Designation",     icon:"💼" },
    { key:"email",               label:"Email",           icon:"📧" },
    { key:"website",             label:"Website",         icon:"🌐" },
    { key:"address",             label:"Address",         icon:"📍" },
    { key:"company_address",     label:"Company Address", icon:"🏠" },
    { key:"office_timings",      label:"Office Timings",  icon:"🕐" },
    { key:"registration_number", label:"Reg. Number",     icon:"#️⃣" },
    { key:"additional_info",     label:"Additional Info", icon:"📝" },
];

const PROMPT = `You are an expert business card reader. Extract ALL visible information and return ONLY valid JSON, no markdown, no extra text.

PERSONS: A card may list multiple people. Pair each name with their phone exactly as shown on the card.
Phone numbers: extract digits only. "Mo." / "M." / "Ph." / "F." = phone prefix.

Return ONLY this JSON:
{
  "persons": [{ "name": "Full Name", "phone": "digits only", "designation": "role or N/A" }],
  "email": "email or N/A",
  "address": "address or N/A",
  "company_name": "company name or N/A",
  "company_address": "company address or N/A",
  "website": "URL or N/A",
  "business_category": "inferred business type",
  "office_timings": "timings or N/A",
  "registration_number": "any reg/license/membership number or N/A",
  "social_media": {"facebook":"N/A","instagram":"N/A","twitter":"N/A","linkedin":"N/A","whatsapp":"N/A","youtube":"N/A","other":"N/A"},
  "languages_detected": ["English"],
  "additional_info": "services offered, certifications, degrees, taglines or N/A"
}
Rules:
- persons[] must always have at least one entry
- Extract EXACT social media handles including @ symbol
- Return ONLY valid JSON, nothing else`;

const MERGE_PROMPT = `You are an expert at merging business card data. You have been given JSON extracted from the FRONT and BACK of the same business card. Merge them into a single complete record.

Rules:
- Combine persons[] from both sides (deduplicate by name)
- Prefer non-N/A values over N/A values
- Merge additional_info from both sides
- Merge social_media from both sides
- Keep the most complete address/email/website
- Return ONLY valid JSON in this exact format, no markdown:

{
  "persons": [{ "name": "Full Name", "phone": "digits only", "designation": "role or N/A" }],
  "email": "email or N/A",
  "address": "address or N/A",
  "company_name": "company name or N/A",
  "company_address": "company address or N/A",
  "website": "URL or N/A",
  "business_category": "inferred business type",
  "office_timings": "timings or N/A",
  "registration_number": "any reg/license/membership number or N/A",
  "social_media": {"facebook":"N/A","instagram":"N/A","twitter":"N/A","linkedin":"N/A","whatsapp":"N/A","youtube":"N/A","other":"N/A"},
  "languages_detected": ["English"],
  "additional_info": "combined services, certifications, degrees, taglines or N/A"
}`;

// --- State Variables ---
let currentTab = 'upload';
let scanMode = 'normal';
let selectedImages = []; // Array of { file, preview, id }
let pairs = [];
let scannedCards = JSON.parse(localStorage.getItem('scannedCards') || '[]');
window.scannedCards = scannedCards; // Expose for testing/debugging
let isProcessing = false;
let cancelProcessing = false;
let previewIdx = null;

// --- Helper Utilities ---
const safe = (v) => (v && typeof v === "string" ? v : "");
const notNA = (v) => safe(v) !== "" && v !== "N/A";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const getApiKey = () => localStorage.getItem('anthropic_api_key') || '';
const setApiKey = (key) => localStorage.setItem('anthropic_api_key', key);

// --- DOM References ---
const el = {
    apiKey: document.getElementById('api-key'),
    btnSaveKey: document.getElementById('btn-save-key'),
    fileInput: document.getElementById('file-input'),
    dropZone: document.getElementById('drop-zone'),
    previewGrid: document.getElementById('preview-grid'),
    selectionPreview: document.getElementById('selection-preview'),
    selectionCount: document.getElementById('selection-count'),
    btnClearSelection: document.getElementById('btn-clear-selection'),
    actionSection: document.getElementById('action-section'),
    btnProcessAll: document.getElementById('btn-process-all'),
    processingSection: document.getElementById('processing-section'),
    processingStatus: document.getElementById('processing-status'),
    processingCount: document.getElementById('processing-count'),
    processingBar: document.getElementById('processing-progress-bar'),
    btnCancel: document.getElementById('btn-cancel'),
    logSection: document.getElementById('log-section'),
    logItems: document.getElementById('log-items'),
    logStats: document.getElementById('log-stats'),
    btnViewCards: document.getElementById('btn-view-cards'),
    cardsList: document.getElementById('cards-list'),
    cardsContainer: document.getElementById('cards-container'),
    emptyState: document.getElementById('empty-state'),
    cardsCountBadge: document.getElementById('cards-count-badge'),
    statTotal: document.getElementById('stat-total'),
    statEmail: document.getElementById('stat-email'),
    statSocial: document.getElementById('stat-social'),
    statReg: document.getElementById('stat-reg'),
    btnExportCsv: document.getElementById('btn-export-csv'),
    previewModal: document.getElementById('preview-modal'),
    shareAttachment: document.getElementById('share-attachment'),
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    el.apiKey.value = getApiKey();
    // Use window.scannedCards to allow external modification before first render
    if (window.scannedCards && window.scannedCards.length > 0) {
        scannedCards = window.scannedCards;
    }
    updateCardsGallery();

    // API Key Save
    el.btnSaveKey.addEventListener('click', () => {
        localStorage.setItem('anthropic_api_key', el.apiKey.value);
        alert('API Key saved!');
    });

    // File Upload Handlers
    el.dropZone.addEventListener('click', () => {
        if (!isProcessing) el.fileInput.click();
    });

    el.fileInput.addEventListener('change', handleFiles);

    el.btnClearSelection.addEventListener('click', () => {
        selectedImages = [];
        pairs = [];
        renderSelectionPreview();
    });

    el.btnProcessAll.addEventListener('click', processAll);
    el.btnCancel.addEventListener('click', () => { cancelProcessing = true; });
    el.btnViewCards.addEventListener('click', () => { switchTab('cards'); });
    el.btnExportCsv.addEventListener('click', exportCSV);

    // Modal
    document.getElementById('modal-close').addEventListener('click', closePreview);
    document.getElementById('modal-prev').addEventListener('click', () => navPreview(-1));
    document.getElementById('modal-next').addEventListener('click', () => navPreview(1));
    el.previewModal.addEventListener('click', (e) => { if(e.target === el.previewModal) closePreview(); });
});

// --- Tab & Mode Switching ---
window.switchTab = (tab) => {
    currentTab = tab;
    if (tab === 'cards') updateCardsGallery();
    document.getElementById('tab-upload').classList.toggle('active', tab === 'upload');
    document.getElementById('tab-cards').classList.toggle('active', tab === 'cards');
    document.getElementById('content-upload').style.display = tab === 'upload' ? 'block' : 'none';
    document.getElementById('content-cards').style.display = tab === 'cards' ? 'block' : 'none';
    if (tab === 'cards') updateCardsGallery();
};

window.setMode = (mode) => {
    scanMode = mode;
    document.getElementById('mode-normal').classList.toggle('active', mode === 'normal');
    document.getElementById('mode-frontback').classList.toggle('active', mode === 'frontback');
    document.getElementById('frontback-hint').style.display = mode === 'frontback' ? 'block' : 'none';
    selectedImages = [];
    pairs = [];
    renderSelectionPreview();
};

// --- Selection Handlers ---
async function handleFiles(e) {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith("image/"));
    if (!files.length) return;

    const newImgs = await Promise.all(files.map(f => new Promise(res => {
        const r = new FileReader();
        r.onload = ev => res({ file:f, preview:ev.target.result, id:`${Date.now()}${Math.random()}` });
        r.readAsDataURL(f);
    })));

    selectedImages = [...selectedImages, ...newImgs];

    if (scanMode === "frontback") {
        pairs = [];
        for (let i = 0; i < selectedImages.length; i += 2) {
            pairs.push({ front: selectedImages[i], back: selectedImages[i+1] || null });
        }
    }

    renderSelectionPreview();
}

function renderSelectionPreview() {
    el.previewGrid.innerHTML = '';

    if (selectedImages.length === 0) {
        el.selectionPreview.style.display = 'none';
        el.actionSection.style.display = 'none';
        return;
    }

    el.selectionPreview.style.display = 'block';
    el.actionSection.style.display = isProcessing ? 'none' : 'block';
    el.selectionCount.innerText = `${selectedImages.length} image${selectedImages.length>1?'s':''} selected`;

    if (scanMode === 'normal') {
        selectedImages.forEach(img => {
            const div = document.createElement('div');
            div.className = 'col';
            div.innerHTML = `
                <div class="position-relative">
                    <img src="${img.preview}" class="img-thumbnail w-100" style="height:70px; object-fit:cover;">
                    <button onclick="removeImage('${img.id}')" class="btn btn-danger btn-sm position-absolute top-0 end-0 py-0 px-1" style="font-size:10px">✕</button>
                </div>
            `;
            el.previewGrid.appendChild(div);
        });
    } else {
        // Pairs view
        el.previewGrid.className = 'd-flex flex-column gap-2';
        pairs.forEach((pair, i) => {
            const div = document.createElement('div');
            div.className = 'card bg-light p-2 border-0 small';
            div.innerHTML = `
                <div class="d-flex align-items-center gap-2">
                    <div class="flex-grow-1 text-center">
                        <img src="${pair.front.preview}" class="img-thumbnail" style="height:50px; width:100%; object-fit:cover;">
                        <div class="text-truncate" style="max-width:80px">${pair.front.file.name}</div>
                    </div>
                    <div class="text-muted">🔄</div>
                    <div class="flex-grow-1 text-center">
                        ${pair.back ? `
                            <img src="${pair.back.preview}" class="img-thumbnail" style="height:50px; width:100%; object-fit:cover;">
                            <div class="text-truncate" style="max-width:80px">${pair.back.file.name}</div>
                        ` : '<div class="bg-secondary opacity-25 rounded" style="height:50px">No back</div>'}
                    </div>
                </div>
            `;
            el.previewGrid.appendChild(div);
        });
    }
}

window.removeImage = (id) => {
    selectedImages = selectedImages.filter(img => img.id !== id);
    if (scanMode === 'frontback') {
        pairs = [];
        for (let i = 0; i < selectedImages.length; i += 2) {
            pairs.push({ front: selectedImages[i], back: selectedImages[i+1] || null });
        }
    }
    renderSelectionPreview();
};

// --- AI Extraction Logic ---
async function callAPI(content, retries = 3) {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");

    const targetUrl = "https://api.anthropic.com/v1/messages";
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const resp = await fetch(proxyUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01"
                },
                body: JSON.stringify({
                    model: "claude-3-5-sonnet-20241022", // Using latest stable
                    max_tokens: 1500,
                    messages: [{ role: "user", content }]
                })
            });

            if (resp.status === 429 || resp.status === 529) {
                if (attempt < retries) { await sleep(attempt * 8000); continue; }
                throw new Error("Rate limited");
            }
            if (!resp.ok) {
                const ed = await resp.json().catch(() => ({}));
                throw new Error(ed?.error?.message || `HTTP ${resp.status}`);
            }

            const data = await resp.json();
            const raw = safe(data?.content?.[0]?.text).trim()
                .replace(/```json\n?/gi,"").replace(/```\n?/g,"").trim();
            const m = raw.match(/\{[\s\S]*\}/);
            if (!m) throw new Error("No JSON in response");
            return { ok: true, data: JSON.parse(m[0]) };

        } catch (err) {
            if (attempt < retries) { await sleep(attempt * 3000); continue; }
            return { ok: false, error: err?.message || String(err) || "Unknown error" };
        }
    }
    return { ok: false, error: "Max retries exceeded" };
}

const toB64 = (imgObj) => imgObj.preview.split(",")[1];

async function extractOne(imgObj) {
    return callAPI([
        { type:"image", source:{ type:"base64", media_type:imgObj.file.type, data:toB64(imgObj) } },
        { type:"text",  text: PROMPT }
    ]);
}

async function mergeTwo(front, back) {
    const rf = await extractOne(front);
    if (!rf.ok) return rf;

    const rb = await extractOne(back);
    if (!rb.ok) return rb;

    const mergeContent = [
        { type:"text", text:`${MERGE_PROMPT}\n\nFRONT side data:\n${JSON.stringify(rf.data)}\n\nBACK side data:\n${JSON.stringify(rb.data)}` }
    ];
    return callAPI(mergeContent);
}

async function processAll() {
    if (!selectedImages.length) return;
    if (!getApiKey()) { alert("Please enter and save your Anthropic API Key first."); return; }

    cancelProcessing = false;
    isProcessing = true;
    el.actionSection.style.display = 'none';
    el.processingSection.style.display = 'block';
    el.logSection.style.display = 'block';
    el.logItems.innerHTML = '';
    el.btnViewCards.style.display = 'none';

    const jobs = scanMode === "frontback" ? pairs : selectedImages.map(img => ({ front:img, back:null }));
    el.processingCount.innerText = `0/${jobs.length}`;

    let log = { ok: 0, warn: 0, fail: 0 };

    for (let i = 0; i < jobs.length; i++) {
        if (cancelProcessing) break;

        const job = jobs[i];
        const label = job.back ? `${job.front.file.name} + ${job.back.file.name}` : job.front.file.name;

        el.processingStatus.innerText = `Processing: ${label}`;
        el.processingCount.innerText = `${i+1}/${jobs.length}`;
        el.processingBar.style.width = `${((i+1)/jobs.length)*100}%`;

        let result;
        try {
            result = job.back ? await mergeTwo(job.front, job.back) : await extractOne(job.front);
        } catch (err) {
            addLogItem(label, "❌", err.message || "Failed");
            log.fail++;
            updateLogStats(log);
            continue;
        }

        if (!result.ok) {
            addLogItem(label, "❌", result.error);
            log.fail++;
            updateLogStats(log);
            await sleep(1000); continue;
        }

        const parsed = result.data;
        const dup = scannedCards.some(c => isDup(c, parsed));

        if (dup) {
            addLogItem(label, "⚠️", "Duplicate — skipped");
            log.warn++;
        } else {
            const card = sanitiseCard(parsed, job.front.preview, job.back?.preview || null, job.front.file.name, job.back?.file.name || null);
            scannedCards.push(card);
            localStorage.setItem('scannedCards', JSON.stringify(scannedCards));
            addLogItem(label, "✅", safe(parsed.persons?.[0]?.name) || parsed.company_name || "Extracted");
            log.ok++;
        }
        updateLogStats(log);
        if (i < jobs.length - 1) await sleep(1500);
    }

    isProcessing = false;
    el.processingSection.style.display = 'none';
    if (log.ok > 0) el.btnViewCards.style.display = 'block';
    updateCardsGallery();
}

function addLogItem(name, status, msg) {
    const div = document.createElement('div');
    div.className = `log-item ${status === '✅' ? 'success' : status === '⚠️' ? 'warning' : 'error'}`;
    div.innerHTML = `
        <span class="fs-5">${status}</span>
        <div class="text-truncate">
            <div class="fw-bold text-truncate" style="max-width:200px">${name}</div>
            <div class="small opacity-75">${msg}</div>
        </div>
    `;
    el.logItems.prepend(div);
}

function updateLogStats(l) {
    el.logStats.innerText = `✅${l.ok} · ⚠️${l.warn} · ❌${l.fail}`;
}

// --- Sanitization & Duplicate Detection ---
function sanitiseCard(parsed, preview1, preview2, name1, name2) {
    if (!Array.isArray(parsed.persons) || !parsed.persons.length)
        parsed.persons = [{ name:"N/A", phone:"N/A", designation:"N/A" }];

    parsed.persons = parsed.persons.map(p => ({
        name:        safe(p?.name)        || "N/A",
        phone:       safe(p?.phone)       || "N/A",
        designation: safe(p?.designation) || "N/A",
    }));

    return {
        ...parsed,
        id: `${Date.now()}${Math.random()}`,
        timestamp: new Date().toLocaleString(),
        imageName: name2 ? `${name1} + ${name2}` : name1,
        imagePreview:  preview1,
        imagePreview2: preview2 || null,
    };
}

function isDup(existing, parsed) {
    const pe = Array.isArray(existing.persons) ? existing.persons : [];
    const pp = Array.isArray(parsed.persons)   ? parsed.persons   : [];

    if (notNA(existing.email) && notNA(parsed.email) &&
        safe(existing.email).toLowerCase() === safe(parsed.email).toLowerCase()) return true;

    if (notNA(existing.registration_number) && notNA(parsed.registration_number) &&
        existing.registration_number.trim() === parsed.registration_number.trim()) return true;

    for (const ep of pe) {
        for (const np of pp) {
            const nm = notNA(ep.name) && notNA(np.name) && ep.name.toLowerCase().trim() === np.name.toLowerCase().trim();
            const ph = notNA(ep.phone) && notNA(np.phone) && ep.phone.replace(/\D/g,"") === np.phone.replace(/\D/g,"");
            if (nm && ph) return true;
            if (nm && !notNA(ep.phone) && !notNA(np.phone)) return true;
        }
    }
    return false;
}

// --- Gallery Logic ---
function updateCardsGallery() {
    if (!scannedCards.length) {
        el.emptyState.style.display = 'block';
        el.cardsContainer.style.display = 'none';
        el.cardsCountBadge.style.display = 'none';
        return;
    }

    el.emptyState.style.display = 'none';
    el.cardsContainer.style.display = 'block';
    el.cardsCountBadge.style.display = 'inline-block';
    el.cardsCountBadge.innerText = scannedCards.length;

    // Stats
    el.statTotal.innerText = scannedCards.length;
    el.statEmail.innerText = scannedCards.filter(c => notNA(c.email)).length;
    el.statSocial.innerText = scannedCards.filter(c => c.social_media && Object.values(c.social_media).some(v => notNA(v))).length;
    el.statReg.innerText = scannedCards.filter(c => notNA(c.registration_number)).length;

    // List
    el.cardsList.innerHTML = '';
    scannedCards.forEach((card, idx) => {
        const div = document.createElement('div');
        div.className = 'card-item';

        const persons = card.persons || [];
        const sc = card.social_media ? Object.values(card.social_media).filter(v => notNA(v)).length : 0;

        div.innerHTML = `
            <div class="d-flex gap-3">
                <div class="flex-shrink-0 d-flex flex-column gap-1">
                    <img src="${card.imagePreview}" class="card-item-img">
                    ${card.imagePreview2 ? `<img src="${card.imagePreview2}" class="card-item-img opacity-75">` : ''}
                </div>
                <div class="flex-grow-1 min-width-0">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="min-width-0 pe-2">
                            ${persons.map((p, i) => `
                                <div class="mb-1">
                                    <div class="fw-bold small text-dark text-truncate">👤 ${p.name}</div>
                                    ${notNA(p.phone) ? `<div class="small text-primary">📞 ${p.phone}</div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                        <div class="d-flex gap-1 flex-shrink-0">
                            <button onclick="openPreview(${idx})" class="btn btn-sm btn-light text-primary py-0 px-2">👁️</button>
                            <button onclick="sendWhatsAppByIdx(${idx})" class="btn btn-sm btn-light text-success py-0 px-2">💬</button>
                            <button onclick="deleteCard(${idx})" class="btn btn-sm btn-light text-danger py-0 px-2">🗑️</button>
                        </div>
                    </div>
                    ${notNA(card.company_name) ? `<div class="small text-muted text-truncate mt-1">🏢 ${card.company_name}</div>` : ''}
                    <div class="d-flex gap-1 mt-2 flex-wrap">
                        ${card.imagePreview2 ? `<span class="badge bg-success-subtle text-success border border-success-subtle" style="font-size:9px">MERGED</span>` : ''}
                        ${sc > 0 ? `<span class="badge bg-purple-subtle text-purple border border-purple-subtle" style="font-size:9px">🔗 ${sc} social</span>` : ''}
                        ${notNA(card.registration_number) ? `<span class="badge bg-light text-dark border" style="font-size:9px"># ${card.registration_number}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
        el.cardsList.appendChild(div);
    });
}

window.deleteCard = (idx) => {
    if (confirm('Delete this card?')) {
        scannedCards.splice(idx, 1);
        localStorage.setItem('scannedCards', JSON.stringify(scannedCards));
        updateCardsGallery();
    }
};

// --- Modal & Detail Logic ---
window.openPreview = (idx) => {
    previewIdx = idx;
    const card = scannedCards[idx];
    if (!card) return;

    el.previewModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const persons = card.persons || [];
    const first = persons[0] || {};

    document.getElementById('modal-avatar').innerText = (safe(first.name) || "?")[0].toUpperCase();
    document.getElementById('modal-title').innerText = safe(first.name) || "Unknown";
    document.getElementById('modal-subtitle').innerText = notNA(first.designation) ? first.designation : (notNA(card.company_name) ? card.company_name : "Extracted Detail");
    document.getElementById('modal-pagination').innerText = `${idx + 1}/${scannedCards.length}`;

    document.getElementById('modal-prev').disabled = idx === 0;
    document.getElementById('modal-next').disabled = idx === scannedCards.length - 1;

    // Images
    const imgDiv = document.getElementById('modal-images');
    imgDiv.className = 'd-flex gap-2';
    imgDiv.innerHTML = `
        <div class="flex-grow-1 text-center">
            ${card.imagePreview2 ? '<div class="small fw-bold text-muted mb-1">FRONT</div>' : ''}
            <img src="${card.imagePreview}" class="img-fluid rounded border shadow-sm" style="max-height:150px">
        </div>
        ${card.imagePreview2 ? `
            <div class="flex-grow-1 text-center">
                <div class="small fw-bold text-muted mb-1">BACK</div>
                <img src="${card.imagePreview2}" class="img-fluid rounded border shadow-sm" style="max-height:150px">
            </div>
        ` : ''}
    `;

    // Badges
    const badgeDiv = document.getElementById('modal-badges');
    badgeDiv.innerHTML = `
        ${card.imagePreview2 ? '<span class="badge bg-success-subtle text-success border border-success-subtle">🔄 Front+Back merged</span>' : ''}
        ${notNA(card.business_category) ? `<span class="badge bg-purple-subtle text-purple border border-purple-subtle">🏷️ ${card.business_category}</span>` : ''}
        ${(card.languages_detected || []).map(l => `<span class="badge bg-light text-dark border">🌍 ${l}</span>`).join('')}
    `;

    // Persons Table
    const persDiv = document.getElementById('modal-persons');
    persDiv.innerHTML = `
        <div class="small fw-bold text-muted text-uppercase mb-2">👤 Person(s) & Contact</div>
        <div class="persons-table">
            <div class="persons-header">
                <span>Name</span><span>Phone</span><span>Role</span>
            </div>
            ${persons.map(p => `
                <div class="person-row">
                    <div class="fw-bold text-dark">${safe(p.name) || '—'}</div>
                    <div class="text-primary">${notNA(p.phone) ? p.phone : '—'}</div>
                    <div class="text-muted">${notNA(p.designation) ? p.designation : '—'}</div>
                </div>
            `).join('')}
        </div>
    `;

    // Fields
    const fieldsDiv = document.getElementById('modal-fields');
    fieldsDiv.innerHTML = '';
    FIELD_DEFS.forEach(f => {
        const val = card[f.key];
        if (notNA(val)) {
            const row = document.createElement('div');
            row.className = 'd-flex align-items-start gap-3 py-2 border-bottom';
            row.innerHTML = `
                <div class="field-icon">${f.icon}</div>
                <div>
                    <div class="small fw-bold text-muted text-uppercase" style="font-size:10px">${f.label}</div>
                    <div class="text-dark small">${val}</div>
                </div>
            `;
            fieldsDiv.appendChild(row);
        }
    });

    // Social Media
    if (card.social_media && Object.entries(card.social_media).some(([,v]) => notNA(v))) {
        const socialRow = document.createElement('div');
        socialRow.className = 'd-flex align-items-start gap-3 py-2';
        socialRow.innerHTML = `
            <div class="field-icon">🔗</div>
            <div class="flex-grow-1">
                <div class="small fw-bold text-muted text-uppercase mb-2" style="font-size:10px">Social Media</div>
                ${Object.entries(card.social_media).filter(([,v]) => notNA(v)).map(([pl, h]) => `
                    <div class="d-flex justify-content-between small mb-1">
                        <span class="text-muted text-capitalize">${pl}</span>
                        <span class="text-primary fw-bold">${h}</span>
                    </div>
                `).join('')}
            </div>
        `;
        fieldsDiv.appendChild(socialRow);
    }

    // Actions
    document.getElementById('btn-modal-contacts').onclick = () => saveToContacts(card);
    document.getElementById('btn-modal-whatsapp').onclick = () => toggleWhatsAppList(card);
}

function toggleWhatsAppList(card) {
    const container = document.getElementById('whatsapp-sharing-list');
    const linksDiv = document.getElementById('wa-links-container');
    const notice = document.getElementById('wa-attachment-notice');
    const attachName = document.getElementById('wa-attachment-name');

    if (container.style.display === 'block') {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    linksDiv.innerHTML = '';

    // Collect all phone numbers
    const phones = new Set();
    (card.persons || []).forEach(p => {
        if (notNA(p.phone)) {
            p.phone.split(/[,\/|]/).forEach(num => {
                const clean = num.replace(/\D/g, "");
                if (clean.length >= 10) phones.add(clean);
            });
        }
    });
    if (card.social_media && notNA(card.social_media.whatsapp)) {
        phones.add(card.social_media.whatsapp.replace(/\D/g, ""));
    }

    if (phones.size === 0) {
        linksDiv.innerHTML = '<div class="small text-danger">No valid phone numbers found.</div>';
    } else {
        phones.forEach(num => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-sm btn-outline-success d-flex justify-content-between align-items-center w-100';
            btn.innerHTML = `<span>Share to <strong>${num}</strong></span> <i class="ph ph-whatsapp-logo"></i>`;
            btn.onclick = () => sendWhatsApp(card, num);
            linksDiv.appendChild(btn);
        });
    }

    const file = el.shareAttachment.files[0];
    if (file) {
        notice.style.display = 'block';
        attachName.innerText = file.name;
    } else {
        notice.style.display = 'none';
    }
}

function closePreview() {
    el.previewModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function navPreview(dir) {
    const nextIdx = previewIdx + dir;
    if (nextIdx >= 0 && nextIdx < scannedCards.length) {
        openPreview(nextIdx);
    }
}

// --- Contact & Export Logic ---
function saveToContacts(card) {
    const persons = card.persons || [];
    const vcfBlocks = persons.map(p => {
        const lines = ["BEGIN:VCARD", "VERSION:3.0"];
        if (notNA(p.name)) {
            const parts = p.name.trim().split(" ");
            const lastName = parts.length > 1 ? parts[parts.length - 1] : "";
            const firstName = parts.slice(0, parts.length > 1 ? parts.length - 1 : 1).join(" ");
            lines.push(`N:${lastName};${firstName};;;`);
            lines.push(`FN:${p.name.trim()}`);
        } else {
            lines.push(`FN:${safe(card.company_name) || "Contact"}`);
        }
        if (notNA(p.designation)) lines.push(`TITLE:${p.designation}`);
        if (notNA(card.company_name)) lines.push(`ORG:${card.company_name}`);
        if (notNA(p.phone)) {
            p.phone.split(",").forEach((ph, i) => lines.push(`TEL;TYPE=${i === 0 ? "CELL" : "WORK"}:${ph.trim()}`));
        }
        if (notNA(card.email)) {
            card.email.split(",").forEach(em => lines.push(`EMAIL:${em.trim()}`));
        }
        if (notNA(card.website)) lines.push(`URL:${card.website}`);
        const addr = notNA(card.address) ? card.address : (notNA(card.company_address) ? card.company_address : null);
        if (addr) lines.push(`ADR;TYPE=WORK:;;${addr.replace(/,/g, '\\;')};;;;`);

        const note = [];
        if (notNA(card.business_category)) note.push(`Category: ${card.business_category}`);
        if (notNA(card.registration_number)) note.push(`Reg No: ${card.registration_number}`);
        if (notNA(card.additional_info)) note.push(`Info: ${card.additional_info}`);
        if (note.length) lines.push(`NOTE:${note.join('\\n')}`);

        lines.push("END:VCARD");
        return lines.join("\r\n");
    });

    const blob = new Blob([vcfBlocks.join("\r\n\r\n")], { type: "text/vcard;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(card.company_name || 'Contact').replace(/\s+/g, '_')}.vcf`;
    link.click();
}

function sendWhatsApp(card, specificNum = null) {
    const lines = ["👋 *Business Card Details*", "━━━━━━━━━━━━━━━━━━━━"];
    (card.persons || []).forEach(p => {
        if (notNA(p.name)) lines.push(`👤 *Name:* ${p.name}`);
        if (notNA(p.phone)) lines.push(`📞 *Phone:* ${p.phone}`);
    });
    if (notNA(card.company_name)) lines.push(`🏢 *Company:* ${card.company_name}`);
    if (notNA(card.email)) lines.push(`📧 *Email:* ${card.email}`);
    if (notNA(card.website)) lines.push(`🌐 *Website:* ${card.website}`);
    if (notNA(card.address)) lines.push(`📍 *Address:* ${card.address}`);
    if (notNA(card.company_address)) lines.push(`🏠 *Office:* ${card.company_address}`);
    if (notNA(card.office_timings)) lines.push(`🕐 *Timings:* ${card.office_timings}`);
    if (notNA(card.registration_number)) lines.push(`*Reg No:* ${card.registration_number}`);

    const msg = encodeURIComponent(lines.join("\n"));
    let waNum = specificNum;
    if (!waNum) {
        waNum = (card.social_media && notNA(card.social_media.whatsapp)) ? card.social_media.whatsapp.replace(/\D/g, "") : "";
    }
    window.open(`https://wa.me/${waNum}?text=${msg}`, "_blank");
}

window.sendWhatsAppByIdx = (idx) => sendWhatsApp(scannedCards[idx]);

function exportCSV() {
    if (!scannedCards.length) return;
    const hdrs = ["Name(s)","Phone(s)","Role(s)","Email","Address","Company","Company Address","Website","Category","Timings","Reg No","Languages","Date"];
    const rows = scannedCards.map(c => {
        const ps = c.persons || [];
        return [
            ps.map(p => p.name).join(" | "),
            ps.map(p => p.phone).join(" | "),
            ps.map(p => p.designation).join(" | "),
            c.email, c.address, c.company_name, c.company_address, c.website, c.business_category, c.office_timings, c.registration_number, (c.languages_detected || []).join("/"), c.timestamp
        ].map(v => `"${(v || "N/A").toString().replace(/"/g, '""')}"`).join(",");
    });
    const blob = new Blob(["\uFEFF" + [hdrs.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `cards_${Date.now()}.csv`;
    link.click();
}
