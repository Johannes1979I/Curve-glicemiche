# CurveLab WebApp (GitHub-ready)

Web app modulare per curve glicemiche/insulinemiche con archivio pazienti.

## Cosa fa questa versione

Hai **due modalità operative** nello stesso progetto:

1. **GitHub Pages (solo repo GitHub) — subito funzionante**
   - Il frontend gira da `docs/`
   - Archivio pazienti/esami salvato nel browser (DB locale via LocalStorage)
   - Non richiede server esterno

2. **Frontend + Backend + DB centralizzato**
   - Frontend su GitHub Pages
   - Backend FastAPI (`backend/`) con DB SQLite/PostgreSQL
   - Più PC condividono gli stessi pazienti/esami

---

## Struttura progetto

```text
curve-lab-webapp/
├─ docs/                      # versione pronta per GitHub Pages
│  ├─ index.html
│  └─ assets/
├─ frontend/                  # stessa UI usata dal backend locale
├─ backend/
│  ├─ app/
│  │  ├─ main.py
│  │  ├─ config.py
│  │  ├─ models.py
│  │  ├─ schemas.py
│  │  ├─ routers/
│  │  ├─ crud/
│  │  └─ services/
│  └─ requirements.txt
├─ .github/workflows/pages.yml
├─ .env.example
├─ Dockerfile
├─ docker-compose.yml
└─ render.yaml
```

---

## Pubblicazione su GitHub Pages (funziona subito)

### Opzione A (consigliata): con workflow già incluso
1. Carica il repo su GitHub
2. Vai in **Settings → Pages**
3. In **Source** seleziona **GitHub Actions**
4. Fai commit/push su `main`
5. Attendi il job `Deploy GitHub Pages`
6. Apri il link Pages (`https://<utente>.github.io/<repo>/`)

### Opzione B: Deploy from branch
1. Settings → Pages
2. Source: **Deploy from a branch**
3. Branch: `main`
4. Folder: `/docs`
5. Save

---

## Modalità backend centralizzato (multi-PC)

### 1) Avvio locale backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

App: `http://localhost:8000`  
Swagger: `http://localhost:8000/docs`

### 2) Collegare frontend GitHub Pages al backend
Nel file `docs/assets/js/config.js` imposta:

```js
window.APP_CONFIG = {
  API_BASE_URL: "https://TUO-BACKEND/api",
  FORCE_LOCAL_DB: false
};
```

Se `API_BASE_URL` è vuoto, su GitHub Pages userà automaticamente il DB locale browser.

---

## API principali backend

- `GET /api/health`
- `GET /api/presets`
- Pazienti:
  - `POST /api/patients`
  - `GET /api/patients`
  - `PUT /api/patients/{id}`
  - `DELETE /api/patients/{id}`
- Esami:
  - `POST /api/exams/preview`
  - `POST /api/exams`
  - `GET /api/exams?patient_id=...`
  - `GET /api/exams/{id}`
  - `DELETE /api/exams/{id}`

---

## Nota importante

GitHub Pages **non esegue backend Python/PHP**.  
Per questo il progetto include:
- modalità locale browser (funziona solo con GitHub),
- modalità API+DB centralizzato (richiede deploy backend esterno).

