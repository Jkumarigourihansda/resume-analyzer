// backend/server.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');

const app = express();
app.use(cors());
app.use(express.json());

// Configure Multer (Memory Storage for instant processing)
const upload = multer({ storage: multer.memoryStorage() });

const PORT = 5000;

// --- SIMPLE NLP ENGINE ---
// In a production app, you might use Python (spaCy) or OpenAI API here.
// We will build a native JS Keyword Extractor for this demo.

const STOP_WORDS = new Set(['and', 'the', 'is', 'in', 'at', 'of', 'for', 'to', 'a', 'with', 'on', 'as', 'by', 'an', 'be', 'we', 'are', 'it', 'or', 'that', 'this']);

const cleanText = (text) => {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .split(/\s+/)            // Split into words
        .filter(word => word.length > 2 && !STOP_WORDS.has(word)); // Remove stop words & short words
};

const analyzeResume = (resumeText, jobDescText) => {
    const resumeTokens = new Set(cleanText(resumeText));
    const jobTokens = cleanText(jobDescText);
    
    // 1. Frequency Analysis of Job Keywords
    const jobKeywords = {};
    jobTokens.forEach(word => {
        jobKeywords[word] = (jobKeywords[word] || 0) + 1;
    });

    // Filter only significant keywords (appeared more than once or are unique)
    const significantKeywords = Object.keys(jobKeywords);
    
    // 2. Find Matches and Gaps
    const matched = [];
    const missing = [];
    let matchCount = 0;

    significantKeywords.forEach(word => {
        if (resumeTokens.has(word)) {
            matched.push(word);
            matchCount++;
        } else {
            missing.push(word);
        }
    });

    // 3. Calculate Score
    // Simple logic: Percentage of job keywords found in resume
    const score = Math.round((matchCount / significantKeywords.length) * 100) || 0;

    return {
        score,
        matchedKeywords: matched.slice(0, 10), // Top 10
        missingKeywords: missing.slice(0, 5),  // Top 5 missing
        totalWords: resumeTokens.size
    };
};

// --- ROUTES ---

app.post('/api/analyze', upload.single('resume'), async (req, res) => {
    try {
        if (!req.file || !req.body.jobDescription) {
            return res.status(400).json({ message: "Resume PDF and Job Description are required." });
        }

        // 1. Extract Text from PDF
        const pdfData = await pdfParse(req.file.buffer);
        const resumeText = pdfData.text;

        // 2. Run Analysis
        const analysis = analyzeResume(resumeText, req.body.jobDescription);

        res.json({
            success: true,
            data: analysis
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Analysis failed", error: error.message });
    }
});

app.listen(PORT, () => console.log(`AI Server running on port ${PORT}`));