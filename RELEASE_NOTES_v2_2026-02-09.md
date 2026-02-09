# CurveLab WebApp — Release Notes v2 (2026-02-09)

## ✅ Nuove funzionalità implementate

### A) Grafici con curve limite e area di normalità
- Curva misurata + curva limite min + curva limite max.
- Area colorata tra limite min/max per evidenziare il range di normalità.
- Linee rese più morbide (`tension` + interpolazione monotona) per andamento più leggibile.

### B) Intestazione referto salvabile come default
- Nuovo supporto completo alle **impostazioni referto**:
  - titolo referto,
  - 3 righe intestazione,
  - upload logo,
  - salvataggio e caricamento dei default.
- Le impostazioni vengono persistite sia in modalità backend (DB) sia in modalità GitHub Pages (localStorage).

### C) Opzioni referto richieste
- Spunta per includere/escludere le note di interpretazione nel PDF.
- Spunta per unire grafico glicemico + insulinemico in un unico grafico nel PDF.

### D) Stile referto migliorato (layout clinico)
- Header strutturato con logo e intestazione.
- Sezioni con titoli, tabella risultati, badge stato, note e grafici.
- Footer con timestamp e numerazione pagine.

### E) Profilo riferimenti internazionale da DB profili
- I riferimenti sono centralizzati nel modulo `reference_profiles` (backend) e mostrati nel frontend.
- Metadati del profilo con dataset/versione/fonti sono visibili in UI.
- I range restano configurabili per laboratorio e metodica.

### F) Metodica analitica sotto Glicemia e Insulina
- Nel PDF la metodica è mostrata sotto ciascun parametro (curva glicemica e curva insulinemica).

---

## File principali aggiornati

### Frontend (docs + frontend)
- `assets/js/ui/charts-ui.js`
- `assets/js/ui/report-ui.js`
- `assets/js/ui/exams-ui.js`
- `assets/js/local-api.js`
- `assets/js/state.js`
- `assets/css/main.css`

### Backend
- `backend/app/services/reference_profiles.py`
- `backend/app/services/report_settings.py`

---

## Compatibilità GitHub Pages
- La cartella `docs/` è pronta per GitHub Pages.
- È presente fallback locale (`local-api`) quando backend non è raggiungibile.



## Hotfix 2026-02-09b
- Fixed startup error on GitHub Pages: `Cannot set properties of null (setting 'default_glyc_refs')`.
- Initialized `state.refs` object in both `docs` and `frontend`.
- Added defensive guards in `ui/exams-ui.js` for refs access and presets initialization.
