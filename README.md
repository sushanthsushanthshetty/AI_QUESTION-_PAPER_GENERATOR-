# AI Question Paper Generator

An intelligent academic question paper generator powered by the **Inception AI API** (`mercury-2` model). Generates structured, Bloom's Taxonomy-aligned exam papers from syllabus content with a full-featured editor for customisation.

Built for **Sir M. Visvesvaraya Institute of Technology (MVIT)**, Department of Computer Science & Engineering.

---

## 🚀 Features — Complete Module Overview

### 📝 Module 1: User Authentication (`AuthContext.jsx` + `authRoutes.js` + `authenticateToken.js`)
- **Sign Up** — Register with email, first name, last name, department, and password. Auto-generates a unique Teacher ID (`MVIT-DEPT-######` format).
- **Login** — Authenticate with email/password. Passwords verified using bcryptjs (10-12 salt rounds).
- **JWT Token** — On successful login/signup, a JWT token (configurable expiry, default 24h) is returned and stored in `localStorage` under the key `jwtToken`.
- **Token Validation** — On app load, the stored JWT is validated via `GET /api/auth/validate`. If invalid/expired, token is cleared and user redirected to login.
- **Profile Fetch** — `GET /api/auth/profile` returns the full teacher profile (sans password).
- **Logout** — Clears JWT and API key from `localStorage`, resets auth state.
- **Protected Routes** — `ProtectedRoute` component guards dashboard pages; unauthenticated users are redirected to `/login`.
- **Dual Storage** — User accounts stored in MongoDB (`teachers` collection) or locally in `auth_db.json` as fallback.

### 📄 Module 2: Paper Generation — Create Page (`DashboardPage.jsx` — Create View)
- **Institutional Parameters Form** — Input fields for:
  - Course Title, Course Code, Semester (1-8), Test Number (I/II)
  - Maximum Marks, Duration (minutes)
  - Faculty Name, Course/Branch (e.g., MCA), Subject Category (PCC/IPCC)
  - Number of Parts (1-4), Questions per Part / OR sets (1-3)
  - Syllabus Content / Topics Blueprint (textarea for AI context)
  - CO Statements (optional, for footer)
- **Bloom's Taxonomy Distribution** — Three interactive sliders for:
  - **Remember/Understand** (L1-L2)
  - **Apply/Analyze** (L3-L4)
  - **Evaluate/Create** (L5-L6)
  - Sliders auto-adjust to keep total at 100% — moving one rebalances the other two proportionally.
- **Visual Pie Chart** — Live SVG donut chart displaying the cognitive level distribution with color-coded legend.
- **Marks Audit** — Real-time validation comparing section totals against configured maximum marks. Generation is blocked on mismatch.
- **AI Generation** — Click "Generate Question Paper" to send a POST request to `/api/generate-paper` with all parameters.
- **Backend Prompt Engineering** — The server constructs a detailed system prompt with role definition, exact JSON schema, Bloom's weight requirements, section structure constraints, and marks consistency rules.
- **AI Response Parsing** — A 7-tier `repairJSON()` utility handles AI responses:
  1. Direct JSON parse
  2. Regex trailing comma removal
  3. Character-by-character state machine reconstruction (handles unescaped quotes, newlines in strings, etc.)
  4. Aggressive ASCII-whitelist cleanup
- **Immersive AI Loader** — Animated book-flip loader with:
  - Rotating academic quotes (6 curated quotes from B.B. King, Einstein, Krishnamurti, etc.)
  - Live progress bar with random increment simulation
  - "Cognitive Syllabus Scanner" branding
- **Fallback Paper Generation** — If the AI API fails, `generateFallbackPaper()` creates a valid MVIT-format paper locally using 5 question templates with syllabus-derived topics, distributing marks across parts and assigning CO/BL/PO/PI values.
- **Auto-Save** — Generated papers are automatically saved to the database on success.
- **Legacy Section Support** — Backward-compatible with older saved papers using the `sections[]` format.

### ✏️ Module 3: Paper Editor (`DashboardPage.jsx` — Editor View)
- **Paper Metadata Editing** — Inline edit fields for:
  - Subject Name, Subject Code, Semester, Course/Branch
  - Faculty Name, Subject Category (PCC/IPCC dropdown)
  - Test Number (I/II dropdown), Max Marks, Duration
  - CO Statements (raw textarea for footer)
- **MVIT-Format Editor** — Full editing of the `parts[]` structure:
  - **Part Headers** — Display part title (Part A, Part B, etc.) with mark weight summary.
  - **Question Sets** — Each part contains 1+ question sets (OR alternatives). Sets displayed with an "OR" separator between them.
  - **Per Sub-Part Fields** — Each sub-part (`a)`, `b)`) has editable fields:
    - **Question Text** — Textarea for the sub-question content
    - **Marks** — Number input for individual mark weight
    - **CO** — Dropdown (CO1-CO4) for Course Outcome
    - **BL** — Dropdown (L1-L6) for Bloom's Taxonomy Level
    - **PO** — Dropdown (PO1-PO4) for Program Outcome
    - **PI** — Text input for Performance Indicator (e.g., 1.7.1)
  - **Immutable Update Helpers** — `_updateSubPart()`, `_updateQuestionMeta()`, `_replacePart()`, `_replaceQuestionsInSet()` ensure state integrity.
- **Add/Delete Sections** — Buttons to add new sections or delete existing ones.
- **Add/Delete/Reorder Questions** — Within each section, questions can be added, deleted, or moved up/down.
- **Legacy Section Editor** — Backward-compatible renderer for older saved papers.
- **Marks Summary Bar** — Displays total calculated marks vs configured max marks with balance status (✓ balanced / ⚠ mismatch).
- **Single Question Inline Editing** — Click to edit individual question text, marks, and MCQ options directly.
- **Single Question AI Regeneration** — Regenerate individual questions:
  - Sends `POST /api/regenerate-question` with syllabus context, original text, cognitive level, marks, and type.
  - On API failure, falls back to a simulated replacement from 5 predefined academic questions.
- **Edit/Preview Mode Toggle** — Switch between form editing and A4 preview with dedicated buttons.
- **Save & Export** — Save changes to database or export as PDF.

### 👁️ Module 4: Paper Preview (`MVITPaperPreview` Component)
- **Printable A4 Format** — Rendered as a 210mm × 297mm printable page with:
  - **Date Boxes** — Day | Month | Year in individual bordered boxes
  - **Subject Code Boxes** — Each character in an individual bordered box
  - **Logo** — MVIT/SVIT logo image in the header
  - **USN Boxes** — Pre-filled "1 | M | V" + 8 empty boxes for student USN
- **College Header** — "Sir M. Visvesvaraya Institute of Technology, Bengaluru-562 157"
- **Test Title** — Bold centered test number with top/bottom border
- **Information Table** — Colon-format table with:
  - TEST NO, COURSE/BRANCH, SUBJECT, SUBJECT CATEGORY(IPCC/PCC)
  - SEMESTER, MAX. MARKS, DURATION, FACULTY NAME
- **Instructions** — "Answer any one Question from each Part"
- **Bloom's Taxonomy Legend** — Underline-styled key for BL, CO, PO, PI abbreviations
- **Question Table** — Professional table with columns:
  - Q.No | Question | Marks | CO | BL | PO | PI
  - Sub-parts displayed as rows with row-span for question numbers
- **OR Separators** — "─── OR ───" between alternative question sets within each part
- **CO Statements Footer** — Auto-generated from paper data or raw text input
- **Signature Lines** — "Verified by QPSC Member" and "Approved by HoD" with signature lines and department details

### 💾 Module 5: Data Storage & Persistence
- **Dual Storage Architecture** — MongoDB + local JSON file fallback for both auth and papers:
  - **MongoDB** — Primary storage for user accounts (`teachers` collection) and papers (`papers` collection)
  - **Local JSON** — Automatic fallback stored at:
    - Papers: `C:\Users\Admin\.gemini\antigravity\scratch\papers_db.json`
    - Auth: `.gemini\antigravity\scratch\auth_db.json`
  - **Browser localStorage** — JWT token (`jwtToken`) and API key (`inception_api_key`)
- **Paper Operations**:
  - **Save/Upsert** — `POST /api/save-paper` with upsert by `paperId`
  - **Read** — `GET /api/papers` returns all papers for authenticated user, sorted by creation date
  - **Update** — `PUT /api/papers/:id` with ownership check
  - **Delete** — `DELETE /api/papers/:id` with ownership verification
- **Ownership Enforcement** — All paper operations filter/save per `teacherId` extracted from JWT
- **Paper IDs** — Generated as `paper-{timestamp}-{random}` format

### 📜 Module 6: History & Saved Papers (`DashboardPage.jsx` — History View)
- **Archive List** — Displays all saved papers with:
  - Subject name and code
  - Semester, test number, marks, duration
  - Creation timestamp
- **Actions Per Paper**:
  - **Open** — Opens paper in the editor for modification
  - **Preview** — Opens paper directly in preview mode
  - **Delete** — Permanently removes paper with confirmation
- **Empty State** — Friendly message with icon when no saved papers exist
- **Real-Time Refresh** — Paper list refreshes after save/delete operations

### 📥 Module 7: PDF Export
- **html2canvas** — Captures the preview DOM as a canvas image at 2x scale with CORS support
- **jsPDF** — Generates a professional A4 PDF (210mm × 297mm):
  - Auto-scales content to fit a single page if overflow occurs
  - Calculates aspect-ratio-preserved dimensions
- **Dual Mode Export** — Works from both Edit and Preview modes (auto-switches to Preview before capture)
- **File Naming** — PDF saved as `{SubjectCode}_{TestNo}_Paper.pdf`
- **Temporary UI Hiding** — Action bubbles/buttons are hidden during capture for clean output

### ⚙️ Module 8: Settings (`DashboardPage.jsx` — Settings View)
- **API Key Configuration** — Password-input field for Inception API key:
  - Overrides the `.env` `INCEPTION_API_KEY` value
  - Stored securely in `localStorage`
  - Save and Clear buttons with success notifications
- **Model Information** — Read-only display of:
  - Primary Inception Model: `mercury-2`
  - API Endpoint: `https://api.inceptionlabs.ai/v1`
- **Server Status** — `GET /api/status` endpoint checks if server-side API key is configured

### 🧭 Module 9: Navigation & UI (`Navbar.jsx` + `App.jsx`)
- **Sidebar Navigation** — Fixed sidebar with:
  - Logo badge ("QP") and branding ("MVIT Generator — Academic Rigor AI")
  - User avatar (initials) and info display (name, teacher ID)
  - Nav items: Create Paper, Editing Paper (conditional), Saved Papers, AI Configurations
  - Logout button with icon
  - API status indicator (green dot)
  - Version footer ("v1.0")
- **Routing** — React Router with routes:
  - `/login` — Login page
  - `/signup` — Registration page
  - `/dashboard` — Main application (protected)
  - `/` — Redirects to `/dashboard`
  - `*` — 404 Not Found page
- **Protected Routes** — `ProtectedRoute` component with loading spinner during token validation
- **Global Notifications** — Alert (red) and Success (green) toast messages with icons

### 🛡️ Module 10: Security
- **Password Hashing** — bcryptjs with configurable salt rounds (default 10-12)
- **JWT Authentication** — Tokens with configurable expiry (default 24h), signed with secret from `.env`
- **Authorization Headers** — All API requests (except auth endpoints) include `Authorization: Bearer <token>`
- **Ownership Enforcement** — Papers filtered, updated, and deleted per authenticated `teacherId`
- **Input Validation** — Auth routes validate required fields, password length (min 6 chars), and duplicate email checks
- **DNS Fix** — IPv4-first DNS resolution for reliable MongoDB SRV lookups

### 🔄 Module 11: API Endpoints (Complete List)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth/signup` | POST | No | Register a new teacher account |
| `/api/auth/login` | POST | No | Log in and receive JWT token |
| `/api/auth/validate` | GET | Yes | Validate JWT token and return user profile |
| `/api/auth/profile` | GET | Yes | Get full teacher profile (without password) |
| `/api/papers` | GET | Yes | Retrieve all saved papers for the authenticated user |
| `/api/status` | GET | No | Check if the server-side API key is configured |
| `/api/save-paper` | POST | Yes | Save or update a paper (upsert by paperId) |
| `/api/papers/:id` | DELETE | Yes | Delete a paper by its ID (ownership check) |
| `/api/papers/:id` | PUT | Yes | Update an existing paper (ownership check) |
| `/api/generate-paper` | POST | Yes | Generate a full question paper using Inception AI API |
| `/api/regenerate-question` | POST | Yes | Regenerate a single question using Inception AI API |

---

## 🛠️ Complete Tech Stack

### Runtime & Language
| Technology | Purpose |
|------------|---------|
| **Node.js** | JavaScript runtime (v18+, tested with v24.15.0) |
| **ES Modules** | `"type": "module"` in package.json for native ESM |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | ^19.2.6 | UI framework with hooks (`useState`, `useEffect`, `createContext`, `useContext`) |
| **React DOM** | ^19.2.6 | React rendering for the browser |
| **React Router DOM** | ^7.15.1 | Client-side routing with protected routes, navigation, and redirects |
| **Vite** | ^8.x (estimated) | Build tool and dev server with HMR and API proxy configuration |
| **@vitejs/plugin-react** | — | Vite plugin for React JSX transform and Fast Refresh |
| **Lucide React** | ^1.16.0 | Icon library (26+ icons: BookOpen, FileText, Settings, Download, RefreshCw, Plus, Trash2, History, CheckCircle, AlertTriangle, ArrowUp/Down, Edit3, Save, Sparkles, Layers, Clock, Award, Eye, ArrowLeft, X, Copy, Check, LogOut, User) |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Express** | ^5.2.1 | Web server framework with JSON body parsing (10mb limit) and CORS |
| **Axios** | ^1.16.1 | HTTP client for Inception AI API calls (90s timeout for generation, 60s for single-question) |
| **CORS** | ^2.8.6 | Cross-origin resource sharing middleware |
| **dotenv** | ^17.4.2 | Environment variable management (.env file loading) |
| **jsonwebtoken** | ^9.0.3 | JWT token creation and verification for authentication |
| **bcryptjs** | ^3.0.3 | Password hashing and verification (10-12 salt rounds) |
| **MongoDB Driver** | ^7.2.0 | Native MongoDB connection with indexed collections and SRV DNS resolution |
| **dns** | (built-in) | IPv4 DNS resolution fix for MongoDB SRV lookups (`dns.setDefaultResultOrder('ipv4first')`) |

### PDF Export
| Technology | Version | Purpose |
|------------|---------|---------|
| **html2canvas** | ^1.4.1 | Captures DOM elements as canvas images (2x scale, CORS support) |
| **jsPDF** | ^4.2.1 | Generates A4 PDF documents (210mm × 297mm) with multi-page auto-scaling |

### AI / Machine Learning
| Technology | Purpose |
|------------|---------|
| **Inception Labs API** | AI text generation endpoint (`https://api.inceptionlabs.ai/v1/chat/completions`) |
| **Model: mercury-2** | Primary AI model for question paper generation (4000 max tokens) |
| **Bearer Token Auth** | API authentication via `INCEPTION_API_KEY` env var or client-provided key |

### Data Persistence
| Technology | Purpose |
|------------|---------|
| **MongoDB** | Primary database for user accounts (`teachers`) and papers (`papers`) with optional connection |
| **File-based JSON** | Automatic fallback storage in `.gemini\antigravity\scratch\` directory |
| **Browser localStorage** | Client-side storage for JWT token and API key caching |

### Development & Build Tools
| Technology | Purpose |
|------------|---------|
| **concurrently** | ^9.2.1 | Runs frontend (Vite) and backend (Express) simultaneously via `npm run dev` |
| **ESLint** | — | Code linting with Flat config (`eslint.config.js`) |

### Infrastructure & DevOps
| Technology | Purpose |
|------------|---------|
| **git** | Version control with `.gitignore` |
| **npm** | Package management with `package-lock.json` |

---

## 📋 Prerequisites

- **Node.js** v18+ (tested with v24.15.0)
- **Inception API Key** — Get one from [Inception Labs](https://www.inceptionlabs.ai/)

---

## ⚙️ Setup & Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd AI_QUESTION_PAPER_GENRATOR
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the Environment

Edit the `.env` file in the project root:

```env
# Inception API Configurations
INCEPTION_API_KEY=your_api_key_here

# Backend Server Config
PORT=5000

# MongoDB Configuration (optional — falls back to local JSON if unavailable)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/question_paper_db?retryWrites=true&w=majority
MONGODB_DB_NAME=question_paper_db

# JWT & Security
JWT_SECRET=your_jwt_secret_key_min_32_chars
JWT_EXPIRY=24h
BCRYPT_ROUNDS=10
```

> ⚠️ **Important**: Replace `your_api_key_here` with your actual Inception API key.
> The `.env` file comes with a demo key that may have limited or no quota — use your own for production.
> JWT_SECRET is required for authentication. MongoDB connection is optional — the app falls back to local JSON storage.

You can also set/override the API key from the **Settings** page inside the app UI, which stores it in `localStorage` and sends it to the backend as `clientApiKey`.

---

## 🏃 Running the Project

### Option 1: Using npm (recommended)

```bash
npm run dev
```

This runs both the **backend** (Express on port 5000) and **frontend** (Vite on port 3000) concurrently using the `concurrently` package.

### Option 2: Run separately

**Backend:**
```bash
node server.js
```
The server starts at `http://localhost:5000`.

**Frontend:**
```bash
npx vite --port 3000
```
The frontend starts at `http://localhost:3000`.

---

## 🌐 Access the Application

Open your browser and navigate to: **http://localhost:3000**

---

## 📖 How to Use

### Step 1: Sign Up / Login
- When you first open the app, you'll see the **Login** page.
- Click **"Create a new account"** to sign up with your email, name, department, and password.
- After signing up, you're automatically logged in with a JWT token.
- On subsequent visits, log in with your email and password.

### Step 2: Configure Parameters
- Enter the **Course Title**, **Course Code**, **Semester**, and **Evaluation Cycle** (e.g. "Internal Assessment I").
- Set **Maximum Marks** and **Duration** (minutes).
- Fill in **Faculty Name**, **Course/Branch**, and **Subject Category** (PCC/IPCC).
- Configure **Number of Parts** and **Questions per Part** (OR sets).
- Paste or type the **Syllabus Content** in the text area — this is what the AI uses to generate relevant questions.
- Optionally enter **CO Statements** for the paper footer.

### Step 3: Set Cognitive Distribution
- Use the 3 interactive sliders to balance **Remember/Understand**, **Apply/Analyze**, and **Evaluate/Create** (Bloom's Taxonomy levels).
- The sliders auto-adjust as you move them to keep the total at 100%.
- A live SVG donut chart visualises the distribution.

### Step 4: Generate
- Click **"Generate Question Paper"** — the app sends a POST request to `/api/generate-paper` on your backend.
- The backend constructs a detailed system prompt with the syllabus, Bloom's weights, and section schema, then calls the Inception AI API (`mercury-2` model).
- An immersive loader with a book-flip animation, rotating academic quotes, and a progress bar appears.
- On success, the paper is auto-saved to the local database and the **Paper Editor** opens automatically.
- If the AI API fails, a fallback paper generator creates a valid MVIT-format paper locally.

### Step 5: Edit & Preview
- In **Edit mode**, modify any field:
  - **Paper Metadata**: subject name, code, semester, branch, faculty, category, test type, marks, duration
  - **Part Structure**: Part titles, question sets with OR alternatives
  - **Per Sub-Part Fields**: Question text, marks, CO, BL, PO, PI (all individually editable)
  - **Add/Delete Sections & Questions**
  - **Reorder Questions**
  - **Single Question AI Regeneration** — Regenerate individual questions with one click
- Switch to **Preview** to see the printable A4 format with:
  - University header: "SIR M. VISVESVARAYA INSTITUTE OF TECHNOLOGY"
  - Department header, test title, course info, duration, and max marks
  - General instructions and Bloom's Taxonomy legend
  - Professional 7-column question table (Q.No, Question, Marks, CO, BL, PO, PI)
  - OR separators between alternative sets
  - CO Statements footer and signature lines (QPSC Member + HoD)
- Click **Save** to persist changes, or **Export PDF** to download as a professional PDF.

### Step 6: History
- Navigate to **Saved Papers** from the sidebar.
- Each entry shows: subject code, subject name, test type, semester, marks, duration, and creation timestamp.
- Click **Edit** to reopen any saved paper in the editor.
- Click **Preview** for direct A4 preview.
- Click the trash icon to delete a paper permanently.

### Step 7: Settings
- **API Key**: Enter a custom Inception API key that overrides the `.env` value (stored in `localStorage`).
- **Model Info**: Displays the active model (`mercury-2`) and API endpoint (`https://api.inceptionlabs.ai/v1`) as read-only.

---

## 🔄 Single Question Regeneration

While viewing a generated paper:
1. Click the **regenerate** button on any question (identified by its section/question index).
2. The app sends a POST request to `/api/regenerate-question` with the syllabus context, original question, cognitive level, marks, and question type.
3. The AI generates a single replacement question.
4. If the API call fails, a simulated fallback randomly selects from a set of predefined academic questions.

---

## 💾 Data Storage

### 1. User Accounts → MongoDB / JSON File

User accounts are stored in a MongoDB collection (`teachers`) or locally in `auth_db.json`:

```
Path: .gemini/antigravity/scratch/auth_db.json
```

| Operation | MongoDB | JSON Fallback |
|-----------|---------|---------------|
| Sign Up | `db.collection('teachers').insertOne(teacherDoc)` | `readTeachers() → push → writeTeachers()` |
| Login | `findOne({ email })` | `find(t => t.email === email)` |
| Token Validation | JWT decode (no DB needed) | JWT decode (no DB needed) |
| Profile Fetch | `findOne({ teacherId })` with password projection | `find(t => t.teacherId === req.teacherId)` |

**Teacher ID Format:** `MVIT-{DeptCode}-{6-digit sequential number}` (e.g., `MVIT-CS-000001`)

### 2. Generated Papers → Local JSON Database

All saved question papers are stored in:

```
Path: C:\Users\Admin\.gemini\antigravity\scratch\papers_db.json
```

**How it works:**

| Step | What Happens |
|------|-------------|
| **Save** | `POST /api/save-paper` → upsert by `paperId` |
| **Read** | `GET /api/papers` → reads file, parses JSON, returns array |
| **Update** | `PUT /api/papers/:id` → ownership check, replaces document |
| **Delete** | `DELETE /api/papers/:id` → ownership check, filters out that paper |
| **Format** | JSON array with 2-space indent pretty-printing |

**Paper Structure (MVIT format with parts[]):**
```json
{
  "paperId": "paper-1716281234567",
  "subject": "Machine Learning",
  "subjectCode": "21CS61",
  "semester": 6,
  "testNo": "TEST PAPER - I",
  "maxMarks": 50,
  "duration": 90,
  "facultyName": "Dr. Ramesh Kumar",
  "courseBranch": "MCA",
  "subjectCategory": "PCC",
  "teacherId": "MVIT-CS-000001",
  "coStatements": [
    {"co": "CO1", "description": "Understand ML fundamentals"},
    {"co": "CO2", "description": "Analyze supervised learning algorithms"}
  ],
  "parts": [
    {
      "partNo": 1,
      "partTitle": "PART A",
      "questionSets": [
        {
          "setNo": 1,
          "questions": [{
            "qNo": "1",
            "subParts": [
              {"label": "a)", "text": "Explain...", "marks": 5, "co": "CO1", "bl": "L2", "po": "PO1", "pi": "1.7.1"},
              {"label": "b)", "text": "Describe...", "marks": 7, "co": "CO1", "bl": "L3", "po": "PO1", "pi": "1.7.1"}
            ]
          }]
        }
      ]
    }
  ],
  "createdAt": "2026-05-22T15:30:00.000Z",
  "updatedAt": "2026-05-22T15:30:00.000Z"
}
```

### 3. API Key → Browser localStorage

| Key | Purpose |
|-----|---------|
| `inception_api_key` | Overrides `.env` API key for generation requests |
| `jwtToken` | JWT authentication token for API calls |

### 4. What is NOT stored

| Data | Reason |
|------|--------|
| Syllabus content | Only used as context for the AI prompt |
| Bloom's distribution | Resets to defaults (40/40/20) on page refresh |
| Section configuration | Resets to default layout on refresh |

---

## 🧠 Technical Architecture

```
┌───────────────────────┐      ┌──────────────────────┐      ┌──────────────────┐
│   Frontend (React 19) │─────▶│   Backend (Express 5) │─────▶│  Inception AI    │
│   Vite Dev Server     │      │   Port: 5000          │      │  mercury-2 API   │
│   Port: 3000          │      └──────────┬───────────┘      └──────────────────┘
└──────────┬────────────┘                 │
           │                              │
           ▼                              ▼
    localStorage                    Local JSON DB
    (JWT token, API key)            (papers_db.json, auth_db.json)
                                    MongoDB (optional, for auth & papers)
```

### Architecture Highlights

- **Dual Storage Layer** — MongoDB as primary with transparent JSON file fallback; no configuration needed to switch.
- **AI Response Repair Pipeline** — 7-tier JSON repair utility handles malformed AI output gracefully.
- **Immutable State Updates** — Editor uses pure update helpers (`_updateSubPart`, `_updateQuestionMeta`, etc.) to maintain React state integrity.
- **Ownership-Based Access** — Every paper operation is scoped to the authenticated teacher's ID.
- **Fallback Chain** — AI generation → fallback template → graceful error, ensuring the app never crashes on API failure.

---

## 📄 Complete File Structure

```
├── .env                        # API keys, MongoDB URI, JWT secret
├── .gitignore                  # Git ignore rules
├── eslint.config.js            # ESLint flat configuration
├── index.html                  # Vite HTML entry point
├── package.json                # Dependencies, scripts
├── package-lock.json           # Dependency lockfile
├── README.md                   # This file
├── server.js                   # Express backend server (810 lines — API endpoints, JSON repair, fallback generator)
├── vite.config.js              # Vite dev server config with API proxy
│
├── db/
│   └── connection.js           # MongoDB connection manager with status tracking
│
├── middleware/
│   └── authenticateToken.js    # JWT authentication middleware
│
├── routes/
│   └── authRoutes.js           # Authentication route handlers (signup, login, validate, profile)
│
├── public/
│   ├── favicon.svg             # Site favicon
│   ├── icons.svg               # SVG icons
│   └── logo.png                # MVIT logo for preview
│
└── src/
    ├── main.jsx                # React entry point
    ├── App.jsx                 # Root component (routing + auth context provider)
    ├── App.css                 # Application-level styles
    ├── index.css               # Global CSS variables, fonts, base styles (1149 lines)
    │
    ├── assets/                 # Static assets
    │
    ├── components/
    │   ├── Navbar.jsx          # Sidebar navigation with user info, nav items, logout
    │   └── ProtectedRoute.jsx  # Auth route guard with loading spinner
    │
    ├── context/
    │   └── AuthContext.jsx     # Authentication context provider (login, signup, logout, validate)
    │
    └── pages/
        ├── LoginPage.jsx       # Login page with email/password form
        ├── SignUpPage.jsx      # Registration page with all fields
        ├── DashboardPage.jsx   # Main app (1570 lines — create, editor, preview, history, settings, MVITPaperPreview)
        └── NotFoundPage.jsx    # 404 error page
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| `500 Internal Server Error` on generate | Check the Inception API key is valid and has quota. Check backend console for specific error. |
| `502 Bad Gateway` on API calls | The backend server (port 5000) has stopped or crashed. Restart it with `node server.js` or `npm run dev`. |
| `API Key is missing` | Add your key to `.env` as `INCEPTION_API_KEY` or enter it in the Settings page. |
| `401 Unauthorized` | Your JWT token has expired. Log out and log in again. |
| `Invalid token. Please log in again.` | Token expired or was cleared. Log in again via the Login page. |
| `AI returned empty response` | The Inception API model didn't generate content. Try again — may be a transient API issue. |
| PDF export doesn't work | The export button auto-switches to Preview mode before capturing. If it still fails, check browser console for errors. Try Chrome/Edge. |
| Marks mismatch error on generate | The sum of all sub-part marks must equal the configured Maximum Marks. Adjust part/question marks in the editor. |
| Port already in use | Change `PORT` in `.env` (backend) or the `port` in `vite.config.js` (frontend). |
| MongoDB connection fails | The app falls back to local JSON files automatically. No user action needed. |
| Blank white page | Check browser console for errors. Ensure both backend and frontend are running. |
| AI generates malformed JSON | The `repairJSON()` utility handles most formatting issues. If it fails, try regenerating. |

---

## 🔐 Authentication Flow

1. **Sign Up** — `POST /api/auth/signup` creates a teacher record (hashed password with bcryptjs) and returns a JWT.
2. **Login** — `POST /api/auth/login` verifies credentials and returns a JWT.
3. **Token Storage** — JWT is stored in `localStorage` under the key `jwtToken`.
4. **Authenticated Requests** — All paper-related API calls include `Authorization: Bearer <token>` header.
5. **Token Validation** — On app load, `AuthContext.validateToken()` calls `GET /api/auth/validate` to check token validity.
6. **Protected Routes** — `ProtectedRoute` component checks `AuthContext.isAuthenticated` and redirects to `/login` if false.
7. **Logout** — Clears JWT and API key from `localStorage`, resets auth state.

---

## 🔐 Security Notes

- Passwords are hashed with bcryptjs (10-12 salt rounds, configurable via `BCRYPT_ROUNDS` in `.env`).
- JWT tokens expire after 24 hours (configurable via `JWT_EXPIRY` in `.env`).
- Paper API endpoints **enforce ownership** — papers are filtered/saved per `teacherId` extracted from the JWT.
- Delete and update operations verify ownership before applying changes.
- Auth routes validate required fields and enforce minimum password length (6 characters).

---

## 🧪 How the Generation Works

1. **User fills the form** — subject, syllabus, parts configuration, Bloom's distribution.
2. **Frontend validates** — checks all required fields are present.
3. **POST `/api/generate-paper`** — sends all parameters in JSON body with JWT auth.
4. **Backend constructs AI prompt** — a detailed system prompt with:
   - Role definition ("expert academic evaluator")
   - Exact JSON schema with parts[], questionSets[], subParts[] structure
   - Bloom's Taxonomy weight requirements
   - Part structure constraints (number of parts, sets per part, marks distribution)
   - Per sub-part field requirements (label, text, marks, co, bl, po, pi)
5. **Inception API call** — `mercury-2` model, max 4000 tokens, 90s timeout.
6. **Response parsing** — 7-tier `repairJSON()` fallback (direct parse → regex → state machine → aggressive cleanup).
7. **Auto-save** — paper is saved to database and returned to frontend.
8. **Editor opens** — immediate editing capability in the MVIT-format editor.
9. **Fallback** — If AI fails, `generateFallbackPaper()` creates a valid paper using local templates.

---

## 📝 License

MIT