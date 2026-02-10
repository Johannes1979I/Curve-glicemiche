# CurveLab WebApp — RELEASE NOTES v10 (2026-02-10)

## Fix principali

1. **Ripristino preset curva glicemica**
   - Ripristinati/normalizzati i preset glicemici:
     - Curva glicemica 3 punti
     - Curva glicemica 4 punti
     - Curva glicemica 5 punti
     - Curva glicemica 6 punti
     - Curva glicemica 3 punti in gravidanza
   - Aggiunta compatibilità alias storico (`glyc_preg`) per evitare preset "spariti" in migrazioni/versioni miste.
   - Fallback automatico: se i preset API sono incompleti, l'app ricostruisce i preset base.

2. **Stabilità inizializzazione riferimenti**
   - Hardening su `initPresetsAndRefs` per evitare errori su `state.refs` non inizializzato.

3. **Logica insulina più robusta**
   - Se presente il campo `include_insulin`, viene usato come sorgente prioritaria (niente falsi positivi dovuti a `curve_mode` legacy).
   - Aggiornamento coerente applicato a:
     - grafici
     - referto PDF
     - interpretazione locale
     - interpretazione backend

4. **Compatibilità frontend/docs**
   - Allineati i file di `frontend/` e `docs/` (GitHub Pages) per comportamento identico.

## File toccati

- `frontend/assets/js/ui/exams-ui.js`
- `frontend/assets/js/ui/charts-ui.js`
- `frontend/assets/js/ui/report-ui.js`
- `frontend/assets/js/local-api.js`
- `docs/assets/js/ui/exams-ui.js`
- `docs/assets/js/ui/charts-ui.js`
- `docs/assets/js/ui/report-ui.js`
- `docs/assets/js/local-api.js`
- `backend/app/services/interpretation.py`

