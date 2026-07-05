/**
 * scanner.js — Visiting Card AI Scanner Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initializing variables
    let scanSides = 1;
    let currentSide = 1;
    let capturedImages = [];
    let stream = null;
    let facingMode = 'environment';

    // UI Elements
    const setupStep = document.getElementById('setup-step');
    const captureStep = document.getElementById('capture-step');
    const processingStep = document.getElementById('processing-step');
    const resultsStep = document.getElementById('results-step');

    const captureTitle = document.getElementById('capture-title');
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const capturedPreviews = document.getElementById('captured-previews');
    const captureActions = document.getElementById('capture-actions');

    const btn1Side = document.getElementById('btn-1-side');
    const btn2Side = document.getElementById('btn-2-side');
    const btnCapture = document.getElementById('btn-capture');
    const btnSwitchCamera = document.getElementById('btn-switch-camera');
    const fileUpload = document.getElementById('file-upload');
    const btnProcess = document.getElementById('btn-process');
    const btnReset = document.getElementById('btn-reset');
    const btnNewScan = document.getElementById('btn-new-scan');
    const btnExportCsv = document.getElementById('btn-export-csv');
    const btnWhatsappShare = document.getElementById('btn-whatsapp-share');
    const multiShareContainer = document.getElementById('multi-share-container');
    const contactShareButtons = document.getElementById('contact-share-buttons');
    const extraAttachment = document.getElementById('extra-attachment');
    const attachmentName = document.getElementById('attachment-name');

    const resName = document.getElementById('res-name');
    const resPhone = document.getElementById('res-phone');
    const resEmail = document.getElementById('res-email');
    const resCompany = document.getElementById('res-company');
    const resCategory = document.getElementById('res-category');
    const resTimings = document.getElementById('res-timings');
    const resAddress = document.getElementById('res-address');
    const resOther = document.getElementById('res-other');

    const previewName = document.getElementById('preview-name');
    const previewPhone = document.getElementById('preview-phone');
    const previewCompany = document.getElementById('preview-company');

    // Event Listeners
    btn1Side.addEventListener('click', () => {
        scanSides = 1;
        startCapture();
    });

    btn2Side.addEventListener('click', () => {
        scanSides = 2;
        startCapture();
    });

    btnCapture.addEventListener('click', () => {
        capturePhoto();
    });

    btnSwitchCamera.addEventListener('click', () => {
        facingMode = facingMode === 'user' ? 'environment' : 'user';
        startCamera();
    });

    fileUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                handleImageInput(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    });

    btnReset.addEventListener('click', () => {
        location.reload();
    });

    btnNewScan.addEventListener('click', () => {
        location.reload();
    });

    btnExportCsv.addEventListener('click', () => {
        exportToCSV();
    });

    btnWhatsappShare.addEventListener('click', () => {
        shareToWhatsApp();
    });

    extraAttachment.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            attachmentName.innerText = `Attached: ${e.target.files[0].name}`;
        }
    });

    btnProcess.addEventListener('click', () => {
        processImages();
    });

    function startCapture() {
        setupStep.style.display = 'none';
        captureStep.style.display = 'block';
        startCamera();
    }

    async function startCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facingMode },
                audio: false
            });
            video.srcObject = stream;
        } catch (err) {
            console.error("Error accessing camera: ", err);
            alert("Could not access camera. Please use File Upload instead.");
        }
    }

    function capturePhoto() {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/png');
        handleImageInput(imageData);
    }

    function handleImageInput(imageData) {
        capturedImages.push(imageData);

        const img = document.createElement('img');
        img.src = imageData;
        img.className = 'captured-image';
        capturedPreviews.appendChild(img);

        if (scanSides === 2 && currentSide === 1) {
            currentSide = 2;
            captureTitle.innerText = "Scan Back Side";
            startCamera(); // Restart camera for back side
        } else {
            // All required sides captured
            captureActions.style.display = 'block';
            btnCapture.disabled = true;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        }
    }

    async function processImages() {
        captureStep.style.display = 'none';
        processingStep.style.display = 'block';

        const processingStatus = document.getElementById('processing-status');
        let fullText = "";
        let layoutData = [];

        try {
            // Optimization: Load only English + Hindi by default to save resources,
            // but we can add more if needed.
            const worker = await Tesseract.createWorker('eng+hin');

            for (let i = 0; i < capturedImages.length; i++) {
                processingStatus.innerText = `Analyzing image ${i + 1} of ${capturedImages.length}...`;
                const { data } = await worker.recognize(capturedImages[i]);
                fullText += data.text + "\n";
                layoutData.push(data.blocks);
            }

            await worker.terminate();

            processingStatus.innerText = "Extracting details with AI...";
            const extractedData = extractFields(fullText, layoutData);
            displayResults(extractedData);

        } catch (err) {
            console.error("OCR Error: ", err);
            alert("Error processing images. Please try again.");
            location.reload();
        }
    }

    function extractFields(text, layouts) {
        const data = {
            name: "Not Found",
            phone: [],
            email: "Not Found",
            company: "Not Found",
            address: "Not Found",
            category: "Not Found",
            timings: "Not Found",
            other: "Not Found"
        };

        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);

        // Simple Heuristic Extraction
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const phoneRegex = /(\+?\d{1,4}[\s-]?)?\(?\d{3,5}\)?[\s-]?\d{3,5}[\s-]?\d{3,5}/g;

        data.email = text.match(emailRegex)?.[0] || "Not Found";
        data.phone = text.match(phoneRegex)?.map(p => p.trim()) || [];

        const companyIndicators = ['LTD', 'INC', 'CO', 'LLP', 'PRIVATE', 'SOLUTIONS', 'SERVICES', 'LIMITED', 'CORP', 'LIMITED'];

        // 1. Identify Company First
        for (let line of lines) {
            const upperLine = line.toUpperCase();
            if (companyIndicators.some(ind => upperLine.includes(ind))) {
                data.company = line;
                break;
            }
        }

        // 2. Identify Name (Usually one of the first few lines, not email, not company)
        for (let line of lines) {
            if (!line.includes('@') &&
                !line.match(/\d{5,}/) &&
                line.split(' ').length <= 4 &&
                line !== data.company &&
                !line.toUpperCase().includes('.COM')) {
                data.name = line;
                break;
            }
        }

        // Advanced Extraction: Category
        const categoryKeywords = {
            'Healthcare': ['DOCTOR', 'CLINIC', 'HOSPITAL', 'SURGEON', 'PHARMACY', 'DENTIST'],
            'Technology': ['SOFTWARE', 'DEVELOPER', 'IT', 'TECH', 'DIGITAL', 'SYSTEMS'],
            'Education': ['SCHOOL', 'UNIVERSITY', 'COLLEGE', 'TUTOR', 'PROFESSOR', 'COACHING'],
            'Real Estate': ['REALTOR', 'ESTATE', 'BUILDER', 'CONSTRUCTION', 'PROPERTY'],
            'Legal': ['ADVOCATE', 'LAWYER', 'ATTORNEY', 'LEGAL', 'COURT'],
            'Finance': ['BANK', 'INVESTMENT', 'ADVISOR', 'CA', 'ACCOUNTANT', 'FINANCE']
        };

        for (let [cat, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.some(k => text.toUpperCase().includes(k))) {
                data.category = cat;
                break;
            }
        }

        // Advanced Extraction: Office Timings
        const timingRegex = /(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\s*(?:to|-)\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/i;
        data.timings = text.match(timingRegex)?.[0] || "Not Found";

        // Advanced Extraction: Reg Numbers & Social Media
        const regRegex = /(?:REG|GST|LIC|MC|MD|RN)\s*[:#-]?\s*([A-Z0-9\-/]{5,})/i;
        const socialRegex = /(?:@|facebook|instagram|twitter|linkedin|github)\.?com?\/([a-zA-Z0-9._]+)/gi;

        const regMatch = text.match(regRegex);
        const socialMatches = text.match(socialRegex);

        let otherInfo = [];
        if (regMatch) otherInfo.push(`Reg: ${regMatch[1]}`);
        if (socialMatches) otherInfo.push(`Social: ${socialMatches.join(', ')}`);
        data.other = otherInfo.join(' | ') || "Not Found";

        // Address extraction (lines with numbers and common address keywords)
        const addressKeywords = ['STREET', 'ROAD', 'BLDG', 'BUILDING', 'FLOOR', 'AREA', 'CITY', 'STATE', 'PIN', 'ZIP', 'SECTOR', 'PLOT'];
        const addressLines = lines.filter(l => addressKeywords.some(k => l.toUpperCase().includes(k)) || l.match(/\d{5,6}/));
        data.address = addressLines.join(', ') || "Not Found";

        // Layout attempt (finding Name/Phone coordinates)
        if (layouts && layouts[0]) {
            const allWords = layouts[0].flatMap(b => b.paragraphs.flatMap(p => p.lines.flatMap(l => l.words)));

            const nameWord = allWords.find(w => data.name.includes(w.text));
            const phoneWord = allWords.find(w => data.phone[0] && data.phone[0].includes(w.text));

            if (nameWord) data.namePos = nameWord.bbox;
            if (phoneWord) data.phonePos = phoneWord.bbox;
        }

        return data;
    }

    let currentExtractedData = null;

    function displayResults(data) {
        currentExtractedData = data;
        processingStep.style.display = 'none';
        resultsStep.style.display = 'block';

        resName.innerText = data.name;
        resPhone.innerText = data.phone.join(', ') || "Not Found";
        resEmail.innerText = data.email;
        resCompany.innerText = data.company;
        resCategory.innerText = data.category;
        resTimings.innerText = data.timings;
        resAddress.innerText = data.address;
        resOther.innerText = data.other;

        previewName.innerText = data.name;
        previewPhone.innerText = data.phone[0] || "";
        previewCompany.innerText = data.company !== "Not Found" ? data.company : "";

        // Apply Layout alignment if found
        if (data.namePos) {
            const card = document.getElementById('digital-card');
            const cw = card.clientWidth;
            const ch = card.clientHeight;
            // Rough mapping of OCR coordinates to card preview
            previewName.style.position = 'absolute';
            previewName.style.left = (data.namePos.x0 / 10) + 'px';
            previewName.style.top = (data.namePos.y0 / 10) + 'px';
        }
        if (data.phonePos) {
            previewPhone.style.position = 'absolute';
            previewPhone.style.left = (data.phonePos.x0 / 10) + 'px';
            previewPhone.style.top = (data.phonePos.y0 / 10) + 'px';
        }
    }

    async function shareToWhatsApp() {
        if (!currentExtractedData) return;

        const text = `*Visiting Card Details*\n\n` +
                     `*Name:* ${currentExtractedData.name}\n` +
                     `*Phone:* ${currentExtractedData.phone.join(', ')}\n` +
                     `*Email:* ${currentExtractedData.email}\n` +
                     `*Company:* ${currentExtractedData.company}\n` +
                     `*Address:* ${currentExtractedData.address}\n` +
                     `*Category:* ${currentExtractedData.category}\n` +
                     `*Timings:* ${currentExtractedData.timings}\n` +
                     `*Other:* ${currentExtractedData.other}`;

        const files = [];
        // Add captured card images
        for (let i = 0; i < capturedImages.length; i++) {
            const blob = await (await fetch(capturedImages[i])).blob();
            files.push(new File([blob], `card_${i+1}.png`, { type: 'image/png' }));
        }

        // Add additional attachment if present
        if (extraAttachment.files[0]) {
            files.push(extraAttachment.files[0]);
        }

        // Check if Web Share API is supported for files
        if (navigator.share && files.length > 0) {
            try {
                if (navigator.canShare && navigator.canShare({ files: files })) {
                    await navigator.share({
                        title: 'Visiting Card Scan',
                        text: text,
                        files: files
                    });
                    return;
                }
            } catch (err) {
                console.error("Web Share Error:", err);
            }
        }

        // Fallback: Show manual share buttons to avoid popup blockers
        multiShareContainer.style.display = 'block';
        contactShareButtons.innerHTML = '';

        if (currentExtractedData.phone.length > 0) {
            currentExtractedData.phone.forEach(num => {
                const btn = document.createElement('button');
                btn.className = 'btn btn-sm btn-success';
                btn.innerHTML = `<i class="ph ph-whatsapp-logo me-1"></i> ${num}`;
                btn.onclick = () => {
                    const cleanNum = num.replace(/\D/g, '');
                    window.open(`https://wa.me/${cleanNum}?text=${encodeURIComponent(text)}`, '_blank');
                };
                contactShareButtons.appendChild(btn);
            });
            // Auto-scroll to buttons
            multiShareContainer.scrollIntoView({ behavior: 'smooth' });
        } else {
            alert("No phone numbers found. You can copy the text manually.");
        }
    }

    function exportToCSV() {
        if (!currentExtractedData) return;

        const headers = ["Name", "Phone", "Email", "Company", "Category", "Timings", "Address", "Other"];
        const row = [
            currentExtractedData.name,
            currentExtractedData.phone.join('; '),
            currentExtractedData.email,
            currentExtractedData.company,
            currentExtractedData.category,
            currentExtractedData.timings,
            currentExtractedData.address,
            currentExtractedData.other
        ];

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + row.map(val => `"${val.replace(/"/g, '""')}"`).join(",");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `visiting_card_${currentExtractedData.name.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});
