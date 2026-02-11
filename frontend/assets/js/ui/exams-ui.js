import { api } from "../api.js";
import { state } from "../state.js";
import { escapeHtml, formatDate } from "../utils.js";
import { renderCharts } from "./charts-ui.js";
import { generatePdf } from "./report-ui.js";

function el(id) {
  return document.getElementById(id);
}

function parseCsvInts(text) {
  return String(text || "")
    .split(",")
    .map((x) => Number(String(x).trim()))
    .filter((n) => Number.isFinite(n))
    .map((n) => Math.round(n));
}

function toCsv(arr) {
  return (arr || []).join(",");
}

function getSelectedPreset() {
  const id = el("preset").value;
  return state.presets.find((p) => p.id === id) || null;
}

function isPregnancyPreset(preset) {
  return !!(preset && preset.pregnant === true);
}

function isInsulinEnabled() {
  const sw = el("include_ins_curve");
  if (sw) return !!sw.checked;

  // Compatibilità con layout legacy (select "curve_mode")
  const mode = el("curve_mode")?.value;
  return mode === "combined" || mode === "ins";
}

function setInsulinEnabled(enabled) {
  const on = !!enabled;
  const sw = el("include_ins_curve");
  if (sw) sw.checked = on;

  // Mantieni allineata anche la select legacy, se presente
  const mode = el("curve_mode");
  if (mode) mode.value = on ? "combined" : "glyc";
}

function normalizeMaybeNumber(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function setTimesFromPreset() {
  const preset = getSelectedPreset();
  if (!preset) return;

  const glycTimes = Array.isArray(preset.times)
    ? preset.times
    : Array.isArray(preset.glyc_times)
      ? preset.glyc_times
      : [];

  if (el("glyc_times")) el("glyc_times").value = toCsv(glycTimes);

  if (isInsulinEnabled()) {
    if (el("ins_times")) el("ins_times").value = toCsv(glycTimes);
  } else {
    if (el("ins_times")) el("ins_times").value = "";
  }

  applyRefsFromInputs();
  rebuildValueTables();
}

function syncInsTimesWithGlyc() {
  if (!isInsulinEnabled()) {
    if (el("ins_times")) el("ins_times").value = "";
    return;
  }
  const glycTimes = parseCsvInts(el("glyc_times")?.value);
  if (el("ins_times")) el("ins_times").value = toCsv(glycTimes);
}

function getGlycRefsForTimes(times) {
  const preset = getSelectedPreset();
  const usePregnancyRefs = isPregnancyPreset(preset);
  const source = usePregnancyRefs ? state.refs.pregnant_glyc_refs : state.refs.default_glyc_refs;

  const out = {};
  (times || []).forEach((t) => {
    const r = source[String(t)] || source[t] || { min: 0, max: 0 };
    out[String(t)] = { min: Number(r.min), max: Number(r.max) };
  });
  return out;
}

function getInsRefsForTimes(times) {
  const source = state.refs.default_ins_refs || {};
  const out = {};
  (times || []).forEach((t) => {
    const r = source[String(t)] || source[t] || { min: 0, max: 0 };
    out[String(t)] = { min: Number(r.min), max: Number(r.max) };
  });
  return out;
}

function buildValueTable(tableId, times, refs, existingMap = {}) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  if (!tbody) return;

  tbody.innerHTML = "";
  (times || []).forEach((t) => {
    const ref = refs[String(t)] || refs[t] || { min: 0, max: 0 };
    const existing = existingMap[String(t)] ?? existingMap[t];
    const valueText = existing === null || existing === undefined || Number.isNaN(Number(existing)) ? "" : String(existing);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t}</td>
      <td><input data-time="${t}" class="val-input" placeholder="0" value="${escapeHtml(valueText)}" /></td>
      <td><input data-time="${t}" class="ref-min" value="${Number(ref.min)}" /></td>
      <td><input data-time="${t}" class="ref-max" value="${Number(ref.max)}" /></td>
    `;
    tbody.appendChild(tr);
  });
}

function tableToSeries(tableId) {
  const rows = document.querySelectorAll(`#${tableId} tbody tr`);
  const times = [];
  const values = [];
  const refs = {};

  rows.forEach((r) => {
    const t = Number(r.querySelector(".val-input")?.dataset.time || 0);
    const rawVal = r.querySelector(".val-input")?.value;
    const v = normalizeMaybeNumber(rawVal);

    const min = Number(String(r.querySelector(".ref-min")?.value || "0").replace(",", "."));
    const max = Number(String(r.querySelector(".ref-max")?.value || "0").replace(",", "."));

    times.push(t);
    values.push(v);
    refs[String(t)] = {
      min: Number.isFinite(min) ? min : 0,
      max: Number.isFinite(max) ? max : 0,
    };
  });

  return { times, values, refs };
}

function applyRefsFromInputs() {
  const glycTimes = parseCsvInts(el("glyc_times")?.value);
  const glycRefs = getGlycRefsForTimes(glycTimes);

  const insEnabled = isInsulinEnabled();
  syncInsTimesWithGlyc();
  const insTimes = insEnabled ? parseCsvInts(el("ins_times")?.value) : [];
  const insRefs = insEnabled ? getInsRefsForTimes(insTimes) : {};

  state.refs._current_glyc = glycRefs;
  state.refs._current_ins = insRefs;

  return { glycTimes, glycRefs, insTimes, insRefs };
}

function rebuildValueTables(existing = {}) {
  const { glycTimes, glycRefs, insTimes, insRefs } = applyRefsFromInputs();

  buildValueTable("glycTable", glycTimes, glycRefs, existing.glyc || {});
  buildValueTable("insTable", insTimes, insRefs, existing.ins || {});

  toggleInsulinSections(isInsulinEnabled());
}

function setPresetOptions() {
  const sel = el("preset");
  if (!sel) return;

  const glyPresets = (state.presets || []).filter((p) => p.type === "glyc");
  sel.innerHTML = glyPresets
    .map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`)
    .join("");

  const defaultPreset = glyPresets.find((p) => p.id === "glyc3") || glyPresets[0] || null;
  if (defaultPreset) sel.value = defaultPreset.id;
}

function toggleInsulinSections(show) {
  const insTimesWrap = el("insTimesWrap") || el("ins_times")?.closest("label") || el("ins_times")?.parentElement;
  const insSection = el("insSection") || el("insTable")?.closest("div");
  const insChartCard = el("insChartCard") || el("insChart")?.closest(".chart-card");
  const combinedChartCard = el("combinedChartCard") || el("combinedChart")?.closest(".chart-card");

  [insTimesWrap, insSection, insChartCard, combinedChartCard].forEach((node) => {
    if (!node) return;
    node.classList.toggle("is-hidden", !show);
  });
}

function buildPayload() {
  const patient = state.selectedPatient;
  if (!patient) throw new Error("Seleziona un paziente.");

  const includeIns = isInsulinEnabled();
  syncInsTimesWithGlyc();

  const gly = tableToSeries("glycTable");
  const ins = includeIns ? tableToSeries("insTable") : { times: [], values: [], refs: {} };

  const preset = getSelectedPreset();
  const pregnant = isPregnancyPreset(preset);

  const payload = {
    patient_id: Number(patient.id),
    exam_date: el("exam_date").value || new Date().toISOString().slice(0, 10),
    requester_doctor: el("requester_doctor").value || null,
    acceptance_number: el("acceptance_number").value || null,

    curve_mode: includeIns ? "combined" : "glyc",
    include_insulin: includeIns,
    pregnant_mode: pregnant,
    glucose_load_g: Number(el("glucose_load_g").value || 75),

    glyc_unit: el("glyc_unit").value || "mg/dL",
    ins_unit: el("ins_unit").value || "µUI/mL",

    glyc_times: gly.times,
    glyc_values: gly.values,
    glyc_refs: gly.refs,

    ins_times: includeIns ? ins.times : [],
    ins_values: includeIns ? ins.values : [],
    ins_refs: includeIns ? ins.refs : {},

    methodology: JSON.stringify({
      glyc: el("methodology_glyc").value || null,
      ins: includeIns ? (el("methodology_ins").value || null) : null,
    }),

    notes: el("exam_notes").value || null,
  };

  // Sempre stessa struttura temporale se insulina attiva
  if (includeIns) {
    payload.ins_times = [...payload.glyc_times];
  }

  return payload;
}

function severityClass(overall) {
  if (overall === "danger") return "danger";
  if (overall === "warning") return "warning";
  return "ok";
}

function renderSummary(interp) {
  const box = el("summary");
  if (!box) return;

  if (!interp) {
    box.className = "summary";
    box.innerHTML = "Nessuna interpretazione disponibile.";
    return;
  }

  const details = interp.details || {};
  const payload = state.lastPayload || {};
  const includeIns = payload.include_insulin === true || payload.curve_mode === "combined";

  const glyInt = details.glycemic_interpretation ? `<li><strong>Glicemia:</strong> ${escapeHtml(details.glycemic_interpretation)}</li>` : "";
  const insInt = includeIns && details.insulin_interpretation
    ? `<li><strong>Insulina:</strong> ${escapeHtml(details.insulin_interpretation)}</li>`
    : "";

  box.className = `summary ${severityClass(interp.overall_status)}`;
  box.innerHTML = `
    <strong>Esito sintetico:</strong> ${escapeHtml(interp.summary || "-")}
    <ul>
      ${glyInt}
      ${insInt}
    </ul>
  `;
}

async function previewInterpretation() {
  const payload = buildPayload();
  state.lastPayload = payload;
  const interp = await api.previewExam(payload);
  state.interpretation = interp;
  renderSummary(interp);
  renderCharts(payload);
}

async function saveExam() {
  const payload = buildPayload();
  state.lastPayload = payload;
  const saved = await api.saveExam(payload);
  state.selectedExamId = saved.id;
  state.interpretation = saved.interpretation;

  renderSummary(saved.interpretation);
  renderCharts(payload);
  await refreshExamHistory();
  alert(`Esame salvato (ID ${saved.id})`);
}

function chooseBestPresetForExam(exam) {
  const exTimes = JSON.stringify((exam?.glyc_times || []).map(Number));
  const exPreg = !!exam?.pregnant_mode;

  const glyPresets = (state.presets || []).filter((p) => p.type === "glyc");
  const exact = glyPresets.find((p) => JSON.stringify((p.times || []).map(Number)) === exTimes && !!p.pregnant === exPreg);
  if (exact) return exact;

  const sameTimes = glyPresets.find((p) => JSON.stringify((p.times || []).map(Number)) === exTimes);
  return sameTimes || null;
}

function mapValuesByTime(times, values) {
  const out = {};
  (times || []).forEach((t, i) => {
    out[String(t)] = values?.[i] ?? null;
  });
  return out;
}

async function loadExam(examId) {
  const exam = await api.getExam(examId);
  state.selectedExamId = exam.id;

  el("exam_date").value = String(exam.exam_date || "").slice(0, 10);
  el("requester_doctor").value = exam.requester_doctor || "";
  el("acceptance_number").value = exam.acceptance_number || "";
  el("glucose_load_g").value = Number(exam.glucose_load_g ?? 75);
  el("glyc_unit").value = exam.glyc_unit || "mg/dL";
  el("ins_unit").value = exam.ins_unit || "µUI/mL";
  el("exam_notes").value = exam.notes || "";

  const hasIns = exam.include_insulin === true || exam.curve_mode === "combined" || ((exam.ins_times || []).length > 0);
  setInsulinEnabled(hasIns);

  const p = chooseBestPresetForExam(exam);
  if (p) {
    el("preset").value = p.id;
  }

  el("glyc_times").value = toCsv(exam.glyc_times || []);
  if (hasIns) {
    el("ins_times").value = toCsv(exam.ins_times?.length ? exam.ins_times : exam.glyc_times || []);
  } else {
    if (el("ins_times")) el("ins_times").value = "";
  }

  const method = (() => {
    try {
      return exam.methodology ? JSON.parse(exam.methodology) : {};
    } catch {
      return {};
    }
  })();

  el("methodology_glyc").value = method.glyc || "";
  el("methodology_ins").value = method.ins || "";

  const glycValues = mapValuesByTime(exam.glyc_times || [], exam.glyc_values || []);
  const insValues = mapValuesByTime(exam.ins_times || [], exam.ins_values || []);

  rebuildValueTables({
    glyc: glycValues,
    ins: insValues,
  });

  state.lastPayload = {
    ...exam,
    include_insulin: hasIns,
  };
  state.interpretation = exam.interpretation || null;

  renderSummary(state.interpretation);
  renderCharts(state.lastPayload);
}

export async function refreshExamHistory() {
  const box = el("examHistory");
  if (!box) return;

  if (!state.selectedPatient) {
    box.innerHTML = '<div class="list-item"><small>Seleziona un paziente.</small></div>';
    return;
  }

  const rows = await api.listExams(state.selectedPatient.id);
  if (!rows.length) {
    box.innerHTML = '<div class="list-item"><small>Nessun esame presente.</small></div>';
    return;
  }

  box.innerHTML = rows
    .map((r) => {
      const modeLabel = r.curve_mode === "combined"
        ? "Glicemica + Insulinemica"
        : "Glicemica";

      return `
      <div class="list-item">
        <div>
          <strong>#${r.id}</strong> — ${escapeHtml(formatDate(r.exam_date))}
          <div class="muted">${escapeHtml(modeLabel)} • ${escapeHtml(r.interpretation_summary || "-")}</div>
        </div>
        <div class="row">
          <button data-load-exam="${r.id}">Apri</button>
          <button class="danger" data-del-exam="${r.id}">Elimina</button>
        </div>
      </div>
    `;
    })
    .join("");

  box.querySelectorAll("[data-load-exam]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await loadExam(Number(btn.dataset.loadExam));
      } catch (e) {
        alert(e.message || "Errore caricamento esame");
      }
    });
  });

  box.querySelectorAll("[data-del-exam]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Eliminare questo esame?")) return;
      try {
        await api.deleteExam(Number(btn.dataset.delExam));
        if (state.selectedExamId === Number(btn.dataset.delExam)) {
          state.selectedExamId = null;
        }
        await refreshExamHistory();
      } catch (e) {
        alert(e.message || "Errore eliminazione esame");
      }
    });
  });
}

export function initPresetsAndRefs(presetsPayload) {
  state.presets = presetsPayload?.presets || [];
  state.refs.default_glyc_refs = presetsPayload?.default_glyc_refs || {};
  state.refs.pregnant_glyc_refs = presetsPayload?.pregnant_glyc_refs || {};
  state.refs.default_ins_refs = presetsPayload?.default_ins_refs || {};
  state.refs.metadata = presetsPayload?.references_metadata || null;

  setPresetOptions();

  const methods = presetsPayload?.default_methodologies || {};
  const mg = el("methodology_glyc");
  const mi = el("methodology_ins");
  if (mg && methods.glyc) mg.value = methods.glyc;
  if (mi && methods.ins) mi.value = methods.ins;

  const refBox = el("refsSourceInfo");
  if (refBox && state.refs.metadata) {
    const m = state.refs.metadata;
    const srcList = Array.isArray(m.sources) ? m.sources.slice(0, 6) : [];
    refBox.innerHTML = `
      <div class="ref-box">
        <strong>Profilo riferimenti:</strong> ${escapeHtml(m.profile_name || "-")}<br/>
        <small>Dataset: ${escapeHtml(m.dataset_name || "-")} • Versione: ${escapeHtml(m.dataset_version || "-")} • Agg.: ${escapeHtml(m.updated_at || "-")}</small>
        ${m.notes ? `<p class="muted">${escapeHtml(m.notes)}</p>` : ""}
        ${srcList.length ? `<small>Fonti principali:</small><ul>${srcList.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>` : ""}
      </div>
    `;
  }

  el("exam_date").value = new Date().toISOString().slice(0, 10);
  setInsulinEnabled(false);

  setTimesFromPreset();
}

export function bindExamUI() {
  el("preset")?.addEventListener("change", () => {
    setTimesFromPreset();
  });

  el("include_ins_curve")?.addEventListener("change", () => {
    const on = isInsulinEnabled();
    setInsulinEnabled(on);
    syncInsTimesWithGlyc();
    rebuildValueTables();
    if (state.lastPayload) {
      state.lastPayload.include_insulin = on;
      state.lastPayload.curve_mode = on ? "combined" : "glyc";
      renderCharts(state.lastPayload);
    }
  });

  // Compatibilità con UI legacy basata su select modalità
  el("curve_mode")?.addEventListener("change", () => {
    const on = isInsulinEnabled();
    setInsulinEnabled(on);
    syncInsTimesWithGlyc();
    rebuildValueTables();
    if (state.lastPayload) {
      state.lastPayload.include_insulin = on;
      state.lastPayload.curve_mode = on ? "combined" : "glyc";
      renderCharts(state.lastPayload);
    }
  });

  el("glyc_times")?.addEventListener("change", () => {
    syncInsTimesWithGlyc();
    rebuildValueTables();
  });

  el("btnPreview")?.addEventListener("click", async () => {
    try {
      await previewInterpretation();
    } catch (e) {
      alert(e.message || "Errore calcolo interpretazione");
    }
  });

  el("btnSaveExam")?.addEventListener("click", async () => {
    try {
      await saveExam();
    } catch (e) {
      alert(e.message || "Errore salvataggio esame");
    }
  });

  el("btnPdf")?.addEventListener("click", async () => {
    try {
      // Usa SEMPRE i dati correnti del form (evita referti con dati “stale”)
      const payload = buildPayload();
      const interp = await api.previewExam(payload);

      state.lastPayload = payload;
      state.interpretation = interp;

      renderSummary(interp, payload);
      renderCharts(payload);
      await generatePdf(payload, interp);
    } catch (e) {
      alert(e?.message || "Errore generazione PDF.");
    }
  });
}
