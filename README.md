# AI Question Paper Generator

An intelligent academic question paper generator powered by the **Inception AI API** (`mercury-2` model). Generates structured, Bloom's Taxonomy-aligned exam papers from syllabus content with a full-featured editor for customisation.

Built for **Sir M. Visvesvaraya Institute of Technology (MVIT)**, Department of Computer Science & Engineering.

---

## 🚀 Features

- **User Authentication** — Full signup/login system with JWT-based authentication. Secure password hashing with bcryptjs. Token stored in `localStorage` for persistent sessions.
- **AI-Powered Generation** — Enter syllabus content and generate a complete question paper with sections, marks, and cognitive levels via the Inception AI API.
- **Bloom's Taxonomy Distribution** — Configure the weightage of Remember/Understand, Apply/Analyze, and Evaluate/Create questions via interactive sliders with live pie chart visualisation.
- **Full Paper Editor** — After generation, edit every aspect of the paper:
  - Metadata (subject, code, semester, test type, marks, duration)
  - Section titles and marks-per-question
  - Question text, marks, and cognitive level (drop-down with all 6 Bloom's levels)
  - MCQ options and correct answers (4-option grid with correct answer selector)
  - Add/delete/reorder questions and sections
- **Preview Mode** — Switch between form editing and printable A4 preview styled as an official exam paper with university header, instructions, and signature lines.
- **Export to PDF** — Download the paper as a professional A4 PDF using `html2canvas` + `jsPDF` with multi-page support. Works from both Edit and Preview modes (auto-switches to Preview).
- **Save & History** — Papers are automatically saved to a local JSON database (`papers_db.json`) and can be revisited anytime from the Saved Papers sidebar.
- **Single Question Regeneration** — Replace individual questions via AI with a single click (with simulated fallback if API fails).
- **Immersive AI Loader** — Animated book-flip loader with rotating academic quotes and a live progress bar while generating.
- **Client API Key Override** — Configure API key in the Settings page, which overrides the `.env` server key (stored in `localStorage`).
- **Marks Audit** — Real-time validation showing whether section totals match the configured maximum marks, preventing generation with mismatched totals.
- **History Management** — View, edit, or delete previously generated papers from a dedicated archive page with timestamps.
- **Protected Routes** — Dashboard pages are protected behind authentication; unauthenticated users are redirected to login.

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
- Paste or type the **Syllabus Content** in the text area — this is what the AI uses to generate relevant questions.

### Step 3: Define Sections
- Sections represent parts of your exam paper (e.g. Part A — MCQs, Part B — Short Answers, Part C — Long Answers).
- For each section, set:
  - **Section Title** (editable)
  - **Number of Questions**
  - **Marks Per Question**
- The **Marks Audit** bar at the bottom shows if the total matches your configured max marks — generation is blocked if mismatched.

### Step 4: Set Cognitive Distribution
- Use the 3 interactive sliders to balance **Remember/Understand**, **Apply/Analyze**, and **Evaluate/Create** (Bloom's Taxonomy levels).
- The sliders auto-adjust as you move them to keep the total at 100%.
- A live SVG donut chart visualises the distribution.

### Step 5: Generate
- Click **"Generate Question Paper"** — the app sends a POST request to `/api/generate-paper` on your backend.
- The backend constructs a detailed system prompt with the syllabus, Bloom's weights, and section schema, then calls the Inception AI API (`mercury-2` model).
- An immersive loader with a book-flip animation, rotating academic quotes, and a progress bar appears.
- On success, the paper is auto-saved to the local database and the **Paper Editor** opens automatically.

### Step 6: Edit & Preview
- In **Edit mode**, modify any field:
  - **Paper Metadata**: subject name, code, semester, test type, marks, duration
  - **Section Titles & Marks Per Question**
  - **Question Text**: textareas for each question
  - **Marks & Cognitive Level**: per-question number input and Bloom's level dropdown
  - **MCQ Options**: 4-option grid with a correct answer selector
  - **Reorder Questions**: up/down arrow buttons
  - **Add/Delete Questions & Sections**: buttons for each
- Switch to **Preview** to see the printable A4 format with:
  - University header: "SIR M. VISVESVARAYA INSTITUTE OF TECHNOLOGY"
  - Department header: "DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING"
  - Test title, course info, duration, and max marks
  - General instructions (3 standard exam rules)
  - All sections with questions, MCQ options, cognitive levels, and course outcomes
  - Signature lines for Course Coordinator, Module Coordinator, and Head of Department
- Click **Save** to persist changes, or **Export PDF** to download as a professional PDF (works from both Edit and Preview modes).

### Step 7: History
- Navigate to **Saved Papers** from the sidebar.
- Each entry shows: subject code, subject name, test type, semester, marks, duration, and creation timestamp.
- Click **Edit** to reopen any saved paper in the editor.
- Click the trash icon to delete a paper permanently.

### Step 8: Settings
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
| **Delete** | `DELETE /api/papers/:id` → filters out that paper, writes back |
| **Format** | JSON array with 2-space indent pretty-printing |

**Example entry:**
```json
[
  {
    "paperId": "paper-1716281234567",
    "subject": "Machine Learning",
    "subjectCode": "21CS61",
    "semester": 6,
    "testNo": "Internal Assessment I",
    "maxMarks": 50,
    "duration": 90,
    "teacherId": "MVIT-CS-000001",
    "sections": [...],
    "createdAt": "2026-05-22T15:30:00.000Z",
    "updatedAt": "2026-05-22T15:30:00.000Z"
  }
]
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
| Section configuration | Resets to default 3-section layout on refresh |

---

## 🧠 Technical Architecture

```
┌───────────────────────┐      ┌──────────────────────┐      ┌──────────────────┐
│   Frontend (React 19) │─────▶│   Backend (Express 5) │─────▶│  Inception AI    │
│   Vite Dev Server     │      │   Port: 5000         │      │  mercury-2 API   │
│   Port: 3000          │      └──────────┬───────────┘      └──────────────────┘
└──────────┬────────────┘                 │
           │                              │
           ▼                              ▼
    localStorage                    Local JSON DB
    (JWT token, API key)            (papers_db.json, auth_db.json)
                                    MongoDB (optional, for auth)
```

### Frontend (`src/`)

| File | Purpose |
|------|---------|
| `src/main.jsx` | React entry point — mounts `<App />` |
| `src/App.jsx` | Root component — sets up React Router and AuthContext |
| `src/App.css` | Application-level styles |
| `src/index.css` | Global CSS variables, fonts, base styles |
| `src/pages/LoginPage.jsx` | Login form with email/password |
| `src/pages/SignUpPage.jsx` | Registration form with name, email, department, password |
| `src/pages/DashboardPage.jsx` | **Main application** — paper generation, editor, preview, history, settings (~1149 lines) |
| `src/pages/NotFoundPage.jsx` | 404 error page |
| `src/components/Navbar.jsx` | Sidebar navigation component |
| `src/components/ProtectedRoute.jsx` | Route guard — redirects unauthenticated users to login |
| `src/context/AuthContext.jsx` | Authentication context — login, logout, signup, token validation |

### Backend (`server.js` + routes + middleware)

| File | Purpose |
|------|---------|
| `server.js` | Express server — API endpoints, MongoDB init, JSON repair utility |
| `routes/authRoutes.js` | Auth routes — `/api/auth/signup`, `/api/auth/login`, `/api/auth/validate`, `/api/auth/profile` |
| `middleware/authenticateToken.js` | JWT verification middleware |
| `db/connection.js` | MongoDB connection manager with local JSON fallback |

### API Endpoints

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

### Key Backend Logic

- **`server.js` lines 207-315** — `repairJSON()` utility: multi-tier JSON parsing with markdown removal, trailing comma fixes, unescaped quote handling, and aggressive character filtering.
- **`server.js` lines 318-453** — Paper generation endpoint: system prompt construction with Bloom's Taxonomy weights, section structure, and strict output schema.
- **`server.js` lines 456-556** — Single question regeneration: focused prompt for one replacement question.
- **`server.js` lines 207-208** — Local database at `C:\Users\Admin\.gemini\antigravity\scratch\papers_db.json`.

---

## 🛠️ Tech Stack (Complete)

### Runtime & Language
- **Node.js** — JavaScript runtime
- **ES Modules** (`"type": "module"` in package.json)

### Frontend
- **React 19** — UI framework with hooks (`useState`, `useEffect`)
- **React Router DOM v7** — Client-side routing with protected routes
- **Vite 8** — Build tool and dev server with API proxy configuration
- **Lucide React** — Icon library (26+ icons)

### Backend
- **Express 5** — Web server framework
- **Axios** — HTTP client for Inception API calls (90s timeout for generation, 60s for single-question)
- **CORS** — Cross-origin resource sharing middleware
- **dotenv** — Environment variable management
- **jsonwebtoken** — JWT token creation and verification
- **bcryptjs** — Password hashing (12 rounds by default)
- **MongoDB Driver** — Optional MongoDB connection with indexed collections
- **dns** — IPv4 DNS resolution fix for MongoDB SRV lookups

### PDF Export
- **html2canvas** — Captures the preview DOM as a canvas image (2x scale)
- **jsPDF** — Generates A4 PDF with multi-page support (210mm × 295mm)

### Development Tools
- **concurrently** — Runs frontend and backend simultaneously via `npm run dev`
- **ESLint** — Code linting (Flat config)
- **@vitejs/plugin-react** — Vite React plugin

### AI API
- **Inception Labs API** — `https://api.inceptionlabs.ai/v1/chat/completions`
- **Model** — `mercury-2`
- **Auth** — Bearer token from `INCEPTION_API_KEY` env var or client-provided key

### Data Persistence
- **MongoDB** (optional) — Primary storage for user accounts and papers
- **File-based JSON** (fallback) — `papers_db.json`, `auth_db.json`
- **Browser localStorage** — JWT token and API key caching

### Dependencies (from package.json)

```json
{
  "dependencies": {
    "axios": "^1.16.1",
    "bcryptjs": "^3.0.3",
    "concurrently": "^9.2.1",
    "cors": "^2.8.6",
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "html2canvas": "^1.4.1",
    "jsonwebtoken": "^9.0.3",
    "jspdf": "^4.2.1",
    "lucide-react": "^1.16.0",
    "mongodb": "^7.2.0",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "react-router-dom": "^7.15.1"
  }
}
```

---

## 📄 File Structure

```
├── .env                        # API keys, MongoDB URI, JWT secret
├── .gitignore                  # Git ignore rules
├── eslint.config.js            # ESLint flat configuration
├── index.html                  # Vite HTML entry point
├── package.json                # Dependencies, scripts
├── package-lock.json           # Dependency lockfile
├── README.md                   # This file
├── server.js                   # Express backend server (584 lines)
├── vite.config.js              # Vite dev server config with API proxy
├── db/
│   └── connection.js           # MongoDB connection manager
├── middleware/
│   └── authenticateToken.js    # JWT authentication middleware
├── routes/
│   └── authRoutes.js           # Authentication route handlers
├── public/
│   ├── favicon.svg             # Site favicon
│   └── icons.svg               # SVG icons
└── src/
    ├── main.jsx                # React entry point
    ├── App.jsx                 # Root component (routing + auth context)
    ├── App.css                 # Application styles
    ├── index.css               # Global styles (1149 lines)
    ├── assets/                 # Static assets
    ├── components/
    │   ├── Navbar.jsx          # Sidebar navigation
    │   └── ProtectedRoute.jsx  # Auth route guard
    ├── context/
    │   └── AuthContext.jsx     # Authentication context provider
    └── pages/
        ├── LoginPage.jsx       # Login page
        ├── SignUpPage.jsx      # Registration page
        ├── DashboardPage.jsx   # Main app (generator, editor, preview, history, settings)
        └── NotFoundPage.jsx    # 404 page
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
| PDF export doesn't work | The export button now auto-switches to Preview mode before capturing. If it still fails, check browser console for errors. Try Chrome/Edge. |
| Marks mismatch error on generate | The sum of (questions count × marks per question) must equal the configured Maximum Marks. Adjust section counts or marks. |
| Port already in use | Change `PORT` in `.env` (backend) or the `port` in `vite.config.js` (frontend). |
| MongoDB connection fails | The app falls back to local JSON files automatically. No user action needed. |
| Blank white page | Check browser console for errors. Ensure both backend and frontend are running. |

---

## 🔐 Authentication Flow

1. **Sign Up** — `POST /api/auth/signup` creates a teacher record (hashed password) and returns a JWT.
2. **Login** — `POST /api/auth/login` verifies credentials and returns a JWT.
3. **Token Storage** — JWT is stored in `localStorage` under the key `jwtToken`.
4. **Authenticated Requests** — All paper-related API calls include `Authorization: Bearer <token>` header.
5. **Token Validation** — On app load, `AuthContext.validateToken()` calls `GET /api/auth/validate` to check token validity.
6. **Protected Routes** — `ProtectedRoute` component checks `AuthContext.isAuthenticated` and redirects to `/login` if false.
7. **Logout** — Clears JWT from `localStorage` and resets auth state.

---

## 🔐 Security Notes

- Passwords are hashed with bcryptjs (12 salt rounds by default).
- JWT tokens expire after 24 hours (configurable via `JWT_EXPIRY` in `.env`).
- Paper API endpoints **enforce ownership** — papers are filtered/saved per `teacherId` extracted from the JWT.
- Delete and update operations check ownership before applying changes.

---

## 🧪 How the Generation Works

1. **User fills the form** — subject, syllabus, sections, Bloom's distribution.
2. **Frontend validates** — checks configured total marks match max marks.
3. **POST `/api/generate-paper`** — sends all parameters in JSON body with JWT auth.
4. **Backend constructs AI prompt** — a detailed system prompt with:
   - Role definition ("expert academic evaluator")
   - Exact JSON schema
   - Bloom's Taxonomy weight requirements
   - Section structure constraints
   - Marks consistency constraint
5. **Inception API call** — `mercury-2` model, max 4000 tokens, 90s timeout.
6. **Response parsing** — 3-tier fallback (direct parse → regex extraction → aggressive cleaning).
7. **Auto-save** — paper is saved to database and returned to frontend.
8. **Editor opens** — deep clone allows editing without affecting saved version until explicitly saved.

---

## 📝 License

MIT