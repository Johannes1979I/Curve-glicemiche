# RELEASE NOTES v3 — 2026-02-10

## Nuovo prodotto
Refactor completo da CurveLab a **MicroLab MIC WebApp**.

## Feature principali
- Nuovo dominio funzionale: microbiologia + antibiogramma MIC
- Moduli separati backend/frontend (file piccoli e dedicati)
- Catalogo antibiotici CRUD (aggiunta/rimozione)
- Pannelli predefiniti per campione (urine/feci/orofaringeo/espettorato/ferita/sangue)
- Referto PDF con impostazioni default salvabili
- Interpretazione automatica con selezione antibiotici sensibili (S)

## Architettura
- Backend FastAPI + SQLite:
  - routers: patients, catalog, exams, presets, report_settings
  - services: seed_data, presets, interpretation, report_settings
  - crud: patients, catalog, exams
- Frontend modulare:
  - ui/patients-ui.js
  - ui/exams-ui.js
  - ui/catalog-ui.js
  - ui/report-ui.js
- Fallback GitHub Pages:
  - local-api.js con stesso contratto endpoint

## Sicurezza/clinica
- L’interpretazione è supporto operativo e non sostituisce il giudizio clinico.
- Pannelli e nomi commerciali sono completamente modificabili lato catalogo.
