# RIAAS — Regulatory Intelligence & Audit Analytics System

RIAAS is an AI-driven RegTech system that:
- Ingests regulatory documents (PDFs, policies, SOPs)
- Runs RAG-based Q&A with citations
- Extracts requirements
- Converts requirements into remediation action items
- Tracks action status (audit-to-actions workflow)

## Repo Structure
- `backend/` — FastAPI + RAG pipeline + SQLite actions/requirements
- `frontend/` — React (Vite) UI + Tailwind + Router

## Run (Local)
### Backend
(Use your existing backend commands)

### Frontend
cd frontend
npm install
npm run dev
