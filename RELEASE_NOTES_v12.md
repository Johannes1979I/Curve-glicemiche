# CurveLab WebApp - v12 Final (GitHub Pages complete)

## Included fixes
- Preset curves restored and stable:
  - Curva glicemica 3, 4, 5, 6 punti
  - Curva glicemica 3 punti in gravidanza
- Insulin logic aligned to toggle (`include_insulin`):
  - no insulin warnings when insulin is disabled
- Interpretation warnings shown only on real alterations
- Report text updated:
  - "Referto con alterazioni: necessaria valutazione medica."
- GitHub Pages 404 hardening:
  - root `index.html` redirect to `/docs/`
  - root `/assets` mirror
  - local DB mode forced by default for Pages
- Favicon included:
  - `/favicon.ico`
  - `/docs/favicon.ico`
  - `/frontend/favicon.ico`
- `docs/404.html` fallback redirect for Pages
