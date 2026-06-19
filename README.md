# AI Question Paper Generator

A full-stack web application for generating academic question papers using AI, specifically designed for **MVIT (Sir M. Visvesvaraya Institute of Technology)** faculty. It uses the Inception Labs AI API to generate structured question papers in the MVIT format, and includes complete user authentication, profile management, and paper storage.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 8 |
| Backend | Express 5 (ESM) |
| Database | MongoDB 7 (fallback: local JSON files) |
| Authentication | JWT + bcryptjs |
| AI Engine | Inception Labs API (`mercury-2` model) |
| File Export | html2canvas + jsPDF + custom ZIP generator |

---

## Project Structure

```
AI_QUESTION_PAPER_GENRATOR/
├── package.json                  # Dependencies & scripts
├── index.html                    # Vite entry HTML
├── vite.config.js                # Vite configuration
├── server.js                     # Express backend (817 lines)
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
│   ├── App.css
│   ├── index.css
│   ├── assets/                   # Static frontend assets
│   ├── components/
│   │   └── ProtectedRoute.jsx    # Auth guard for private routes
│   ├── context/
│   │   └── AuthContext.jsx       # Global auth state (login, signup, 2FA, logout)
│   └── pages/
│       ├── LoginPage.jsx
│       ├── SignUpPage.jsx
│       ├── DashboardPage.jsx     # Paper generation + management
│       ├── ProfilePage.jsx       # Profile, 2FA, sessions, export
│       └── NotFoundPage.jsx
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

## How It Works

### Authentication Flow

1. **Sign Up** → Creates a teacher account with a unique `MVIT-{DEPT}-{NUMBER}` Teacher ID
2. **Login** → JWT token issued (includes session IDs for revocation tracking)
3. **2FA (Optional)** → OTP sent to console (dev mode); can be email or SMS
4. **Session Management** → View active sessions, revoke individual or all others

### Paper Generation Flow

1. User enters subject details: subject name, code, semester, marks, duration, syllabus topics
2. User configures Bloom's Taxonomy breakdown (Remember/Understand, Apply/Analyze, Evaluate/Create)
3. Backend sends a structured prompt to **Inception Labs AI API**
4. AI returns paper content as JSON; backend runs it through `repairJSON()` to handle malformed output
5. If AI fails entirely, a **fallback generator** creates a valid MVIT-format paper using templates
6. Paper is saved to MongoDB (or local JSON fallback)

### Paper Data Structure

Each paper contains:

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
                { "label": "a)", "text": "...", "marks": 5, "co": "CO1", "bl": "L2", "po": "PO1", "pi": "1.7.1" },
                { "label": "b)", "text": "...", "marks": 7, "co": "CO1", "bl": "L3", "po": "PO1", "pi": "1.7.1" }
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

### AI Generation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate-paper` | Generate full paper via AI (with JSON repair + fallback) |
| POST | `/api/regenerate-question` | Regenerate a single sub-part question |

---

## Key Backend Features

### `repairJSON()` (server.js, lines 225–323)
A robust JSON repair utility that handles malformed AI output:
1. Strips markdown code fences
2. Finds outermost valid JSON boundary using bracket-depth tracking
3. Attempts direct parse
4. Removes trailing commas
5. Character-by-character state machine reconstruction
6. Final aggressive ASCII whitelist cleanup

### Dual Storage (MongoDB + Local JSON)
Every data operation tries MongoDB first, then falls back to local JSON files (`~/.gemini/antigravity/scratch/`). This allows the app to work without a database server.

### Zero-Dependency ZIP Generator (authRoutes.js, lines 36–137)
A custom ZIP file compiler written from scratch using only Node.js `Buffer` operations. Used for GDPR-compliant data export.

### Session Revocation System
JWT tokens include a `sessionId`. On each request, the middleware checks if that session ID still exists in the teacher's `sessions` array. Revoked sessions are immediately invalidated.

---

## Frontend Pages

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Redirect | Sends to `/login` |
| `/login` | LoginPage | Email/password login with 2FA support |
| `/signup` | SignUpPage | New teacher registration |
| `/dashboard` | DashboardPage | Create, view, edit, download papers |
| `/profile` | ProfilePage | Profile editing, 2FA setup, session management, data export |
| `*` | NotFoundPage | 404 handler |

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

---

## License

Private project — Sir M. Visvesvaraya Institute of Technology