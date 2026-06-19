# AI Question Paper Generator

A full-stack web application for generating academic question papers using AI, specifically designed for **MVIT (Sir M. Visvesvaraya Institute of Technology)** faculty. Uses the Inception Labs AI API to generate structured question papers in the MVIT format with Bloom's Taxonomy mapping, CO/PO/PI tracking, syllabus-grounded answer key generation, and a full-featured paper editor.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 8 |
| Backend | Express 5 (ESM) |
| Database | MongoDB 7 (fallback: local JSON files) |
| Authentication | JWT + bcryptjs |
| AI Engine | Inception Labs API (`mercury-2` model) |
| PDF Parsing | pdf-parse (syllabus extraction) |
| File Upload | multer (memory storage) |
| File Export | jspdf + html2canvas |

---

## Complete Project Structure

```
AI_QUESTION_PAPER_GENRATOR/
├── package.json                  # Dependencies & scripts
├── index.html                    # Vite entry HTML
├── vite.config.js                # Vite configuration
├── server.js                     # Express backend (1330+ lines)
├── eslint.config.js              # ESLint config
├── .gitignore
│
├── db/
│   └── connection.js             # MongoDB connection + fallback logic
│
├── middleware/
│   └── authenticateToken.js      # JWT auth middleware + session revocation
│
├── routes/
│   └── authRoutes.js             # All auth/profile/account routes (1327 lines)
│
├── public/                       # Static assets (logos, icons, favicon)
│   ├── favicon.svg
│   ├── icons.svg
│   └── logo.png
│
├── src/                          # React frontend
│   ├── main.jsx                  # React entry point
│   ├── App.jsx                   # Router + AuthProvider wrapper
│   ├── App.css                   # App-level styles
│   ├── index.css                 # Global styles + CSS variables
│   ├── assets/                   # Static frontend assets
│   ├── components/
│   │   ├── Navbar.jsx            # Sidebar navigation (all pages)
│   │   └── ProtectedRoute.jsx    # Auth guard for private routes
│   ├── context/
│   │   └── AuthContext.jsx       # Global auth state (login, signup, 2FA, logout)
│   └── pages/
│       ├── LoginPage.jsx         # Login with 2FA support
│       ├── SignUpPage.jsx        # New teacher registration
│       ├── DashboardPage.jsx     # Paper generation + editor + history + settings
│       ├── AnswerKeyPage.jsx     # Dedicated answer key generation page
│       ├── ProfilePage.jsx       # Profile, 2FA, sessions, data export
│       └── NotFoundPage.jsx      # 404 handler
│
└── scratch/                      # Dev/test scripts (not part of production)
    ├── signup_test.js
    ├── verify_all.js
    └── verify_profile.js
```

### Local Fallback Storage

When MongoDB is unavailable, the app silently falls back to local JSON files stored at:

```
~/.gemini/antigravity/scratch/
├── auth_db.json   # Teachers/users data
└── papers_db.json # Generated question papers
```

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm
- MongoDB (optional — app works with local JSON fallback)
- Inception Labs API key (for AI paper generation)

### 1. Clone & Install

```bash
cd AI_QUESTION_PAPER_GENRATOR
npm install
```

### 2. Environment Variables

Create a `.env` file in the project root:

```env
# Server
PORT=5000

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRY=24h
BCRYPT_ROUNDS=10

# MongoDB (optional)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/question_paper_db
MONGODB_DB_NAME=question_paper_db

# AI API (required for paper generation)
INCEPTION_API_KEY=your_inception_labs_api_key
```

### 3. Run Development Server

```bash
npm run dev
```

This starts **both** the Vite frontend and Express backend concurrently using `concurrently`:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

### 4. Build for Production

```bash
npm run build        # Builds frontend with Vite
npm run server       # Runs backend only (serves static build)
```

---

## Application Pages & Features

### 1. Login Page (`/login`)
- Email/password authentication
- 2FA challenge flow (OTP displayed in console for development)
- Session-aware: revoked sessions are rejected

### 2. Sign Up Page (`/signup`)
- Teacher registration with auto-generated Teacher ID (MVIT-DEPT-NUMBER format)
- Name, email, department, password fields
- Auto-links to login after successful signup

### 3. Dashboard Page (`/dashboard`) — Core Workspace

The main workspace with four sub-views managed by a sidebar navigation:

#### a) **Create Paper** (default view)
- **Institutional Parameters form:**
  - Course Title, Course Code, Semester, Test Number (I/II)
  - Maximum Marks, Duration
  - Faculty Name, Course/Branch, Subject Category (PCC/IPCC)
  - Number of Parts, Questions per Part (OR sets)
- **Syllabus Content / Topics Blueprint** — textarea for syllabus content
- **Upload Syllabus PDF (optional)** — drag-and-drop PDF upload that auto-extracts text and populates the syllabus field using `POST /api/syllabus/upload`
- **CO Statements** — optional course outcome descriptions for footer
- **Bloom's Taxonomy Distribution sliders:**
  - Remember/Understand, Apply/Analyze, Evaluate/Create
  - Interactive SVG pie chart showing cognitive level breakdown
- **Generate Button** — triggers AI paper generation with immersive loader overlay
- **Important:** The syllabus text entered at creation time is now **persisted on the paper record** as `syllabusSourceText`, enabling auto-grounding in the Answer Key page

#### b) **Paper Editor** (opens automatically after generation)
- **Toolbar:** Edit | Preview | Export PDF | Save *(only these four buttons)*
- **Edit Mode:**
  - Paper metadata editor (subject, code, semester, marks, duration, etc.)
  - MVIT-format part editor with per-sub-part fields:
    - Question text (textarea), marks, CO, BL, PO, PI selectors
    - OR separator between alternative sets
  - Add/delete sections
  - Marks summary card with balance indicator
- **Preview Mode:**
  - Full A4-formatted MVIT question paper preview
  - College header, date boxes, USN boxes, subject code boxes
  - Question table with columns: Q.No | Question | Marks | CO | BL | PO | PI
  - OR separators between alternative question sets
  - CO statements footer
  - Verified by QPSC Member / Approved by HoD signature lines
- **Export PDF** — captures preview as high-resolution A4 PDF via html2canvas + jspdf

#### c) **Saved Papers**
- List of all previously generated papers with subject, code, semester, test, marks, duration
- **Open** — edit the paper in the editor
- **Preview** — open directly in preview mode
- **Delete** — remove paper (ownership verified)

#### d) **AI Configurations & Keys**
- Inception API Key input (saved to localStorage, overrides `.env` value)
- Model and endpoint display (mercury-2, fixed defaults)

### 4. Answer Key Page (`/answer-key`) — Dedicated Answer Key Generator

A standalone page for generating answer keys grounded in syllabus source material:

#### New: Auto-loaded Syllabus Source
- If a paper was created **after** the `syllabusSourceText` feature was implemented, the syllabus content is **automatically loaded** when the paper is selected — no re-upload required
- A green card displays: *"Using syllabus content from when this paper was created (X characters)"*
- The "Generate Answer Key" button becomes enabled immediately when source text is available

#### Legacy Upload (Backward Compatible)
- Papers created **before** this feature show the original PDF upload interface
- Text: *"This paper was created before syllabus auto-save was available. Please upload the syllabus PDF."*
- Uploaded PDF is chunked and sent as before

#### Optional Supplemental Upload
- When syllabus source is auto-loaded, an **optional** "Upload additional reference PDF" control is shown
- If a supplemental PDF is uploaded, its extracted text is **appended** to the saved source text for that generation run only
- The saved `syllabusSourceText` field is **never overwritten** by supplemental uploads

#### Generate Answer Key Button
- **Enabled** whenever ANY source text is available (saved syllabus, uploaded PDF, supplemental PDF, or combination)
- Shows contextual hints when conditions aren't met
- Loading spinner during generation
- Success notification with question count

#### Answer Key Output Display
- Structured Q&A list grouped by parts
- Each sub-part shows: question label, text, marks, and answer block
- **Successful answers** shown in gold-accented blocks
- **Source-gap answers** (question not found in syllabus) shown in amber/warning style with message: *"This question doesn't appear to be covered in the uploaded syllabus material — you may want to add more source content or revise the question."*
- Server-side `[ANSWER-KEY SOURCE GAP]` logs with paper ID and question text for coverage analysis

#### Export Answer Key as PDF
- Captures the answer key content as a standalone A4 PDF

### 5. Profile Page (`/profile`)
- View/edit profile fields (name, email, department)
- 2FA setup with OTP verification
- Active session management — view and revoke individual sessions
- Delete account with confirmation
- GDPR data export as ZIP file

---

## How It Works

### Authentication Flow

1. **Sign Up** → Creates a teacher account with a unique `MVIT-{DEPT}-{NUMBER}` Teacher ID
2. **Login** → JWT token issued (includes session IDs for revocation tracking)
3. **2FA (Optional)** → OTP sent to console (dev mode); can be email or SMS
4. **Session Management** → View active sessions, revoke individual or all others

### Paper Generation Flow

1. User enters subject details and syllabus content (or uploads a syllabus PDF)
2. User configures Bloom's Taxonomy breakdown
3. Backend sends a structured prompt to **Inception Labs AI API**
4. AI returns paper content as JSON; backend runs it through `repairJSON()` to handle malformed output
5. If AI fails entirely, a **fallback generator** creates a valid MVIT-format paper using templates
6. **The raw syllabus text is saved on the paper record** (`syllabusSourceText`) for downstream answer-key grounding
7. Paper is saved to MongoDB (or local JSON fallback) and opened in the editor

### Answer Key Generation Flow

1. User navigates to the **Answer Key** page from the sidebar
2. Selects a saved paper from the dropdown
3. **If the paper has `syllabusSourceText`:** the source is auto-loaded with a green indicator — no re-upload needed
4. **If the paper is older (pre-feature):** user uploads the syllabus PDF manually
5. Optionally, user can upload a supplemental PDF to add reference material for this generation run
6. "Generate Answer Key" button enables when ANY source text is available
7. Backend builds the **combined source text** (saved syllabus + optional supplement)
8. For each sub-part question, the backend:
   - **Default path** (≤12k chars): sends the **full source text** as context to the AI
   - **Fallback path** (>12k chars): selects the top 2-3 most relevant chunks via keyword overlap
9. AI answers grounded ONLY in the provided source material
10. If a question isn't covered in the source, a graceful warning message is shown instead of a broken answer
11. Server logs source coverage gaps for analytics

### Syllabus PDF Processing Flow

1. User uploads a PDF file via the file input
2. Backend parses the PDF using `pdf-parse` library
3. Text is extracted and intelligently chunked by topic headings
4. Code blocks and special sections are preserved
5. Large chunks are split into ~400-word pseudo-topics for better answer matching
6. Chunks are returned as `[{topic, text}]` array

---

## Paper Data Structure

Each paper contains MVIT-formatted parts with Bloom's Taxonomy mapping and syllabus source:

```json
{
  "subject": "Advanced Java",
  "subjectCode": "24MCA403",
  "semester": 2,
  "testNo": "TEST PAPER - I",
  "maxMarks": 25,
  "duration": 60,
  "facultyName": "Dr. Smith",
  "courseBranch": "MCA",
  "subjectCategory": "PCC",
  "coStatements": [...],
  "syllabusSourceText": "Module 1: OOP Concepts...",  // Raw syllabus text persisted for answer-key grounding
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
                {
                  "label": "a)",
                  "text": "Explain OOP concepts.",
                  "marks": 5,
                  "co": "CO1", "bl": "L2", "po": "PO1", "pi": "1.7.1",
                  "answer": "Object-Oriented Programming..."  // Populated by answer key generation
                },
                {
                  "label": "b)",
                  "text": "Describe inheritance types.",
                  "marks": 7,
                  "co": "CO1", "bl": "L3", "po": "PO1", "pi": "1.7.1",
                  "answer": "Inheritance allows a class..."
                }
              ]
            }
          ]
        },
        { "setNo": 2, "questions": [...] }  // OR alternative set
      ]
    }
  ]
}
```

---

## API Routes

### Auth Routes (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/signup` | No | Register new teacher |
| POST | `/login` | No | Login (returns JWT or 2FA challenge) |
| GET | `/validate` | Yes | Validate current JWT |
| GET | `/profile` | Yes | Get full profile + stats |
| PUT | `/profile` | Yes | Update profile fields |
| POST | `/change-password` | Yes | Change password |
| GET | `/activity` | Yes | Recent papers + login history |
| POST | `/verify-2fa` | No | Verify 2FA OTP |
| POST | `/profile/2fa/setup` | Yes | Initiate 2FA setup |
| POST | `/profile/2fa/verify` | Yes | Complete 2FA setup |
| POST | `/profile/2fa/disable` | Yes | Disable 2FA |
| POST | `/profile/revoke-session` | Yes | Revoke one session |
| POST | `/profile/revoke-other-sessions` | Yes | Revoke all except current |
| POST | `/profile/delete-account` | Yes | Delete account (GDPR) |
| GET | `/profile/export-data` | Yes | Export data as ZIP |

### Paper Routes (protected by `authenticateToken`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/papers` | List all papers for logged-in teacher |
| POST | `/api/save-paper` | Save/update a paper (upsert by paperId) |
| PUT | `/api/papers/:id` | Update specific paper |
| DELETE | `/api/papers/:id` | Delete paper (ownership verified) |
| GET | `/api/status` | Check if API key is configured |

### AI Generation Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate-paper` | Generate full paper via AI (with JSON repair + fallback). Persists `syllabusSourceText` on the paper. |
| POST | `/api/regenerate-question` | Regenerate a single sub-part question |

### Syllabus & Answer Key Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/syllabus/upload` | Upload and parse a syllabus PDF via multer; returns text chunks with topic labels |
| POST | `/api/papers/:id/generate-answers` | **Generate AI answers** for all sub-parts using full-context grounding. Accepts `syllabusSourceText`, `supplementalText`, or legacy `chunks` array. Returns paper with answers attached. |

---

## Key Backend Features

### `repairJSON()` (server.js)
A robust JSON repair utility that handles malformed AI output:
1. Strips markdown code fences
2. Finds outermost valid JSON boundary using bracket-depth tracking
3. Attempts direct parse
4. Removes trailing commas
5. Character-by-character state machine reconstruction
6. Final aggressive ASCII whitelist cleanup

### Dual Storage (MongoDB + Local JSON)
Every data operation tries MongoDB first, then falls back to local JSON files (`~/.gemini/antigravity/scratch/`). This allows the app to work without a database server.

### Syllabus Source Text Persistence
When a paper is generated via `POST /api/generate-paper`, the raw syllabus text (from the textarea or uploaded PDF) is saved as `syllabusSourceText` on the paper record. This enables the Answer Key page to auto-load the source and skip requiring a re-upload.

### Multer PDF Upload (server.js)
- Memory storage (no disk writes)
- 20MB file size limit
- PDF-only file filter
- Used by `/api/syllabus/upload` for syllabus processing

### Intelligent Syllabus Chunking
PDF text is split by:
1. **Heading detection** — short lines without ending punctuation become topic headers
2. **Code block preservation** — fenced code blocks (```) are kept intact
3. **Paragraph fallback** — single large chunks are split into ~400-word pseudo-topics

### Answer Generation with Full-Context Grounding
For each sub-part question, the backend:

1. **Builds combined source:** paper's saved `syllabusSourceText` + optional supplemental upload text
2. **Default strategy** (≤12k chars): sends the **full source text** as context for every question — no chunk picking
3. **Fallback strategy** (>12k chars): selects the **top 2-3 most relevant chunks** via keyword overlap (not just 1)
4. Prompts the AI: *"Given this full source material: <text> ... answer this question grounded in the source above"*
5. If the AI signals `__SOURCE_GAP__` or returns empty, a graceful warning replaces the expected answer
6. **Graceful failure message:** *"This question doesn't appear to be covered in the uploaded syllabus material — you may want to add more source content or revise the question."*
7. **Server-side logging:** `[ANSWER-KEY SOURCE GAP]` warnings include the paper ID and question text for easy coverage analysis
8. Falls back gracefully if AI call fails entirely

### Zero-Dependency ZIP Generator (authRoutes.js)
A custom ZIP file compiler written from scratch using only Node.js `Buffer` operations. Used for GDPR-compliant data export.

### Session Revocation System
JWT tokens include a `sessionId`. On each request, the middleware checks if that session ID still exists in the teacher's `sessions` array. Revoked sessions are immediately invalidated.

---

## Frontend Routes

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Redirect | Sends to `/login` |
| `/login` | LoginPage | Email/password login with 2FA support |
| `/signup` | SignUpPage | New teacher registration |
| `/dashboard` | DashboardPage | Create, view, edit, download papers |
| `/answer-key` | AnswerKeyPage | Generate and export answer keys |
| `/profile` | ProfilePage | Profile editing, 2FA setup, session management, data export |
| `*` | NotFoundPage | 404 handler |

### Sidebar Navigation

| Nav Item | Icon | Action |
|----------|------|--------|
| Create Paper | BookOpen | Switches to Create view (Dashboard) |
| Editing Paper | BookOpen | Shown only when a paper is being edited |
| Saved Papers | History | Switches to Saved Papers view |
| **Answer Key** | Layers | **Navigates to `/answer-key` page** |
| AI Configurations | Settings | Switches to Settings view |
| My Profile | User | Navigates to `/profile` |
| Logout | LogOut | Logs out and redirects to `/login` |

---

## Scripts

```bash
npm run dev        # Start frontend + backend concurrently
npm run server     # Start backend only
npm run build      # Build frontend for production
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5000` | Backend server port |
| `JWT_SECRET` | Yes | — | Secret key for signing JWTs |
| `JWT_EXPIRY` | No | `24h` | Token expiration duration |
| `BCRYPT_ROUNDS` | No | `10` | bcrypt work factor |
| `MONGODB_URI` | No | — | MongoDB connection string |
| `MONGODB_DB_NAME` | No | `question_paper_db` | Database name |
| `INCEPTION_API_KEY` | Yes (for AI) | — | Inception Labs API key |

---

## Development Notes

- **Backend uses ES modules** (`type: "module"` in package.json)
- **Frontend uses React Router v7** with protected routes
- **AI model**: `mercury-2` via Inception Labs API
- **Tests**: Scratch scripts in `scratch/` directory for manual testing
- **No real email/SMS**: 2FA OTPs are logged to console in development
- **PDF parsing**: Uses `pdf-parse` for extraction; works best with text-based PDFs (not scanned images)
- **Answer key quality**: Depends on the syllabus source — papers created with detailed syllabus text produce the best answers. Papers created before the `syllabusSourceText` feature still work by re-uploading the syllabus PDF
- **Source gap detection**: Answers that can't be grounded in the syllabus show a distinct warning message and are logged server-side for coverage analysis
- **Syllabus source text is read-only**: The `syllabusSourceText` field is never overwritten by answer key generation or optional PDF uploads

---

## License

Private project — Sir M. Visvesvaraya Institute of Technology