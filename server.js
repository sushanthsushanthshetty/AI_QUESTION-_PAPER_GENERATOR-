import express from 'express';
import cors from 'cors';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import dns from 'dns';
import { connectDB, getDB } from './db/connection.js';
import { authenticateToken } from './middleware/authenticateToken.js';
import authRoutes from './routes/authRoutes.js';

// Force IPv4 DNS resolution first to fix MongoDB SRV DNS lookup issues
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

const PORT = process.env.PORT || 5000;
const INCEPTION_API_KEY = process.env.INCEPTION_API_KEY || '';

// Local JSON file path as fallback
const DB_PATH = 'C:\\Users\\Admin\\.gemini\\antigravity\\scratch\\papers_db.json';

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
      const index = papers.findIndex(p => p.id === paperId);
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
    
    try {
      const db = getDB();
      const papersCollection = db.collection('papers');
      
      // Only delete if teacherId matches (ownership check)
      const result = await papersCollection.deleteOne({ 
        paperId: id, 
        teacherId: req.teacherId 
      });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, error: 'Paper not found or access denied' });
      }
      
      res.json({ success: true });
    } catch (dbError) {
      // Fallback to local JSON
      const papers = readPapers();
      const filtered = papers.filter(p => p.id !== id);
      writePapers(filtered);
      res.json({ success: true });
    }
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
  try {
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
    } = req.body;

    const apiKeyToUse = clientApiKey || INCEPTION_API_KEY;

    if (!apiKeyToUse) {
      return res.status(400).json({
        success: false,
        error: 'API Key is missing. Please configure the INCEPTION_API_KEY in the .env file or input it in the application Settings.'
      });
    }

    const partsCount  = numParts  || 2;
    const qtyPerPart  = questionsPerPart || 1;

    const systemPrompt = `You are an expert academic evaluator, course coordinator, and curriculum designer for an Indian engineering college (VGEC-compliant).
Your objective is to generate a complete academic question paper in **MVIT Test Paper Format (Format 1)**.
The paper must include official institutional headers, info-grid, BLS legend, a question table with CO/BL/PO/PI tracking columns, and a formal footer.
The output MUST be a valid JSON object matching the JSON schema below. DO NOT output any markdown blocks, explanations, backticks, or intro texts outside the JSON. Return only the raw JSON.

JSON SCHEMA:
{
  "subject": "String (Subject Name, e.g. Operating Systems)",
  "subjectCode": "String (e.g. 21CS61)",
  "semester": Number,
  "testNo": "String (e.g. TEST PAPER - I, TEST PAPER - II)",
  "maxMarks": Number,
  "duration": Number (in minutes),
  "facultyName": "String (e.g. Dr. Ramesh Kumar)",
  "courseBranch": "String (e.g. MCA)",
  "subjectCategory": "String (either PCC or IPCC)",
  "parts": [
    {
      "partNo": Number (1-based: 1 = Part A, 2 = Part B, …),
      "partTitle": "String (e.g. PART A, PART B)",
      "questionSets": [
        {
          "setNo": Number (1-based set index within the part)",
          "questions": [
            {
              "qNo": "String (e.g. 1, 2, ...)",
              "subParts": [
                { "label": "a)", "text": "String (sub-question text)", "marks": Number }
              ],
              "co":  "String (Course Outcome, e.g. CO1, CO2, CO3, CO4)",
              "bl":  "String (Bloom's Level, e.g. L1, L2, L3, L4, L5, L6)",
              "po":  "String (Program Outcome, e.g. PO1, PO2, PO3, PO4)",
              "pi":  "String (Performance Indicator, e.g. 1.7.1, 2.6.3)"
            }
          ]
        }
      ]
    }
  ]
}

STRICT GUIDELINES:
1. Generate exactly ${partsCount} PARTS (PART A, PART B, ...). Each part must have exactly ${qtyPerPart} question SET — labelled "Set 1" and "Set 2" featuring an OR mark (the AI adds the word "OR" between the sets).
2. Each question SET has exactly 1 question number with 2 sub-parts: a) and b). The OR separator sits BETWEEN the two sets in the same part.
3. Bloom Distribution must respect: Remember/Understand ${bloomBreakdown.rememberUnderstand || 40}%, Apply/Analyze ${bloomBreakdown.applyAnalyze || 40}%, Evaluate/Create ${bloomBreakdown.evaluateCreate || 20}%.
4. Total marks of every question across ALL parts MUST equal exactly ${maxMarks} marks.
5. CO values range from CO1 to CO4. BL goes from L1 (Remembering) to L6 (Creating). PO goes from PO1 to PO4. PI values look like "1.7.1", "2.6.3".
6. Subject Category must be "PCC" unless the caller says IPCC.`;

    const userPrompt = `Generate a question paper in strict MVIT test-paper format.

INstitutional DETAILS:
- Subject:        ${subject}
- Subject Code:   ${subjectCode}
- Semester:       ${semester}
- Test Number:    ${testNo}
- Total Marks:    ${maxMarks}
- Duration:       ${duration} minutes
- Faculty Name:   ${facultyName || '(name to be filled)'}
- Course/Branch:  ${courseBranch || 'MCA'}
- Subject Category: ${subjectCategory || 'PCC'}
- Number of Parts: ${partsCount}
- Questions per Part: ${qtyPerPart} question-set with OR

SYLLABUS CONTENT:
"${syllabus}"

Return the full MVIT-format paper as raw JSON only.`;

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
    console.error('Error generating question paper:', error.message);
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