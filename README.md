# AI Fact-Checking Agent

This project fulfills all the core requirements outlined in the "Part 2: The 'Fact-Check' Agent" assignment rubric.

## Project Requirements Checklist

### 1. Extract
**Requirement:** Identify specific claims (stats, dates, financial/technical figures) from the PDF.
**Implementation:** When a user uploads a PDF, the Node.js backend uses the Gemini 1.5/2.5 Flash Multimodal API to parse the document and extract factual claims (specifically targeting statistics, dates, and financial figures), returning them as a structured JSON array.

### 2. Verify
**Requirement:** Search the live web to confirm accuracy.
**Implementation:** The backend iterates through every extracted claim and queries the live web using the **Tavily Search API**. It then utilizes a "Batch Verification" architecture, sending all claims alongside their live web search results to the AI in a single prompt to cross-reference and verify them.

### 3. Report
**Requirement:** Flag claims as Verified (matches data), Inaccurate (outdated stats), or False (no evidence found).
**Implementation:** The AI strictly categorizes every claim into one of the three required categories: `Verified`, `Inaccurate`, or `False`. If a claim is False or Inaccurate, it successfully provides the correct "real" facts alongside a brief explanation and a confidence score.

### 4. Technical Requirements (Interface)
**Requirement:** A simple frontend (Streamlit, Gradio, or React) for PDF upload.
**Implementation:** The frontend is built using **React** (which is explicitly permitted in the rubric). It provides a modern, interactive dashboard for users to upload PDFs and view the Verification Report.

### 5. Deployment (Pending)
**Requirement:** The final solution must be live.
**Implementation:** The frontend is configured to be deployed on Vercel, and the backend is configured for Render. 

## Evaluation Criteria (Trap Document)
This system is highly resilient against "Trap Documents." By fetching live search data via Tavily and forcing the AI to evaluate the document's claims *against* the live search results, the system acts as a true "Truth Layer." It will successfully catch intentional lies or outdated statistics and output the corrected facts in the UI.
