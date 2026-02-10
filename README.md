# MicroLab MIC WebApp (GitHub-ready)

Web app modulare per **refertazione microbiologica con antibiogramma MIC**.

## Cosa include

- Archivio pazienti (CRUD)
- Gestione esame microbiologico:
  - tipo campione (urine, feci, orofaringeo, ecc.)
  - microrganismo isolato
  - tabella antibiogramma con MIC + S/I/R + classe + breakpoint
- Catalogo antibiotici (aggiunta/rimozione)
- Interpretazione automatica:
  - separazione Sensibili / Intermedi / Resistenti
  - ranking consigliati = antibiotici **S** (priorità stewardship + MIC)
  - prima scelta suggerita
  - pattern di resistenza evidenziati
  - nomi commerciali opzionali
- Referto PDF professionale con intestazione configurabile e salvataggio impostazioni default
- Doppia modalità runtime:
  - **Backend + DB SQLite** (FastAPI)
  - **Solo frontend GitHub Pages** con archivio locale browser (localStorage)

## Struttura progetto

- `backend/` API FastAPI + SQLAlchemy
- `frontend/` UI principale
- `docs/` copia statica per GitHub Pages
- `.github/workflows/pages.yml` deploy automatico Pages

## Avvio locale (completo con DB)

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Apri: `http://localhost:8000`

## Uso su GitHub Pages (solo frontend)

1. Pubblica repo su GitHub.
2. Verifica che in `docs/` ci siano `index.html` + `assets/`.
3. Settings → Pages:
   - Source: Deploy from a branch
   - Branch: `main`
   - Folder: `/docs`
4. Salva.

L'app funziona in modalità locale browser, senza backend.

## Note cliniche importanti

I pannelli antibiotici predefiniti sono orientativi e **devono essere validati** da microbiologo/infettivologo locale.
La prescrizione finale non è automatica: richiede integrazione con quadro clinico, allergie, funzione renale, gravidanza e linee guida locali.
