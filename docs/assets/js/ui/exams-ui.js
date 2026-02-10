import { api } from "../api.js";
import { state } from "../state.js";

function $(id) {
  return document.getElementById(id);
}

function specimenLabel(specimenId) {
  const s = state.specimenTypes.find((x) => x.id === specimenId);
  return s ? s.label : specimenId;
}

function csvToList(v) {
  return String(v || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function interpLabel(code) {
  const x = String(code || "-").toUpperCase();
  if (x === "S") return "Sensibile";
  if (x === "I") return "Sensibile con aumentata esposizione";
  if (x === "R") return "Resistente";
  return "Non interpretato";
}

function interpTagClass(code) {
  const x = String(code || "-").toUpperCase();
  if (x === "S") return "interp-tag interp-S";
  if (x === "I") return "interp-tag interp-I";
  if (x === "R") return "interp-tag interp-R";
  return "interp-tag interp--";
}

function renderRefsSource() {
  const box = $("refsSourceInfo");
  const meta = state.presetsMeta;
  if (!box || !meta) return;
  const src = (meta.sources || []).map((s) => `<li>${s}</li>`).join("");
  box.innerHTML = `
    <strong>Profilo di riferimento:</strong> ${meta.profile_name || "-"}<br/>
    <small>${meta.dataset_name || ""} • v${meta.dataset_version || ""} • aggiornato: ${meta.updated_at || ""}</small>
    <ul>${src}</ul>
    <small>${meta.notes || ""}</small>
  `;
}

function catalogForSpecimen(specimen) {
  return state.catalog.filter((x) => {
    const types = (x.specimen_types || []).map((s) => String(s).toLowerCase());
    return types.includes(specimen) || types.includes("all");
  });
}

function rowTemplate(entry, idx, specimen) {
  const opts = catalogForSpecimen(specimen)
    .map((c) => {
      const selected = String(c.id) === String(entry.antibiotic_id || "") ? "selected" : "";
      return `<option value="${c.id}" ${selected}>${c.antibiotic_name}</option>`;
    })
    .join("");

  const iCode = String(entry.interpretation || "-").toUpperCase();
  const interpTxt = interpLabel(iCode);

  return `
    <tr data-row="${idx}">
      <td>
        <select data-role="catalog_id">
          <option value="">-- seleziona --</option>
          ${opts}
        </select>
        <input data-role="antibiotic_name" value="${entry.antibiotic_name || ""}" placeholder="Nome antibiotico" />
      </td>
      <td><input data-role="antibiotic_class" value="${entry.antibiotic_class || ""}" placeholder="Classe" /></td>
      <td><input data-role="active_ingredient" value="${entry.active_ingredient || ""}" placeholder="Principio attivo" /></td>
      <td><input data-role="mic" value="${entry.mic || ""}" placeholder="Es. <=1" /></td>
      <td><input data-role="breakpoint_ref" value="${entry.breakpoint_ref || ""}" placeholder="EUCAST/CLSI" /></td>
      <td>
        <select data-role="interpretation">
          <option value="-" ${iCode === "-" ? "selected" : ""}>-</option>
          <option value="S" ${iCode === "S" ? "selected" : ""}>S</option>
          <option value="I" ${iCode === "I" ? "selected" : ""}>I</option>
          <option value="R" ${iCode === "R" ? "selected" : ""}>R</option>
        </select>
      </td>
      <td>
        <span data-role="interp_text" class="${interpTagClass(iCode)}">${interpTxt}</span>
      </td>
      <td><input data-role="commercial_names" value="${(entry.commercial_names || []).join(", ")}" placeholder="Es. Augmentin, Monuril" /></td>
      <td>
        <select data-role="aware_group">
          <option value="" ${!entry.aware_group ? "selected" : ""}>-</option>
          <option value="Access" ${entry.aware_group === "Access" ? "selected" : ""}>Access</option>
          <option value="Watch" ${entry.aware_group === "Watch" ? "selected" : ""}>Watch</option>
          <option value="Reserve" ${entry.aware_group === "Reserve" ? "selected" : ""}>Reserve</option>
          <option value="Other" ${entry.aware_group === "Other" ? "selected" : ""}>Other</option>
        </select>
      </td>
      <td><button data-role="remove" class="danger" type="button">X</button></td>
    </tr>
  `;
}

function getCurrentEntries() {
  const rows = Array.from(document.querySelectorAll("#abTable tbody tr"));
  return rows
    .map((r) => {
      const csv = r.querySelector('[data-role="commercial_names"]').value || "";
      const iCode = String(r.querySelector('[data-role="interpretation"]').value || "-").toUpperCase();
      return {
        antibiotic_id: Number(r.querySelector('[data-role="catalog_id"]').value || 0) || null,
        antibiotic_name: r.querySelector('[data-role="antibiotic_name"]').value.trim(),
        antibiotic_class: r.querySelector('[data-role="antibiotic_class"]').value.trim() || null,
        active_ingredient: r.querySelector('[data-role="active_ingredient"]').value.trim() || null,
        mic: r.querySelector('[data-role="mic"]').value.trim() || null,
        breakpoint_ref: r.querySelector('[data-role="breakpoint_ref"]').value.trim() || null,
        interpretation: ["S", "I", "R", "-"].includes(iCode) ? iCode : "-",
        commercial_names: csvToList(csv),
        aware_group: r.querySelector('[data-role="aware_group"]').value || null,
      };
    })
    .filter((x) => x.antibiotic_name);
}

function updateInterpTag(tr) {
  const code = tr.querySelector('[data-role="interpretation"]').value || "-";
  const el = tr.querySelector('[data-role="interp_text"]');
  el.className = interpTagClass(code);
  el.textContent = interpLabel(code);
}

function renderRows(entries) {
  const specimen = $("specimen_type").value;
  const tbody = document.querySelector("#abTable tbody");
  tbody.innerHTML = entries.map((e, i) => rowTemplate(e, i, specimen)).join("");

  tbody.querySelectorAll('button[data-role="remove"]').forEach((b) => {
    b.addEventListener("click", (ev) => {
      ev.preventDefault();
      b.closest("tr")?.remove();
    });
  });

  tbody.querySelectorAll('select[data-role="interpretation"]').forEach((sel) => {
    sel.addEventListener("change", () => {
      const tr = sel.closest("tr");
      updateInterpTag(tr);
    });
  });

  tbody.querySelectorAll('select[data-role="catalog_id"]').forEach((sel) => {
    sel.addEventListener("change", () => {
      const id = Number(sel.value || 0);
      if (!id) return;
      const item = state.catalog.find((x) => x.id === id);
      if (!item) return;
      const tr = sel.closest("tr");
      tr.querySelector('[data-role="antibiotic_name"]').value = item.antibiotic_name || "";
      tr.querySelector('[data-role="antibiotic_class"]').value = item.antibiotic_class || "";
      tr.querySelector('[data-role="active_ingredient"]').value = item.active_ingredient || "";
      tr.querySelector('[data-role="breakpoint_ref"]').value = item.breakpoint_ref || "";
      tr.querySelector('[data-role="commercial_names"]').value = (item.commercial_names || []).join(", ");
      tr.querySelector('[data-role="aware_group"]').value = item.aware_group || "";
    });
  });
}

function resetExamForm() {
  $("exam_date").value = new Date().toISOString().slice(0, 10);
  $("acceptance_number").value = "";
  $("requester_doctor").value = "";
  $("growth_result").value = "positive";
  $("microorganism").value = "";
  $("exam_notes").value = "";
  $("methodology").value = state.defaultMethodology || "";
  renderRows([]);
  $("summary").innerHTML = "";
}

function buildExamPayload() {
  if (!state.selectedPatient) throw new Error("Seleziona un paziente");
  return {
    patient_id: state.selectedPatient.id,
    exam_date: $("exam_date").value || new Date().toISOString().slice(0, 10),
    acceptance_number: $("acceptance_number").value.trim() || null,
    requester_doctor: $("requester_doctor").value.trim() || null,
    specimen_type: $("specimen_type").value,
    growth_result: $("growth_result").value,
    microorganism: $("microorganism").value.trim() || null,
    methodology: $("methodology").value.trim() || null,
    notes: $("exam_notes").value.trim() || null,
    antibiogram: getCurrentEntries(),
  };
}

function liTag(it) {
  const micPart = it.mic ? `MIC ${it.mic}` : "MIC n/d";
  const comm = it.commercial_names?.length ? ` - <em>${it.commercial_names.join(", ")}</em>` : "";
  return `<li><strong>${it.antibiotic_name}</strong> (${micPart})${comm}</li>`;
}

function renderSummary(interpretation) {
  const el = $("summary");
  if (!interpretation) {
    el.innerHTML = "";
    return;
  }

  const firstChoice = interpretation.first_choice;
  const patterns = interpretation.resistance_patterns || [];
  const recommended = interpretation.recommended || [];

  el.innerHTML = `
    <h3>Interpretazione diagnostica</h3>
    <p>${interpretation.summary || ""}</p>

    ${
      firstChoice
        ? `<p><strong>Prima scelta suggerita:</strong> ${firstChoice.antibiotic_name || "-"} ${
            firstChoice.commercial_names?.length ? `(<em>${firstChoice.commercial_names.join(", ")}</em>)` : ""
          }</p>`
        : `<p><strong>Prima scelta suggerita:</strong> Nessuna (assenza di S nel pannello)</p>`
    }

    <div class="summary-grid">
      <div>
        <h4>Sensibili (S)</h4>
        <ul>${(interpretation.sensitive || []).map(liTag).join("") || "<li>Nessuno</li>"}</ul>
      </div>
      <div>
        <h4>Intermedi (I)</h4>
        <ul>${(interpretation.intermediate || []).map(liTag).join("") || "<li>Nessuno</li>"}</ul>
      </div>
      <div>
        <h4>Resistenti (R)</h4>
        <ul>${(interpretation.resistant || []).map(liTag).join("") || "<li>Nessuno</li>"}</ul>
      </div>
      <div>
        <h4>Consigliabili (solo S)</h4>
        <ul>${recommended.map(liTag).join("") || "<li>Nessuno</li>"}</ul>
      </div>
    </div>

    ${
      patterns.length
        ? `<div class="warn-box"><strong>Pattern di resistenza:</strong><ul>${patterns
            .map((w) => `<li>${w}</li>`)
            .join("")}</ul></div>`
        : ""
    }

    ${
      (interpretation.warnings || []).length
        ? `<div class="warn-box"><strong>Avvertenze cliniche:</strong><ul>${interpretation.warnings
            .map((w) => `<li>${w}</li>`)
            .join("")}</ul></div>`
        : ""
    }
  `;
}

function selectExam(exam) {
  state.selectedExamId = exam.id;
  $("exam_date").value = exam.exam_date || "";
  $("acceptance_number").value = exam.acceptance_number || "";
  $("requester_doctor").value = exam.requester_doctor || "";
  $("specimen_type").value = exam.specimen_type || state.specimenTypes[0]?.id || "urine";
  $("growth_result").value = exam.growth_result || "positive";
  $("microorganism").value = exam.microorganism || "";
  $("methodology").value = exam.methodology || "";
  $("exam_notes").value = exam.notes || "";
  renderRows(exam.antibiogram || []);

  state.lastPayload = {
    patient_id: exam.patient_id,
    exam_date: exam.exam_date,
    acceptance_number: exam.acceptance_number,
    requester_doctor: exam.requester_doctor,
    specimen_type: exam.specimen_type,
    growth_result: exam.growth_result,
    microorganism: exam.microorganism,
    methodology: exam.methodology,
    notes: exam.notes,
    antibiogram: exam.antibiogram || [],
  };
  state.interpretation = exam.interpretation || null;
  renderSummary(state.interpretation);
}

export async function refreshCatalogForCurrentSpecimen() {
  const specimen = $("specimen_type").value;
  state.catalog = await api.listCatalog({ specimen });
  const entries = getCurrentEntries();
  renderRows(entries);
}

export async function refreshExamHistory() {
  const box = $("examHistory");
  if (!state.selectedPatient) {
    box.innerHTML = '<div class="muted">Nessun paziente selezionato</div>';
    return;
  }

  const rows = await api.listExams(state.selectedPatient.id);
  if (!rows.length) {
    box.innerHTML = '<div class="muted">Nessun esame salvato per questo paziente</div>';
    return;
  }

  box.innerHTML = rows
    .map(
      (r) => `
    <div class="card-item">
      <div>
        <strong>${r.exam_date} • ${specimenLabel(r.specimen_type)}</strong><br/>
        <small>${r.microorganism || "Microrganismo n/d"} • ${r.interpretation_summary || "-"}</small>
      </div>
      <div class="row">
        <button data-action="open" data-id="${r.id}">Apri</button>
        <button data-action="delete" data-id="${r.id}" class="danger">Elimina</button>
      </div>
    </div>
  `
    )
    .join("");

  box.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.id);
      if (btn.dataset.action === "open") {
        const exam = await api.getExam(id);
        selectExam(exam);
      } else if (btn.dataset.action === "delete") {
        if (!confirm("Eliminare questo esame?")) return;
        await api.deleteExam(id);
        await refreshExamHistory();
      }
    });
  });
}

export function initPresetsAndRefs(presets) {
  state.specimenTypes = presets.specimen_types || [];
  state.catalog = presets.catalog || [];
  state.defaultPanels = presets.default_panels || {};
  state.presetsMeta = presets.references_metadata || null;
  state.defaultMethodology = presets.default_methodologies?.mic || "";

  const specSel = $("specimen_type");
  specSel.innerHTML = state.specimenTypes.map((s) => `<option value="${s.id}">${s.label}</option>`).join("");
  if (state.specimenTypes.length) specSel.value = state.specimenTypes[0].id;

  $("methodology").value = state.defaultMethodology;
  renderRefsSource();
}

export function bindExamUI() {
  $("exam_date").value = new Date().toISOString().slice(0, 10);
  $("methodology").value = state.defaultMethodology || "";

  $("btnLoadPanel").addEventListener("click", async () => {
    const spec = $("specimen_type").value;
    await refreshCatalogForCurrentSpecimen();
    const panel = (state.defaultPanels?.[spec] || []).map((p) => ({
      antibiotic_id: p.id,
      antibiotic_name: p.antibiotic_name,
      antibiotic_class: p.antibiotic_class || "",
      active_ingredient: p.active_ingredient || "",
      mic: "",
      breakpoint_ref: p.breakpoint_ref || "",
      interpretation: "-",
      commercial_names: p.commercial_names || [],
      aware_group: p.aware_group || "",
    }));
    renderRows(panel);
  });

  $("btnAddRow").addEventListener("click", async () => {
    await refreshCatalogForCurrentSpecimen();
    const entries = getCurrentEntries();
    entries.push({
      antibiotic_id: null,
      antibiotic_name: "",
      antibiotic_class: "",
      active_ingredient: "",
      mic: "",
      breakpoint_ref: "",
      interpretation: "-",
      commercial_names: [],
      aware_group: "",
    });
    renderRows(entries);
  });

  $("specimen_type").addEventListener("change", async () => {
    await refreshCatalogForCurrentSpecimen();
  });

  $("btnPreview").addEventListener("click", async () => {
    try {
      const payload = buildExamPayload();
      const interp = await api.previewExam(payload);
      state.lastPayload = payload;
      state.interpretation = interp;
      renderSummary(interp);
    } catch (e) {
      alert("Errore preview: " + e.message);
    }
  });

  $("btnSaveExam").addEventListener("click", async () => {
    try {
      const payload = buildExamPayload();
      const row = await api.saveExam(payload);
      state.selectedExamId = row.id;
      state.lastPayload = payload;
      state.interpretation = row.interpretation;
      renderSummary(row.interpretation);
      await refreshExamHistory();
      alert("Esame salvato.");
    } catch (e) {
      alert("Errore salvataggio esame: " + e.message);
    }
  });

  $("btnResetExam").addEventListener("click", resetExamForm);
}
