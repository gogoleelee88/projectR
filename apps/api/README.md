# Project R API

FastAPI backend for Project R. It currently provides:

- session bootstrap for preset logins
- feed and content detail endpoints
- story progression endpoint
- character chat reply endpoint
- party chat resolution endpoint
- image studio generation endpoint
- creator release queue backed by SQLite
- ops signal endpoint

## Run

```bash
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python -m uvicorn app.main:app --reload
```
