/**
 * diagnostic.test.js — Accuracy Test for Extraction Engine
 */

// Mocked data from sample cards
const samples = [
    {
        input: "Dr. Jane Smith MD\nCardiologist\nCity Heart Clinic\n123 Health St, London\nReg: 123456\n9:00 AM - 5:00 PM\njane@heart.com\n+44 20 7946 0000",
        expected: {
            name: "Dr. Jane Smith MD",
            email: "jane@heart.com",
            category: "Healthcare",
            timings: "9:00 AM - 5:00 PM"
        }
    },
    {
        input: "Tech Solutions Ltd\nMark Zuckerberg\nCEO\n1 Hacker Way, Menlo Park\n@facebook.com/mark\nmark@fb.com\n650-555-1212",
        expected: {
            name: "Mark Zuckerberg",
            email: "mark@fb.com",
            company: "Tech Solutions Ltd",
            category: "Technology"
        }
    }
];

function testExtractFields(text) {
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

    const categoryKeywords = {
        'Healthcare': ['DOCTOR', 'CLINIC', 'HOSPITAL', 'SURGEON', 'PHARMACY', 'DENTIST'],
        'Technology': ['SOFTWARE', 'DEVELOPER', 'IT', 'TECH', 'DIGITAL', 'SYSTEMS'],
    };

    for (let [cat, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(k => text.toUpperCase().includes(k))) {
            data.category = cat;
            break;
        }
    }

    const timingRegex = /(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\s*(?:to|-)\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/i;
    data.timings = text.match(timingRegex)?.[0] || "Not Found";

    return data;
}

// Execution
console.log("--- Starting Extraction Accuracy Diagnostic ---");
samples.forEach((sample, i) => {
    const result = testExtractFields(sample.input);
    let success = true;
    for (let key in sample.expected) {
        if (result[key] !== sample.expected[key]) {
            console.error(`Sample ${i+1} FAIL: Expected ${key} to be "${sample.expected[key]}", got "${result[key]}"`);
            success = false;
        }
    }
    if (success) console.log(`Sample ${i+1} PASS`);
});
console.log("--- Diagnostic Complete ---");
