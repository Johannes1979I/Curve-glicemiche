import { api, getApiMode } from "./api.js";
import { bindPatientUI, refreshPatients } from "./ui/patients-ui.js";
import { bindExamUI, initPresetsAndRefs } from "./ui/exams-ui.js";
import { bindReportUI } from "./ui/report-ui.js";

function renderRuntimeMode() {
  const el = document.getElementById("runtimeMode");
  if (!el) return;
  const mode = getApiMode();
  if (mode === "local") {
    el.textContent = "Modalità: Archivio locale browser (compatibile con GitHub Pages).";
  } else {
    el.textContent = "Modalità: Backend API + DB centralizzato.";
  }
}

async function boot() {
  try {
    await api.health();
    renderRuntimeMode();

    const presets = await api.getPresets();
    initPresetsAndRefs(presets);

    bindPatientUI();
    bindExamUI();
    bindReportUI();

    await refreshPatients();
  } catch (e) {
    alert("Errore avvio applicazione: " + e.message);
  }
}

boot();
