import { localApi } from "./local-api.js";

const cfg = window.APP_CONFIG || {};
const configuredBase = typeof cfg.API_BASE_URL === "string" ? cfg.API_BASE_URL.trim().replace(/\/$/, "") : "";
const forceLocal = cfg.FORCE_LOCAL_DB === true;

const isGithubPages = typeof window !== "undefined" && (
  window.location.hostname.endsWith("github.io") || window.location.protocol === "file:"
);

const REMOTE_BASE = configuredBase || "/api";
let mode = forceLocal || (!configuredBase && isGithubPages) ? "local" : "remote";

function shouldFallback(err) {
  if (forceLocal) return true;
  if (configuredBase) return false; // se l'utente imposta un backend, non fallback automatico
  if (!err) return false;
  if (err.isNetwork) return true;
  if ([404, 405, 500, 502, 503, 504].includes(Number(err.status))) return true;
  return false;
}

async function requestRemote(url, opts = {}) {
  let res;
  try {
    res = await fetch(REMOTE_BASE + url, {
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
      ...opts,
    });
  } catch (e) {
    const err = new Error("Backend non raggiungibile");
    err.isNetwork = true;
    throw err;
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.detail || `Errore API (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function exec(url, opts, localFn) {
  if (mode === "local") {
    return localFn();
  }
  try {
    return await requestRemote(url, opts);
  } catch (err) {
    if (shouldFallback(err)) {
      mode = "local";
      console.warn("[CurveLab] API remota non disponibile, passo a DB locale browser.");
      return localFn();
    }
    throw err;
  }
}

export function getApiMode() {
  return mode;
}

export const api = {
  health: () => exec("/health", {}, () => localApi.health()),
  getPresets: () => exec("/presets", {}, () => localApi.getPresets()),
  getReportSettings: () => exec("/report-settings", {}, () => localApi.getReportSettings()),
  saveReportSettings: (payload) =>
    exec("/report-settings", { method: "PUT", body: JSON.stringify(payload) }, () => localApi.saveReportSettings(payload)),

  listPatients: (search = "") =>
    exec(`/patients?search=${encodeURIComponent(search)}`, {}, () => localApi.listPatients(search)),
  createPatient: (payload) =>
    exec("/patients", { method: "POST", body: JSON.stringify(payload) }, () => localApi.createPatient(payload)),
  updatePatient: (id, payload) =>
    exec(`/patients/${id}`, { method: "PUT", body: JSON.stringify(payload) }, () => localApi.updatePatient(id, payload)),
  deletePatient: (id) =>
    exec(`/patients/${id}`, { method: "DELETE" }, () => localApi.deletePatient(id)),

  previewExam: (payload) =>
    exec("/exams/preview", { method: "POST", body: JSON.stringify(payload) }, () => localApi.previewExam(payload)),
  saveExam: (payload) =>
    exec("/exams", { method: "POST", body: JSON.stringify(payload) }, () => localApi.saveExam(payload)),
  listExams: (patientId) =>
    exec(`/exams?patient_id=${patientId}`, {}, () => localApi.listExams(patientId)),
  getExam: (id) =>
    exec(`/exams/${id}`, {}, () => localApi.getExam(id)),
  deleteExam: (id) =>
    exec(`/exams/${id}`, { method: "DELETE" }, () => localApi.deleteExam(id)),
};
