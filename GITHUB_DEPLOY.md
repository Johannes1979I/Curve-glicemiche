# Deploy rapido su GitHub

## 1) Carica i file
- Estrai lo ZIP in locale
- Copia tutto nella tua repository
- Commit + Push su `main`

## 2) Attiva GitHub Pages
- Vai in **Settings → Pages**
- Source: **Deploy from a branch**
- Branch: `main`
- Folder: `/docs`
- Save

## 3) Apri il link
Dopo 1-2 minuti il sito è disponibile nel link Pages della repo.

## 4) Modalità backend (opzionale)
Se vuoi DB centralizzato:
- pubblica `backend/` su Render/Railway/VPS
- imposta in `docs/assets/js/config.js` il campo:
```js
API_BASE_URL: "https://TUO-BACKEND/api"
```
e fai commit/push.
