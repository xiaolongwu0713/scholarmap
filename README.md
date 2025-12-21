# ScholarMap

Monorepo:
- `backend/`: FastAPI API server
- `frontend/`: Next.js web app

## Local dev

1) Create `.env` from `.env.example` and fill keys.

2) Backend (Python 3.11+ recommended):
- `cd backend`
- `python3 -m venv .venv && source .venv/bin/activate`
- `pip install -r requirements.txt`
- `uvicorn app.main:app --reload --port 8000`

3) Frontend (Node 18+ recommended):
- `cd frontend`
- `npm install`
- `npm run dev -- --port 3000`

Open `http://localhost:3000`.

Notes:
- Backend reads env from `backend/.env` or repo-root `.env`.
- Next.js reads `NEXT_PUBLIC_*` env vars from `frontend/.env.local` (recommended) or your shell env when starting `npm run dev`.

## OpenAI "thinking" mode
- Set `OPENAI_MODEL=gpt-5.2` and `OPENAI_REASONING_EFFORT=high` in your `.env`.
- The backend prefers the OpenAI Responses API (`/v1/responses`) when available, with a fallback to Chat Completions.

## Phase 1 (MVP)
- Create a Project, then create a Run from a research description.
- Open the Run page and click `Query` to execute Phase 1 and persist:
  - `understanding.json`, `keywords.json`, `queries.json`
  - `results_pubmed.json`, `results_semantic_scholar.json`, `results_openalex.json`, `results_aggregated.json`
