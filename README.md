# VeriFacts - AI-Powered Fact-Checking Web App

VeriFacts is a modern, production-ready, full-stack MERN application that allows users to upload PDF documents, automatically extract factual statements, verify them using live web search and Gemini LLM analysis, and view detailed color-coded fact-check reports.

---

## 🌟 Key Features

1. **Public Analyst Dashboard**: Direct upload and analysis of PDFs without sign-up, sign-in, or session gates.
2. **Interactive Drag-and-Drop Uploader**: Seamless PDF uploads with memory-based parsing (no temp disk writes).
3. **Real-time Pipeline Polling**: Users see claims extract, search queries fire, and verdicts apply live as they happen.
4. **Interactive Dashboard & Verdict Cards**: High-impact visual indicator cards (Verified, Inaccurate, False) with side-by-side claim/correction reviews, confidence meters, and source evidence links.
5. **Interactive Re-verification**: Analysts can trigger individual claim re-checks directly from the card.
6. **Analytics Overview**: Dynamic charts (Recharts) visualizing claim categories and reliability ratings across all documents.
7. **Document History**: Timeline of past document uploads.
8. **PDF Report Exports**: Downloadable, nicely styled PDF document summaries generated dynamically using `pdfkit`.
9. **Zero-Config "Simulation Mode"**: Out-of-the-box testing! If Tavily or Gemini API keys are omitted in `.env`, the application falls back to a highly realistic mock search and extraction engine.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), Tailwind CSS (v4 with PostCSS), Framer Motion, Axios, Recharts, Lucide Icons
- **Backend**: Node.js, Express.js, Multer (memory-based streams), pdf-parse, pdfkit (PDF generation)
- **Database**: MongoDB & Mongoose
- **APIs / AI**: Google Gemini API (`@google/generative-ai` SDK), Tavily Search API (live web search)

---

## 📂 Project Architecture

```text
Ai-factcheck/
├── backend/
│   ├── controllers/
│   │   ├── claimController.js      # Fetching results, manual fact-checks, PDF reports, analytics
│   │   └── documentController.js   # PDF upload, text parsing, background execution
│   ├── models/
│   │   ├── Document.js             # Upload files and executive summary meta
│   │   └── Claim.js                # Extracted claims, verdicts, sources, confidence scores
│   ├── services/
│   │   ├── aiService.js            # Gemini API claim extraction, verification, summaries
│   │   └── searchService.js        # Tavily Search API & simulated crawler fallbacks
│   ├── routes/
│   │   ├── documents.js            # File uploader and history list
│   │   └── claims.js               # Report results, recheck, PDF export, analytics
│   ├── .env.example                # Template configuration parameters
│   ├── .env                        # Local variables file
│   ├── package.json                # Server scripts and packages
│   └── server.js                   # Application server launcher
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout/
│   │   │       └── Sidebar.jsx     # Navigation panel
│   │   ├── pages/
│   │   │   ├── Upload.jsx          # Interactive file drag uploader
│   │   │   ├── Results.jsx         # Live progress cards and fact-check inspector
│   │   │   ├── Analytics.jsx       # Chart graphs and accuracy averages
│   │   │   ├── History.jsx         # Review and load past files
│   │   │   └── Settings.jsx        # API overrides configurations
│   │   ├── App.jsx                 # Client routers and nested layouts
│   │   ├── config.js               # Central API URL definitions
│   │   ├── index.css               # CSS base files and Tailwind v4 themes
│   │   └── main.jsx                # SPA mounting entrypoint
│   ├── index.html                  # HTML entry point (SEO Optimized)
│   ├── postcss.config.js           # PostCSS configuration
│   └── package.json                # Client dependencies
└── README.md                       # Documentation guide
```

---

## 🚀 Quickstart Guide

### Prerequisites
- Install **Node.js** (v16+)
- Install **MongoDB** (Ensure the local service is running or get an Atlas connection string)

### 1. Set Up the Backend
Open a terminal in the `backend/` directory:
```bash
# Install dependencies
npm install

# Initialize environment variables (adjust settings inside as needed)
copy .env.example .env

# Start the server (runs on port 5000)
npm run start
```

### 2. Set Up the Frontend
Open another terminal in the `frontend/` directory:
```bash
# Install dependencies
npm install

# Start the Vite development server (runs on port 5173)
npm run dev

# Build for production (outputs to dist/)
npm run build
```

---

## 🔍 API Key Customization (Override Option)

While you can configure your **Gemini API Key** and **Tavily API Key** in the backend `.env` file, the application features a **Profile & Configurations** page inside the UI dashboard. 

Entering keys there saves them in your local browser storage. They are attached as header arguments (`X-Gemini-Key` and `X-Tavily-Key`) for all uploads and checks, enabling you to test and deploy on serverless platforms without hardcoding access tokens!

---

## ☁️ Deployment Instructions

### Database: MongoDB Atlas
1. Register a database cluster at [mongodb.com](https://www.mongodb.com/).
2. Under database security, add an IP access whitelist (use `0.0.0.0/0` for initial hosting testing) and create user credentials.
3. Retrieve your connection connection URL: `mongodb+srv://<username>:<password>@cluster0...mongodb.net/factchecker`.
4. Provide this as `MONGODB_URI` in the backend environment.

### Backend Hosting: Render / Railway
1. Push the code repository to GitHub.
2. Link the repository to your host dashboard.
3. Configure the Root Directory to `backend`.
4. Add the Environment Variables:
   - `PORT=5000` (Render will manage automatically, but set to be safe)
   - `MONGODB_URI=your_mongodb_atlas_url`
   - `GEMINI_API_KEY=your_gemini_key`
   - `TAVILY_API_KEY=your_tavily_key`
5. Deploy.

### Frontend Hosting: Vercel / Netlify
1. link the repository to your hosting dashboard.
2. Configure the Root Directory to `frontend`.
3. Build Settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variable:
   - `VITE_API_URL=https://your-backend-service-domain.com/api` (Ensure it targets the live URL of your deployed Express backend).
5. Deploy.
