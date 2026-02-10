# RELEASE NOTES v9 — 2026-02-10

## Fix applicati
- Corretto bug principale: il PDF ora usa **sempre** i dati correnti del form (niente payload vecchi/stale).
- Warning e interpretazione non vengono più generati per valori mancanti/non numerici.
- Interpretazione insulinemica valutata solo se la curva insulinemica è realmente attivata.
- Confermato messaggio richiesto: **"Referto con alterazioni: necessaria valutazione medica."** (senza “significative”).
- Migliorata gestione valori mancanti in grafici/PDF (nessun 0 forzato, visualizzazione “-").
- Preset backend allineati al flusso richiesto (solo preset glicemici + switch insulinemica).
- Fix collaterale su update paziente in modalità locale browser.

## File toccati
- `frontend/assets/js/ui/exams-ui.js`
- `frontend/assets/js/local-api.js`
- `frontend/assets/js/ui/charts-ui.js`
- `frontend/assets/js/ui/report-ui.js`
- `backend/app/services/interpretation.py`
- `backend/app/services/presets.py`
- `docs/assets/js/ui/exams-ui.js`
- `docs/assets/js/local-api.js`
- `docs/assets/js/ui/charts-ui.js`
- `docs/assets/js/ui/report-ui.js`
