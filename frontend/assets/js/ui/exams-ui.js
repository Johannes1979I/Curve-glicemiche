import { api } from "../api.js";
import { state } from "../state.js";
import { renderCharts } from "./charts-ui.js";

function parseCsvTimes(v) {
  return String(v || "")
    .split(",")
    .map((x) => parseInt(x.trim(), 10))
    .filter((n) => !Number.isNaN(n));
}

function buildTableRows(tableId, times, refsMap) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  tbody.innerHTML = "";
  times.forEach((t) => {
    const ref = refsMap[String(t)] || refsMap[t] || { min: "", max: "" };
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t === 0 ? "Basale (T0)" : `T${t}' (${t} min)`}</td>
      <td><input data-role="value" type="number" step="0.1" /></td>
      <td><input data-role="min" type="number" step="0.1" value="${ref.min}" /></td>
      <td><input data-role="max" type="number" step="0.1" value="${ref.max}" /></td>
    `;
    tbody.appendChild(tr);
  });
}

function tableToSeries(tableId) {
  const rows = Array.from(document.querySelectorAll(`#${tableId} tbody tr`));
  const values = rows.map((r) => Number(r.querySelector('input[data-role="value"]').value || 0));
  const refs = {};
  rows.forEach((r) => {
    const tText = r.children[0].textContent || "";
    const m = tText.match(/(\d+)/);
    const t = tText.includes("Basale") ? 0 : (m ? parseInt(m[1], 10) : 0);
    refs[String(t)] = {
      min: Number(r.querySelector('input[data-role="min"]').value || 0),
      max: Number(r.querySelector('input[data-role="max"]').value || 0),
    };
  });
  return { values, refs };
}

function setPresetOptions() {
  const sel = document.getElementById("preset");
  sel.innerHTML = state.presets.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
}

function renderRefsSourceInfo() {
  const box = document.getElementById("refsSourceInfo");
  if (!box) return;
  const meta = state.refs.metadata;
  if (!meta) {
    box.innerHTML = "";
    return;
  }

  const sources = Array.isArray(meta.sources)
    ? `<ul>${meta.sources.map((s) => `<li>${s}</li>`).join("")}</ul>`
    : "";

  box.innerHTML = `
    <div class="ref-box">
      <strong>Profilo riferimenti:</strong> ${meta.profile_name || "n/d"}
      ${meta.dataset_name ? `<br/><small>Dataset: ${meta.dataset_name}</small>` : ""}
      ${meta.dataset_version ? `<br/><small>Versione: ${meta.dataset_version}</small>` : ""}
      <br/><small>Aggiornato: ${meta.updated_at || "n/d"}</small>
      ${meta.notes ? `<p>${meta.notes}</p>` : ""}
      ${sources}
    </div>
  `;
}

function applyPresetToTimes() {
  const presetId = document.getElementById("preset").value;
  const preset = state.presets.find((x) => x.id === presetId);
  if (!preset) return;

  const mode = document.getElementById("curve_mode").value;
  let glyc = [];
  let ins = [];

  if (preset.type === "combined") {
    glyc = preset.glyc_times || [];
    ins = preset.ins_times || [];
  } else if (preset.type === "glyc") {
    glyc = preset.times || [];
    ins = mode === "combined" ? [...glyc] : [];
  } else if (preset.type === "ins") {
    ins = preset.times || [];
    glyc = mode === "combined" ? [...ins] : [];
  }

  document.getElementById("glyc_times").value = glyc.join(",");
  document.getElementById("ins_times").value = ins.join(",");
  rebuildTables();
}

function getCurrentRefs() {
  const pregnant = document.getElementById("pregnant_mode").checked;
  return {
    glyc: pregnant ? state.refs.pregnant_glyc_refs : state.refs.default_glyc_refs,
    ins: state.refs.default_ins_refs,
  };
}

function rebuildTables() {
  const glycTimes = parseCsvTimes(document.getElementById("glyc_times").value);
  const insTimes = parseCsvTimes(document.getElementById("ins_times").value);
  const refs = getCurrentRefs();

  buildTableRows("glycTable", glycTimes, refs.glyc);
  buildTableRows("insTable", insTimes, refs.ins);
}

function joinMethodologies() {
  const mg = document.getElementById("methodology_glyc")?.value?.trim() || "";
  const mi = document.getElementById("methodology_ins")?.value?.trim() || "";

  const lines = [];
  if (mg) lines.push(`Glicemia: ${mg}`);
  if (mi) lines.push(`Insulina: ${mi}`);
  return lines.join("\n");
}

function splitMethodologies(rawText = "") {
  const out = { glyc: "", ins: "" };
  const text = String(rawText || "").trim();
  if (!text) return out;

  const lines = text.split(/\r?\n/).map((x) => x.trim());
  for (const line of lines) {
    if (line.toLowerCase().startsWith("glicemia:")) {
      out.glyc = line.replace(/^glicemia\s*:\s*/i, "").trim();
    } else if (line.toLowerCase().startsWith("insulina:")) {
      out.ins = line.replace(/^insulina\s*:\s*/i, "").trim();
    }
  }

  if (!out.glyc && text) out.glyc = text;
  return out;
}

function buildPayload() {
  if (!state.selectedPatient) throw new Error("Seleziona un paziente prima di continuare.");

  const exam_date = document.getElementById("exam_date").value;
  if (!exam_date) throw new Error("Inserisci la data esame.");

  const glyc_times = parseCsvTimes(document.getElementById("glyc_times").value);
  const ins_times = parseCsvTimes(document.getElementById("ins_times").value);

  const glyc = tableToSeries("glycTable");
  const ins = tableToSeries("insTable");

  return {
    patient_id: state.selectedPatient.id,
    exam_date,
    requester_doctor: document.getElementById("requester_doctor").value || null,
    acceptance_number: document.getElementById("acceptance_number").value || null,
    curve_mode: document.getElementById("curve_mode").value,
    pregnant_mode: document.getElementById("pregnant_mode").checked,
    glucose_load_g: Number(document.getElementById("glucose_load_g").value || 75),
    glyc_unit: document.getElementById("glyc_unit").value,
    ins_unit: document.getElementById("ins_unit").value,
    glyc_times,
    ins_times,
    glyc_values: glyc.values,
    ins_values: ins.values,
    glyc_refs: glyc.refs,
    ins_refs: ins.refs,
    methodology: joinMethodologies() || null,
    notes: document.getElementById("exam_notes").value || null,
  };
}

function renderSummary(interp) {
  state.interpretation = interp;
  const box = document.getElementById("summary");
  const b = `<span class="badge ${interp.overall_status}">${interp.overall_status.toUpperCase()}</span>`;
  const gly = interp.details.glycemic_interpretation ? `<li>${interp.details.glycemic_interpretation}</li>` : "";
  const ins = interp.details.insulin_interpretation ? `<li>${interp.details.insulin_interpretation}</li>` : "";
  box.innerHTML = `
    <p>${b} <strong>${interp.summary}</strong></p>
    <ul>${gly}${ins}</ul>
  `;
}

function setDefaultMethodologies(defaultMethods = {}) {
  const gly = document.getElementById("methodology_glyc");
  const ins = document.getElementById("methodology_ins");
  if (gly && !gly.value.trim()) gly.value = defaultMethods.glyc || "";
  if (ins && !ins.value.trim()) ins.value = defaultMethods.ins || "";
}

export async function refreshExamHistory() {
  if (!state.selectedPatient) return;
  const rows = await api.listExams(state.selectedPatient.id);
  const box = document.getElementById("examHistory");
  box.innerHTML = rows.map((r) => `
    <div class="card-item">
      <div>
        <strong>#${r.id}</strong> — ${r.exam_date} (${r.curve_mode})
        <br/><small>${r.interpretation_summary || "n/d"}</small>
      </div>
      <div class="row">
        <button data-load="${r.id}">Apri</button>
        <button data-del="${r.id}">Elimina</button>
      </div>
    </div>
  `).join("") || "<small>Nessun esame registrato per questo paziente</small>";

  box.querySelectorAll("button[data-load]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.load);
      const exam = await api.getExam(id);
      document.getElementById("exam_date").value = exam.exam_date;
      document.getElementById("acceptance_number").value = exam.acceptance_number || "";
      document.getElementById("requester_doctor").value = exam.requester_doctor || "";
      document.getElementById("curve_mode").value = exam.curve_mode;
      document.getElementById("pregnant_mode").checked = !!exam.pregnant_mode;
      document.getElementById("glucose_load_g").value = exam.glucose_load_g;
      document.getElementById("glyc_unit").value = exam.glyc_unit;
      document.getElementById("ins_unit").value = exam.ins_unit;
      document.getElementById("glyc_times").value = exam.glyc_times.join(",");
      document.getElementById("ins_times").value = exam.ins_times.join(",");
      rebuildTables();

      // fill values/refs from loaded exam
      const glyRows = document.querySelectorAll("#glycTable tbody tr");
      glyRows.forEach((r, i) => {
        const t = exam.glyc_times[i];
        const ref = exam.glyc_refs[String(t)] || { min: "", max: "" };
        r.querySelector('input[data-role="value"]').value = exam.glyc_values[i] ?? "";
        r.querySelector('input[data-role="min"]').value = ref.min;
        r.querySelector('input[data-role="max"]').value = ref.max;
      });
      const insRows = document.querySelectorAll("#insTable tbody tr");
      insRows.forEach((r, i) => {
        const t = exam.ins_times[i];
        const ref = exam.ins_refs[String(t)] || { min: "", max: "" };
        r.querySelector('input[data-role="value"]').value = exam.ins_values[i] ?? "";
        r.querySelector('input[data-role="min"]').value = ref.min;
        r.querySelector('input[data-role="max"]').value = ref.max;
      });

      const methods = splitMethodologies(exam.methodology || "");
      document.getElementById("methodology_glyc").value = methods.glyc || "";
      document.getElementById("methodology_ins").value = methods.ins || "";
      document.getElementById("exam_notes").value = exam.notes || "";

      renderSummary(exam.interpretation);
      state.lastPayload = exam;
      renderCharts(exam);
    });
  });

  box.querySelectorAll("button[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Eliminare l'esame?")) return;
      await api.deleteExam(Number(btn.dataset.del));
      await refreshExamHistory();
    });
  });
}

export function bindExamUI() {
  document.getElementById("exam_date").value = new Date().toISOString().slice(0, 10);

  document.getElementById("preset").addEventListener("change", applyPresetToTimes);
  document.getElementById("curve_mode").addEventListener("change", rebuildTables);
  document.getElementById("pregnant_mode").addEventListener("change", rebuildTables);

  document.getElementById("btnPreview").addEventListener("click", async () => {
    try {
      const payload = buildPayload();
      const interp = await api.previewExam(payload);
      renderSummary(interp);
      state.lastPayload = payload;
      renderCharts(payload);
    } catch (e) {
      alert(e.message);
    }
  });

  document.getElementById("btnSaveExam").addEventListener("click", async () => {
    try {
      const payload = buildPayload();
      const saved = await api.saveExam(payload);
      renderSummary(saved.interpretation);
      state.lastPayload = saved;
      renderCharts(saved);
      await refreshExamHistory();
      alert(`Esame salvato con ID ${saved.id}`);
    } catch (e) {
      alert(e.message);
    }
  });
}

export function initPresetsAndRefs(presetsPayload) {
  state.presets = presetsPayload.presets || [];
  state.refs.default_glyc_refs = presetsPayload.default_glyc_refs || {};
  state.refs.pregnant_glyc_refs = presetsPayload.pregnant_glyc_refs || {};
  state.refs.default_ins_refs = presetsPayload.default_ins_refs || {};
  state.refs.metadata = presetsPayload.references_metadata || null;

  setPresetOptions();
  renderRefsSourceInfo();

  setDefaultMethodologies(presetsPayload.default_methodologies || {});

  // defaults
  if (state.presets[0]) {
    document.getElementById("preset").value = state.presets[0].id;
  }
  applyPresetToTimes();
}
