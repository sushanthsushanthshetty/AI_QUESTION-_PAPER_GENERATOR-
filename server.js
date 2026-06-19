import express from 'express';
import cors from 'cors';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';
import dns from 'dns';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { connectDB, getDB } from './db/connection.js';
import { authenticateToken } from './middleware/authenticateToken.js';
import authRoutes from './routes/authRoutes.js';

// Force IPv4 DNS resolution first to fix MongoDB SRV DNS lookup issues
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

const PORT = process.env.PORT || 5000;
const INCEPTION_API_KEY = process.env.INCEPTION_API_KEY || '';

// Local JSON file path as fallback
const DB_PATH = path.join(
  os.homedir(),
  '.gemini',
  'antigravity',
  'scratch',
  'papers_db.json'
);

// Ensure the local database directory and file exist
function initializeDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2), 'utf-8');
  }
}
initializeDb();

// Read papers from local DB (fallback)
function readPapers() {
  try {
    initializeDb();
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return [];
  }
}

// Write papers to local DB (fallback)
function writePapers(papers) {
  try {
    initializeDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(papers, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing database:', error);
    return false;
  }
}

// Mount Auth Routes
app.use('/api/auth', authRoutes);

// REST endpoints for saving/retrieving papers (protected with MongoDB)
app.get('/api/papers', authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    const papersCollection = db.collection('papers');
    const papers = await papersCollection
      .find({ teacherId: req.teacherId })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ success: true, papers });
  } catch (error) {
    // Fallback to local JSON if MongoDB is not available
    const papers = readPapers();
    res.json({ success: true, papers });
  }
});

app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    apiKeyConfigured: !!INCEPTION_API_KEY
  });
});

app.post('/api/save-paper', authenticateToken, async (req, res) => {
  try {
    const { paper } = req.body;
    if (!paper) {
      return res.status(400).json({ success: false, error: 'Paper content required' });
    }

    // Add teacherId from JWT and generate unique ID
    const paperId = paper.paperId || `paper-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newPaper = {
      ...paper,
      paperId,
      teacherId: req.teacherId,
      createdAt: paper.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const db = getDB();
      const papersCollection = db.collection('papers');
      
      // Upsert: update if exists by paperId, else insert
      await papersCollection.replaceOne(
        { paperId },
        newPaper,
        { upsert: true }
      );
      
      res.json({ success: true, paperId, paper: newPaper });
    } catch (dbError) {
      // Fallback to local JSON
      const papers = readPapers();
      const index = papers.findIndex(p => p.paperId === paperId);
      if (index !== -1) {
        papers[index] = newPaper;
      } else {
        papers.push(newPaper);
      }
      writePapers(papers);
      res.json({ success: true, paperId, paper: newPaper });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/papers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    let deleted = false;
    
    try {
      const db = getDB();
      const papersCollection = db.collection('papers');
      
      // Only delete if teacherId matches (ownership check)
      const result = await papersCollection.deleteOne({ 
        paperId: id, 
        teacherId: req.teacherId 
      });
      
      if (result.deletedCount > 0) {
        deleted = true;
      }
    } catch (dbError) {
      // MongoDB error, continue to fallback
    }
    
    // Always also try deleting from local JSON (handles papers saved via fallback)
    const papers = readPapers();
    const beforeCount = papers.length;
    const filtered = papers.filter(p => p.paperId !== id && p.id !== id);
    if (filtered.length < beforeCount) {
      writePapers(filtered);
      deleted = true;
    }
    
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Paper not found or access denied' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/papers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { paper } = req.body;
    
    if (!paper) {
      return res.status(400).json({ success: false, error: 'Paper content required' });
    }

    try {
      const db = getDB();
      const papersCollection = db.collection('papers');
      
      const updatedPaper = {
        ...paper,
        paperId: id,
        teacherId: req.teacherId,
        updatedAt: new Date().toISOString()
      };

      const result = await papersCollection.replaceOne(
        { paperId: id, teacherId: req.teacherId },
        updatedPaper
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ success: false, error: 'Paper not found or access denied' });
      }

      res.json({ success: true, paper: updatedPaper });
    } catch (dbError) {
      res.status(500).json({ success: false, error: 'Failed to update paper' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Robust JSON repair utility for AI-generated content
// Uses a character-by-character state machine with bracket-depth tracking
const repairJSON = (raw) => {
  // Step 1: Remove markdown code fences
  let text = raw.replace(/```json\s*/gi, '').replace(/```/g, '').replace(/^`+|`+$/g, '').trim();

  // Step 2: Find the outermost valid JSON boundary — walk from the start,
  // keep track of nesting depth, and stop at the matching top-level closing brace.
  let start = -1, maxDepth = 0, depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') continue;   // skip quotes — quotes are handled below
    if (ch === '{' || ch === '[') {
      if (depth === 0 && start === -1) start = i;
      depth++;
      if (depth > maxDepth) maxDepth = depth;
    } else if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0 && start !== -1) {
        // Found the matching top-level closing bracket
        text = text.substring(start, i + 1);
        break;
      }
    }
  }
  // Fallback: use first/last brace if depth-tracking didn't isolate a region
  if (!text || text.indexOf('{') === -1) {
    const fb = text.indexOf('{');
    const lb = text.lastIndexOf('}');
    if (fb !== -1 && lb > fb) text = text.substring(fb, lb + 1);
  }

  // Step 3: Try parsing directly first
  try {
    return JSON.parse(text);
  } catch (_) { /* fall through to repairs */ }

  // Step 4: Remove trailing commas before } or ]
  try {
    return JSON.parse(text.replace(/,\s*([}\]])/g, '$1'));
  } catch (_) { /* fall through to character-by-character */ }

  // Step 5: Character-by-character reconstruction
  // State machine tracks: inString, escapeNext, and the parsed half so far.
  let result = '';
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escapeNext) {
      // Previous char was a backslash — this char is the escaped literal
      result += ch;
      escapeNext = false;
      continue;
    }

    if (ch === '\\' && inString) {
      // Backslash inside a string: pass it through and mark next char as escaped
      result += ch;
      escapeNext = true;
      continue;
    }

    if (ch === '"') {
      // Toggle string state
      result += ch;
      inString = !inString;
      continue;
    }

    if (inString && ch === '\n') {
      // Word-wrap line break: fold into a space inside the string
      result += ' ';
      continue;
    }

    if (!inString) {
      // Any non-string character — pass through unmodified
      result += ch;
      continue;
    }

    // Inside a string and this char is not a newline, not a backslash, not a quote.
    // (This branch is unreachable in well-formed text, but safe to leave here.)
    result += ch;
  }

  // Step 6: Try the repaired result
  try {
    return JSON.parse(result);
  } catch (_) { /* fall through to aggressive cleanup */ }

  // Step 7: Aggressive ASCII-whitelist cleanup as last resort
  const cleaned = text
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/[^\x20-\x7E{}\[\]\"',:]/g, '');
  return JSON.parse(cleaned);
};

// Endpoint to generate paper using Inception API
app.post('/api/generate-paper', authenticateToken, async (req, res) => {
  // Extract all params outside try for fallback access
  const {
    subject,
    subjectCode,
    semester,
    testNo,
    maxMarks,
    duration,
    syllabus,
    bloomBreakdown,
    sections,
    clientApiKey,
    facultyName,
    courseBranch,
    subjectCategory,
    numParts,
    questionsPerPart
  } = req.body || {};

  const partsCount  = numParts  || 2;
  const qtyPerPart  = questionsPerPart || 2;

  try {

    const apiKeyToUse = clientApiKey || INCEPTION_API_KEY;

    if (!apiKeyToUse) {
      return res.status(400).json({
        success: false,
        error: 'API Key is missing. Please configure the INCEPTION_API_KEY in the .env file or input it in the application Settings.'
      });
    }

    // Safe access to bloom breakdown with defaults to prevent crashes
    const bbRU = (bloomBreakdown && bloomBreakdown.rememberUnderstand) || 40;
    const bbAA = (bloomBreakdown && bloomBreakdown.applyAnalyze) || 40;
    const bbEC = (bloomBreakdown && bloomBreakdown.evaluateCreate) || 20;

    // Calculate exact marks distribution for parts
    const partAMarks = Math.floor(maxMarks * 0.48); // ~48% for Part A
    const partBMarks = maxMarks - partAMarks;        // rest for Part B
    const marksPerSubPartA = Math.floor(partAMarks / 2); // split between a) and b)
    const marksPerSubPartB = Math.floor(partBMarks / 2);

    const systemPrompt = `You are an expert academic evaluator and question paper generator for MVIT (Sir M. Visvesvaraya Institute of Technology). You ONLY return valid JSON. No other text.

You MUST generate a COMPLETE question paper in this exact JSON structure. Every field is required.

{
  "subject": "string - subject name",
  "subjectCode": "string - course code",
  "semester": number,
  "testNo": "TEST PAPER - I" or "TEST PAPER - II",
  "maxMarks": number,
  "duration": number (minutes),
  "facultyName": "string - faculty name",
  "courseBranch": "string - e.g. MCA",
  "subjectCategory": "PCC or IPCC",
  "coStatements": [
    {"co": "CO1", "description": "detailed description of this course outcome related to the syllabus"},
    {"co": "CO2", "description": "detailed description"},
    {"co": "CO3", "description": "detailed description"}
  ],
  "parts": [
    {
      "partNo": 1,
      "partTitle": "PART A",
      "questionSets": [
        {
          "setNo": 1,
          "questions": [
            {
              "qNo": "1",
              "subParts": [
                {"label": "a)", "text": "question text here", "marks": 5, "co": "CO1", "bl": "L2", "po": "PO1", "pi": "1.7.1"},
                {"label": "b)", "text": "question text here", "marks": 7, "co": "CO1", "bl": "L3", "po": "PO1", "pi": "1.7.1"}
              ]
            }
          ]
        },
        {
          "setNo": 2,
          "questions": [
            {
              "qNo": "2",
              "subParts": [
                {"label": "a)", "text": "alternate question text for set 2", "marks": 5, "co": "CO2", "bl": "L2", "po": "PO2", "pi": "2.6.3"},
                {"label": "b)", "text": "alternate question text for set 2", "marks": 7, "co": "CO2", "bl": "L3", "po": "PO2", "pi": "2.6.3"}
              ]
            }
          ]
        }
      ]
    },
    {
      "partNo": 2,
      "partTitle": "PART B",
      "questionSets": [
        {
          "setNo": 1,
          "questions": [
            {
              "qNo": "3",
              "subParts": [
                {"label": "a)", "text": "question text", "marks": 8, "co": "CO3", "bl": "L4", "po": "PO3", "pi": "1.7.1"},
                {"label": "b)", "text": "question text", "marks": 5, "co": "CO3", "bl": "L3", "po": "PO3", "pi": "2.6.3"}
              ]
            }
          ]
        },
        {
          "setNo": 2,
          "questions": [
            {
              "qNo": "4",
              "subParts": [
                {"label": "a)", "text": "alternate question text", "marks": 8, "co": "CO4", "bl": "L4", "po": "PO4", "pi": "1.7.1"},
                {"label": "b)", "text": "alternate question text", "marks": 5, "co": "CO4", "bl": "L3", "po": "PO4", "pi": "2.6.3"}
              ]
            }
          ]
        }
      ]
    }
  ]
}

RULES:
1. Generate exactly ${partsCount} PARTS (PART A, PART B, ...).
2. Each part has exactly ${qtyPerPart} question SETS (Set 1 and Set 2). Set 1 and Set 2 are OR alternatives.
3. Each question set has EXACTLY 1 question with 2 sub-parts: a) and b).
4. IMPORTANT: Each sub-part MUST have ALL these fields filled: label, text, marks, co, bl, po, pi. Never leave any empty.
5. Total marks per part: Part A ~${partAMarks} marks, Part B ~${partBMarks} marks.
6. Sum of one question set per part = ${maxMarks} total.
7. coStatements must describe what students achieve for each CO based on the syllabus topic.
8. Use meaningful question text related to the syllabus. Be specific - include technical terms, concepts, and ask students to explain, describe, analyze, calculate, draw, etc.
9. DO NOT wrap in markdown code fences. Return ONLY the raw JSON object.`;

    const userPrompt = `Generate a ${testNo} question paper for ${subject} (${subjectCode}).

FACULTY: ${facultyName || 'Faculty'}
BRANCH: ${courseBranch || 'MCA'}
CATEGORY: ${subjectCategory || 'PCC'}
SEMESTER: ${semester}
MARKS: ${maxMarks}
DURATION: ${duration} minutes

SYLLABUS TOPICS:
${syllabus}

Now generate the complete paper JSON. Each sub-part MUST have its own co, bl, po, pi values. Return only the JSON.`;

    console.log(`Sending generation request for "${subject}" to Inception API...`);

    const response = await axios.post(
      `https://api.inceptionlabs.ai/v1/chat/completions`,
      {
        model: 'mercury-2',
        max_tokens: 4000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKeyToUse}`,
          'Content-Type': 'application/json'
        },
        timeout: 90000
      }
    );

    console.log('Received response from Inception API. Extracting JSON...');
    console.log('Response data sample:', JSON.stringify(response.data).substring(0, 500));

    let paperText = '';
    if (response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
      paperText = response.data.choices[0].message.content || '';
    } else if (response.data.content && response.data.content[0]) {
      paperText = response.data.content[0].text || '';
    } else {
      paperText = response.data.text || JSON.stringify(response.data);
    }

    if (!paperText || paperText.trim() === '') {
      throw new Error('AI returned an empty response. The model did not generate any content.');
    }

    // repairJSON handles all parsing attempts internally and returns a parsed object
    let parsedPaper = repairJSON(paperText);

    // Persist the raw syllabus text on the paper for downstream answer-key grounding
    parsedPaper.syllabusSourceText = syllabus || '';

    parsedPaper.subject         = parsedPaper.subject         || subject;
    parsedPaper.subjectCode     = parsedPaper.subjectCode     || subjectCode;
    parsedPaper.semester        = parsedPaper.semester        || semester;
    parsedPaper.testNo          = parsedPaper.testNo          || testNo;
    parsedPaper.maxMarks        = parsedPaper.maxMarks        || maxMarks;
    parsedPaper.duration        = parsedPaper.duration        || duration;
    parsedPaper.facultyName     = parsedPaper.facultyName     || facultyName;
    parsedPaper.courseBranch    = parsedPaper.courseBranch    || courseBranch;
    parsedPaper.subjectCategory = parsedPaper.subjectCategory || subjectCategory;

    // Normalise parts: if AI returns single-part or flat-section, wrap sections accordingly
    if (!parsedPaper.parts || parsedPaper.parts.length === 0) {
      parsedPaper.parts = (sections || []).map((sec, i) => ({
        partNo:     i + 1,
        partTitle:  sec.title || `Part ${String.fromCharCode(65 + i)}`,
        questionSets: (sec.questions || []).map((q, j) => ({
          setNo: j + 1,
          questions: [{
            qNo:     q.id || `${i+1}${j+1}`,
            subParts: q.subParts || [{ label: 'a)', text: q.text || '', marks: q.marks || 0 }],
            co:      q.co  || `CO${i + 1}`,
            bl:      q.bl  || 'L2',
            po:      q.po  || 'PO1',
            pi:      q.pi  || '1.1.1'
          }]
        }))
      }));
    }

    res.json({ success: true, paper: parsedPaper });

  } catch (error) {
    console.error('Error generating question paper via AI:', error.message);
    console.error('Falling back to local template generation...');
    
    // Generate a fallback paper locally with default questions
    try {
      const fallbackPaper = generateFallbackPaper({
        subject,
        subjectCode,
        semester,
        testNo,
        maxMarks,
        duration,
        facultyName,
        courseBranch,
        subjectCategory,
        partsCount,
        qtyPerPart,
        syllabus
      });
      console.log('Fallback paper generated successfully');
      return res.json({ success: true, paper: fallbackPaper });
    } catch (fallbackErr) {
      console.error('Fallback generation also failed:', fallbackErr.message);
      return res.status(500).json({ success: false, error: 'Failed to generate question paper. Please try again.' });
    }
  }
});

// Fallback paper generator that creates a valid MVIT paper without AI
function generateFallbackPaper({ subject, subjectCode, semester, testNo, maxMarks, duration, facultyName, courseBranch, subjectCategory, partsCount, qtyPerPart, syllabus }) {
  const totalMarks = parseInt(maxMarks) || 25;
  const parts = [];
  const usedTopics = (syllabus || 'Computer Science fundamentals').split(/[,.\n]+/).filter(t => t.trim()).map(t => t.trim());
  
  const questionTemplates = [
    { a: "Explain the concept of %s and discuss its importance in modern computing systems.", b: "Describe the key features and applications of %s with suitable examples." },
    { a: "Compare and contrast different approaches to %s with appropriate diagrams.", b: "Analyze the impact of %s on system performance and reliability." },
    { a: "Discuss the fundamental principles underlying %s and their practical implementations.", b: "Evaluate the various techniques used in %s, highlighting their advantages and limitations." },
    { a: "Explain the architecture and working mechanism of %s with a neat diagram.", b: "Describe the role of %s in real-world applications and its future scope." },
    { a: "What are the key components of %s? Explain each with suitable examples.", b: "Discuss the challenges and solutions associated with implementing %s." },
  ];
  
  const cos = ['CO1', 'CO2', 'CO3', 'CO4'];
  const bls = ['L2', 'L3', 'L4'];
  const pos = ['PO1', 'PO2', 'PO3', 'PO4'];
  const pis = ['1.7.1', '2.6.3', '3.5.2', '4.8.1'];
  
  // Generate CO statements
  const coStatements = [
    { co: 'CO1', description: 'Understand and describe the fundamental concepts and principles of ' + (subject || 'the subject') + '.' },
    { co: 'CO2', description: 'Analyze and apply various techniques and methodologies related to ' + (subject || 'the subject') + ' in practical scenarios.' },
    { co: 'CO3', description: 'Evaluate and compare different approaches to solve complex problems in ' + (subject || 'the subject') + '.' },
    { co: 'CO4', description: 'Design and develop solutions using the knowledge gained from ' + (subject || 'the subject') + ' for real-world applications.' },
  ];
  
  const partsCountActual = partsCount || 2;
  const setsPerPart = qtyPerPart || 2;
  // Distribute marks: Part A gets ~48%, Part B gets ~52%
  const partMarks = [];
  let remaining = totalMarks;
  for (let p = 0; p < partsCountActual; p++) {
    if (p === partsCountActual - 1) {
      partMarks.push(remaining);
    } else {
      const share = Math.floor(totalMarks * 0.48);
      partMarks.push(share);
      remaining -= share;
    }
  }
  
  for (let p = 0; p < partsCountActual; p++) {
    const letter = ['A', 'B', 'C', 'D'][p] || String.fromCharCode(65 + p);
    const partTotal = partMarks[p];
    const sets = [];
    
    for (let s = 0; s < setsPerPart; s++) {
      const qNum = p * setsPerPart + s + 1;
      // Split marks between sub-parts
      const aMarks = Math.ceil(partTotal / 2);
      const bMarks = partTotal - aMarks;
      
      const topicIdx = (p * setsPerPart + s) % usedTopics.length;
      const topic = usedTopics[topicIdx] || 'core concepts';
      const template = questionTemplates[(p * setsPerPart + s) % questionTemplates.length];
      
      sets.push({
        setNo: s + 1,
        questions: [{
          qNo: String(qNum),
          subParts: [
            {
              label: 'a)',
              text: template.a.replace('%s', topic),
              marks: aMarks,
              co: cos[(p * 2) % cos.length],
              bl: bls[(p * 2) % bls.length],
              po: pos[(p * 2) % pos.length],
              pi: pis[(p * 2) % pis.length]
            },
            {
              label: 'b)',
              text: template.b.replace('%s', topic),
              marks: bMarks,
              co: cos[(p * 2 + 1) % cos.length],
              bl: bls[(p * 2 + 1) % bls.length],
              po: pos[(p * 2 + 1) % pos.length],
              pi: pis[(p * 2 + 1) % pis.length]
            }
          ]
        }]
      });
    }
    
    parts.push({
      partNo: p + 1,
      partTitle: `PART ${letter}`,
      questionSets: sets
    });
  }
  
  return {
    subject: subject || 'Subject',
    subjectCode: subjectCode || 'CODE',
    semester: parseInt(semester) || 1,
    testNo: testNo || 'TEST PAPER - I',
    maxMarks: totalMarks,
    duration: parseInt(duration) || 60,
    facultyName: facultyName || 'Faculty Name',
    courseBranch: courseBranch || 'MCA',
    subjectCategory: subjectCategory || 'PCC',
    coStatements,
    parts,
    syllabusSourceText: syllabus || ''
  };
}

// Endpoint to regenerate a single question using Inception API
app.post('/api/regenerate-question', authenticateToken, async (req, res) => {
  try {
    const {
      syllabus,
      questionText,
      cognitiveLevel,
      marks,
      type,
      options,
      clientApiKey
    } = req.body;

    const apiKeyToUse = clientApiKey || INCEPTION_API_KEY;

    if (!apiKeyToUse) {
      return res.status(400).json({
        success: false,
        error: 'API Key is missing. Please configure the INCEPTION_API_KEY in the .env file or input it in the application Settings.'
      });
    }

    const systemPrompt = `You are an expert academic evaluator and curriculum designer. 
Your objective is to generate exactly ONE replacement sub-part for an exam paper (MVIT format), matching the syllabus topic, marks, CO/BL/PO/PI of the original question.
The output MUST be a valid JSON object matching the JSON schema below. DO NOT output any markdown blocks, explanations, backticks, or intro texts outside the JSON. Return only the raw JSON.

JSON SCHEMA:
{
  "subParts": [
    { "label": "a)", "text": "String (the sub-part question text)", "marks": Number }
  ],
  "co": "String (Course Outcome, e.g. CO1, CO2)",
  "bl": "String (Bloom's Level, e.g. L2, L3)",
  "po": "String (Program Outcome, e.g. PO1, PO2)",
  "pi": "String (Performance Indicator, e.g. 1.7.1)"
}`;

    const userPrompt = `Syllabus Concept/Scope: ${syllabus}
Part of Question Being Replaced: "${questionText}"
Desired Sub-part: a) — regenerate with new but conceptually equivalent content
Question Marks: ${marks}
Bloom Level: ${cognitiveLevel}

Generate exactly ONE replacement sub-part in raw JSON format. Keep the CO, BL, PO, PI close to the original values.`;

    console.log(`Sending single-question regeneration request to Inception API...`);

    const response = await axios.post(
      `https://api.inceptionlabs.ai/v1/chat/completions`,
      {
        model: 'mercury-2',
        max_tokens: 1500,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKeyToUse}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    let questionTextResponse = '';
    if (response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
      questionTextResponse = response.data.choices[0].message.content || '';
    } else if (response.data.content && response.data.content[0]) {
      questionTextResponse = response.data.content[0].text || '';
    } else {
      questionTextResponse = response.data.text || JSON.stringify(response.data);
    }

    if (!questionTextResponse || questionTextResponse.trim() === '') {
      throw new Error('AI returned an empty response for single question regeneration.');
    }

    // repairJSON handles all parsing attempts internally and returns a parsed object
    let parsedQuestion = repairJSON(questionTextResponse);

    parsedQuestion.text = parsedQuestion.text || "Explain the concept from the syllabus.";
    parsedQuestion.cognitiveLevel = parsedQuestion.cognitiveLevel || cognitiveLevel;

    res.json({ success: true, question: parsedQuestion });

  } catch (error) {
    console.error('Error regenerating question:', error.message);
    if (error.response) {
      console.error('API Response Status:', error.response.status);
      console.error('API Response Data:', JSON.stringify(error.response.data, null, 2));
    }
    let errorMessage = error.message;
    if (error.response && error.response.data) {
      if (typeof error.response.data.error === 'object') {
        errorMessage = JSON.stringify(error.response.data.error);
      } else {
        errorMessage = error.response.data.error || JSON.stringify(error.response.data);
      }
    }
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Multer setup for syllabus PDF uploads (memory storage, 20MB limit, PDF only)
const multerStorage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// POST /api/syllabus/upload - Extract text and chunk a syllabus PDF
app.post('/api/syllabus/upload', authenticateToken, multerStorage.single('syllabus'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No PDF file uploaded. Field name must be "syllabus".' });
    }

    const pdfBuffer = req.file.buffer;
    let extractedText = '';
    try {
      const data = await pdfParse(pdfBuffer);
      extractedText = data.text || '';
    } catch (parseErr) {
      console.error('PDF parse error:', parseErr.message);
      return res.status(400).json({ success: false, error: 'Failed to parse PDF file.' });
    }

    if (!extractedText.trim()) {
      return res.status(400).json({ success: false, error: 'PDF appears to be empty or unreadable.' });
    }

    // Chunk text by detecting topic-like headers.
    // Strategy: split on lines that look like standalone headings (short, title-case, no ending punctuation)
    // and keep following paragraph(s) attached until the next heading.
    // Also preserve code blocks / OUTPUT sections attached to the preceding explanation.
    const lines = extractedText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const chunks = [];
    let currentTopic = 'General';
    let currentTextParts = [];
    let inCodeBlock = false;
    let codeBlockLines = [];

    const isHeadingLike = (line) => {
      // Heuristic: relatively short, no ending period/comma/semicolon/colon, not starting with bullet/number, not all-caps sentence
      if (line.length < 80 && !/[.,;:!?]$/.test(line) && !/^[-•*\d]+[\.\)]\s/.test(line)) {
        // Additional check: not a continuation of a previous sentence
        const lower = line.toLowerCase();
        if (!lower.startsWith('and ') && !lower.startsWith('or ') && !lower.startsWith('but ') && !lower.startsWith('the ') && !lower.startsWith('a ') && !lower.startsWith('an ')) {
          return true;
        }
      }
      return false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Track fenced code blocks ```
      if (line.startsWith('```') || line.startsWith('~~~')) {
        inCodeBlock = !inCodeBlock;
        codeBlockLines.push(line);
        if (!inCodeBlock) {
          // End of code block, attach to current
          currentTextParts.push(codeBlockLines.join('\n'));
          codeBlockLines = [];
        }
        continue;
      }
      if (inCodeBlock) {
        codeBlockLines.push(line);
        continue;
      }

      if (isHeadingLike(line)) {
        // Save previous chunk if non-empty
        if (currentTextParts.length > 0) {
          chunks.push({ topic: currentTopic, text: currentTextParts.join('\n').trim() });
        }
        currentTopic = line;
        currentTextParts = [];
      } else {
        currentTextParts.push(line);
      }
    }

    // Flush last chunk
    if (currentTextParts.length > 0) {
      chunks.push({ topic: currentTopic, text: currentTextParts.join('\n').trim() });
    }

    // Fallback: if we ended up with a single huge chunk, split by paragraph into ~500-word pseudo-topics
    if (chunks.length === 1 && chunks[0].text.split(/\s+/).length > 800) {
      const bigText = chunks[0].text;
      const paragraphs = bigText.split(/\n\s*\n/).filter(p => p.trim());
      const newChunks = [];
      const approxWordsPerChunk = 400;
      let buffer = [];
      let wordCount = 0;
      for (const para of paragraphs) {
        const wc = para.split(/\s+/).length;
        if (wordCount + wc > approxWordsPerChunk && buffer.length > 0) {
          newChunks.push({ topic: currentTopic, text: buffer.join('\n\n').trim() });
          buffer = [];
          wordCount = 0;
        }
        buffer.push(para);
        wordCount += wc;
      }
      if (buffer.length > 0) {
        newChunks.push({ topic: currentTopic, text: buffer.join('\n\n').trim() });
      }
      chunks.length = 0;
      chunks.push(...newChunks);
    }

    res.json({ success: true, chunkCount: chunks.length, chunks });
  } catch (error) {
    console.error('Syllabus upload error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to process syllabus PDF.' });
  }
});

// POST /api/papers/:id/generate-answers - AI answer key generation with full-context grounding
app.post('/api/papers/:id/generate-answers', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { chunks, syllabusSourceText: clientSourceText, supplementalText } = req.body;

    // --- Build the combined source text ---
    // Priority: 1) Paper's saved syllabusSourceText, 2) client-supplied syllabusSourceText, 3) chunks array
    let combinedSourceText = '';

    // Load paper to check for saved syllabusSourceText
    let paper = null;
    try {
      const db = getDB();
      const papersCollection = db.collection('papers');
      const result = await papersCollection.findOne({ paperId: id, teacherId: req.teacherId });
      if (result) paper = result;
    } catch (dbErr) { /* fall through to local JSON */ }

    if (!paper) {
      const papers = readPapers();
      paper = papers.find(p => (p.paperId === id || p.id === id) && p.teacherId === req.teacherId);
    }

    if (!paper) {
      return res.status(404).json({ success: false, error: 'Paper not found or access denied.' });
    }

    if (!paper.parts || paper.parts.length === 0) {
      return res.status(400).json({ success: false, error: 'Paper has no question parts to generate answers for.' });
    }

    // Build source text from: paper's saved syllabusSourceText, OR client-supplied source, OR chunks
    if (paper.syllabusSourceText) {
      combinedSourceText = paper.syllabusSourceText;
    } else if (clientSourceText) {
      combinedSourceText = clientSourceText;
    } else if (chunks && Array.isArray(chunks) && chunks.length > 0) {
      combinedSourceText = chunks.map(c => c.text || '').join('\n\n');
    }

    // Append any supplemental (optional PDF upload) text
    if (supplementalText) {
      combinedSourceText = combinedSourceText
        ? combinedSourceText + '\n\n--- Supplemental Reference ---\n\n' + supplementalText
        : supplementalText;
    }

    if (!combinedSourceText || !combinedSourceText.trim()) {
      return res.status(400).json({ success: false, error: 'No source text available. Please ensure syllabus content is available for this paper.' });
    }

    // --- Build flattened list of subParts with context ---
    const subPartTargets = [];
    (paper.parts || []).forEach((part, pIdx) => {
      (part.questionSets || []).forEach((qs, sIdx) => {
        (qs.questions || []).forEach((q, qIdx) => {
          (q.subParts || []).forEach((sp, spIdx) => {
            subPartTargets.push({
              partIdx: pIdx,
              setIdx: sIdx,
              qIdx,
              spIdx,
              subPart: sp
            });
          });
        });
      });
    });

    if (subPartTargets.length === 0) {
      return res.status(400).json({ success: false, error: 'No sub-parts found in paper.' });
    }

    const apiKeyToUse = req.body.clientApiKey || process.env.INCEPTION_API_KEY || '';
    if (!apiKeyToUse) {
      return res.status(400).json({ success: false, error: 'API Key is missing. Configure INCEPTION_API_KEY in .env or Settings.' });
    }

    // --- Decide grounding strategy ---
    // Default: send full combined source text to the model for every question
    // Fallback (text > ~12k chars): use keyword overlap to select top 2-3 most relevant chunks
    const APPROX_MAX_DIRECT = 12000; // ~12k chars before fallback kicks in
    let useFullText = combinedSourceText.length <= APPROX_MAX_DIRECT;

    // Pre-split source into chunks for fallback path (splitting by double-newline paragraphs)
    const sourceChunks = combinedSourceText.split(/\n\s*\n/).filter(c => c.trim().length > 0);

    // Helper: score relevance of a source chunk to a sub-part question
    const scoreRelevance = (chunkText, questionText) => {
      const qWords = new Set(
        questionText.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter(w => w.length > 3)
      );
      const cWords = new Set(
        chunkText.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter(w => w.length > 3)
      );
      let overlap = 0;
      qWords.forEach(w => { if (cWords.has(w)) overlap++; });
      return overlap;
    };

    // Helper: get top N most relevant chunks for a question
    const getTopChunks = (questionText, n = 3) => {
      const scored = sourceChunks.map((chunk, idx) => ({
        idx,
        text: chunk,
        score: scoreRelevance(chunk, questionText)
      }));
      scored.sort((a, b) => b.score - a.score);
      // Take top N, but only those with non-zero score; fall back to first N if all zero
      const top = scored.filter(s => s.score > 0).slice(0, n);
      if (top.length === 0) return scored.slice(0, n);
      return top;
    };

    // --- Generate answers one by one ---
    let updatedParts = JSON.parse(JSON.stringify(paper.parts));
    for (const target of subPartTargets) {
      const sp = target.subPart;
      const questionText = `${sp.label} ${sp.text || ''}`;

      // Build the source context for this specific question
      let contextForQuestion = '';
      if (useFullText) {
        contextForQuestion = combinedSourceText;
      } else {
        // Fallback: top 2-3 most relevant chunks
        const topChunks = getTopChunks(sp.text || '', 3);
        contextForQuestion = topChunks.map(c => c.text).join('\n\n---\n\n');
      }

      if (!contextForQuestion.trim()) {
        contextForQuestion = combinedSourceText.substring(0, 4000);
      }

      const systemPrompt = `You are an expert academic answer writer. Given source material from a syllabus, write a concise, accurate answer for an exam question grounded ONLY in the provided source text.

Output MUST be valid JSON with exactly this shape:
{
  "answer": "string — clear, structured answer text"
}

Rules:
1. Base the answer ONLY on the provided source text. Do not hallucinate outside information.
2. If the source text does NOT contain information to answer the question, respond with: {"answer": "__SOURCE_GAP__"}
3. Keep the answer length proportional to the marks (roughly 1-2 sentences per mark).
4. Use bullet points or numbered steps where appropriate.
5. Do NOT include markdown code fences. Return only raw JSON.`;

      const userPrompt = `SOURCE MATERIAL:\n${contextForQuestion.substring(0, 8000)}\n\nEXAM QUESTION (${sp.marks || 5} marks):\n${questionText}\n\nWrite the answer now as JSON. If the source material does not contain the answer, respond with {"answer": "__SOURCE_GAP__"}:`;

      try {
        const response = await axios.post(
          'https://api.inceptionlabs.ai/v1/chat/completions',
          {
            model: 'mercury-2',
            max_tokens: 1500,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ]
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKeyToUse}`,
              'Content-Type': 'application/json'
            },
            timeout: 60000
          }
        );

        let answerText = '';
        if (response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
          answerText = response.data.choices[0].message.content || '';
        } else if (response.data.content && response.data.content[0]) {
          answerText = response.data.content[0].text || '';
        } else {
          answerText = response.data.text || JSON.stringify(response.data);
        }

        if (!answerText || !answerText.trim()) {
          throw new Error('Empty AI response for answer generation.');
        }

        const parsed = repairJSON(answerText);
        const rawAnswer = parsed.answer || parsed[Object.keys(parsed)[0]] || '';

        // --- Graceful failure: check for source gap signal or empty answer ---
        let answer = '';
        if (!rawAnswer || rawAnswer === '__SOURCE_GAP__' || rawAnswer === 'Unable to generate answer.') {
          answer = "This question doesn't appear to be covered in the uploaded syllabus material — you may want to add more source content or revise the question.";
          console.warn(`[ANSWER-KEY SOURCE GAP] Paper: ${id} | Question: "${questionText}" | No covering source found in syllabus material.`);
        } else {
          answer = rawAnswer;
        }

        // Attach answer to the subPart — do NOT modify label, text, marks, co, bl, po, pi
        updatedParts[target.partIdx].questionSets[target.setIdx].questions[target.qIdx].subParts[target.spIdx].answer = answer;
      } catch (aiErr) {
        console.error(`[ANSWER-KEY ERROR] Paper: ${id} | subPart ${target.partIdx}-${target.setIdx}-${target.qIdx}-${target.spIdx} | Question: "${sp.text || ''}" | Error: ${aiErr.message}`);
        const gapAnswer = "This question doesn't appear to be covered in the uploaded syllabus material — you may want to add more source content or revise the question.";
        updatedParts[target.partIdx].questionSets[target.setIdx].questions[target.qIdx].subParts[target.spIdx].answer = gapAnswer;
      }
    }

    const updatedPaper = {
      ...paper,
      parts: updatedParts,
      updatedAt: new Date().toISOString()
    };

    // Save through existing dual-storage path
    try {
      const db = getDB();
      const papersCollection = db.collection('papers');
      await papersCollection.replaceOne(
        { paperId: id, teacherId: req.teacherId },
        updatedPaper,
        { upsert: true }
      );
    } catch (dbErr) {
      const papers = readPapers();
      const idx = papers.findIndex(p => (p.paperId === id || p.id === id) && p.teacherId === req.teacherId);
      if (idx !== -1) {
        papers[idx] = updatedPaper;
        writePapers(papers);
      }
    }

    res.json({ success: true, paper: updatedPaper });
  } catch (error) {
    console.error('Generate answers error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to generate answer key.' });
  }
});

// Initialize MongoDB and start server
async function startServer() {
  try {
    // Try to connect to MongoDB
    const dbConnection = await connectDB();
    if (dbConnection) {
      console.log('MongoDB connected successfully');
    } else {
      console.log('Using local JSON file as fallback storage.');
    }
  } catch (error) {
    console.warn('MongoDB connection failed. Using local JSON file fallback.');
    console.warn(error.message);
  }

  // Start the server
  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`AI Question Paper Generator Backend Server active`);
    console.log(`Port: ${PORT}`);
    console.log(`API URL: http://localhost:${PORT}`);
    console.log(`Local DB Path: ${DB_PATH}`);
    console.log(`=================================================`);
  });
}

startServer();