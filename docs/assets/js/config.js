/**
 * Configurazione frontend
 * - API_BASE_URL:
 *   - vuoto => prova /api (stesso dominio) e, su GitHub Pages, passa automaticamente a DB locale browser
 *   - esempio remoto => "https://tuo-backend.onrender.com/api"
 * - FORCE_LOCAL_DB:
 *   - true  => forza archivio locale browser
 *   - false => usa API se disponibile
 */
window.APP_CONFIG = window.APP_CONFIG || {
  API_BASE_URL: "",
  FORCE_LOCAL_DB: true,
};
