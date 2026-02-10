import { api } from "../api.js";
import { state } from "../state.js";

const FALLBACK_REPORT_SETTINGS = {
  report_title: "Referto Esame Microbiologico con MIC",
  header_line1: "Centro Polispecialistico Giovanni Paolo I srl",
  header_line2: "Laboratorio Analisi",
  header_line3: "",
  include_interpretation_pdf: true,
  include_commercial_names_pdf: true,
  header_logo_data_url: null,
};

function $(id) {
  return document.getElementById(id);
}

function safe(v) {
  return String(v ?? "").trim();
}

function csv(list) {
  return (list || []).map((x) => String(x).trim()).filter(Boolean).join(", ");
}

function interpText(v) {
  const x = String(v || "-").toUpperCase();
  if (x === "S") return "Sensibile";
  if (x === "I") return "Sensibile con aumentata esposizione";
  if (x === "R") return "Resistente";
  return "Non interpretato";
}

function fmtDate(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

function patientFullName(patient) {
  return `${safe(patient?.surname)} ${safe(patient?.name)}`.trim() || "-";
}

function readCurrentReportSettingsFromUI() {
  return {
    report_title: $("report_title")?.value || "",
    header_line1: $("header_line1")?.value || "",
    header_line2: $("header_line2")?.value || "",
    header_line3: $("header_line3")?.value || "",
    include_interpretation_pdf: !!$("include_interpretation_pdf")?.checked,
    include_commercial_names_pdf: !!$("include_commercial_names_pdf")?.checked,
    header_logo_data_url: state.reportSettings?.header_logo_data_url || null,
  };
}

function applyReportSettingsToUI(s) {
  $("report_title").value = s.report_title || "";
  $("header_line1").value = s.header_line1 || "";
  $("header_line2").value = s.header_line2 || "";
  $("header_line3").value = s.header_line3 || "";
  $("include_interpretation_pdf").checked = !!s.include_interpretation_pdf;
  $("include_commercial_names_pdf").checked = !!s.include_commercial_names_pdf;
  renderLogoPreview(s.header_logo_data_url || null);
}

function renderLogoPreview(dataUrl) {
  const box = $("logoPreviewBox");
  if (!box) return;
  box.innerHTML = "";
  if (!dataUrl) {
    box.innerHTML = '<span class="muted">Nessun logo caricato</span>';
    return;
  }
  const img = document.createElement("img");
  img.src = dataUrl;
  img.alt = "Logo intestazione";
  box.appendChild(img);
}

async function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

function ensureSpace(doc, y, need, marginTop = 12, marginBottom = 12) {
  if (y + need <= 297 - marginBottom) return y;
  doc.addPage();
  return marginTop;
}

function drawHeader(doc, settings, pageWidth, margin) {
  let y = 10;
  const hasText = [settings.header_line1, settings.header_line2, settings.header_line3].some((x) => safe(x));

  // Area logo/intestazione
  if (settings.header_logo_data_url) {
    const logoH = hasText ? 24 : 36;
    try {
      doc.addImage(settings.header_logo_data_url, "PNG", margin, y, pageWidth - margin * 2, logoH, undefined, "FAST");
      doc.setDrawColor(200, 210, 226);
      doc.rect(margin, y, pageWidth - margin * 2, logoH);
      y += logoH + 3;
    } catch (_) {
      // fallback silenzioso
    }
  }

  if (hasText) {
    doc.setTextColor(20, 38, 63);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    if (safe(settings.header_line1)) doc.text(safe(settings.header_line1), pageWidth / 2, y, { align: "center" });
    y += safe(settings.header_line1) ? 5 : 0;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    if (safe(settings.header_line2)) doc.text(safe(settings.header_line2), pageWidth / 2, y, { align: "center" });
    y += safe(settings.header_line2) ? 4.5 : 0;
    if (safe(settings.header_line3)) doc.text(safe(settings.header_line3), pageWidth / 2, y, { align: "center" });
    y += safe(settings.header_line3) ? 5 : 2;
  }

  const title = safe(settings.report_title) || "Referto Esame Microbiologico con MIC";
  doc.setFillColor(236, 244, 255);
  doc.setDrawColor(183, 205, 236);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 9, 2, 2, "FD");
  doc.setTextColor(16, 51, 104);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, pageWidth / 2, y + 6, { align: "center" });

  return y + 12;
}

function drawPatientBox(doc, y, pageWidth, margin, payload, patient) {
  const boxW = pageWidth - margin * 2;
  const rowH = 7;

  doc.setFillColor(247, 250, 255);
  doc.setDrawColor(202, 215, 232);
  doc.roundedRect(margin, y, boxW, rowH * 4 + 4, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 41, 67);
  doc.setFontSize(10);
  doc.text("Dati paziente e campione", margin + 3, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.2);

  const leftX = margin + 3;
  const rightX = margin + boxW / 2 + 2;
  let yy = y + 10;

  doc.text(`Paziente: ${patientFullName(patient)}`, leftX, yy);
  doc.text(`Data nascita: ${fmtDate(patient?.birth_date) || "-"}`, rightX, yy);
  yy += rowH;

  doc.text(`Sesso: ${safe(patient?.sex) || "-"}`, leftX, yy);
  doc.text(`CF: ${safe(patient?.fiscal_code) || "-"}`, rightX, yy);
  yy += rowH;

  doc.text(`Data esame: ${fmtDate(payload?.exam_date) || "-"}`, leftX, yy);
  doc.text(`Accettazione: ${safe(payload?.acceptance_number) || "-"}`, rightX, yy);
  yy += rowH;

  doc.text(`Campione: ${safe(payload?.specimen_type) || "-"}`, leftX, yy);
  doc.text(`Microrganismo: ${safe(payload?.microorganism) || "-"}`, rightX, yy);

  return y + rowH * 4 + 8;
}

function drawTableHeader(doc, y, x, cols) {
  let cursor = x;
  doc.setFillColor(235, 243, 255);
  doc.setDrawColor(175, 196, 226);
  doc.setTextColor(25, 56, 99);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);

  for (const c of cols) {
    doc.rect(cursor, y, c.w, 7, "FD");
    doc.text(c.label, cursor + 1.4, y + 4.7, { maxWidth: c.w - 2 });
    cursor += c.w;
  }
  return y + 7;
}

function drawTableRows(doc, y, x, rows, cols, pageWidth, margin) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.1);
  doc.setTextColor(24, 35, 52);

  let rowIndex = 0;
  for (const r of rows) {
    const values = cols.map((c) => String(c.value(r) ?? ""));
    const wrapped = values.map((v, i) => doc.splitTextToSize(v, cols[i].w - 2));
    const lines = Math.max(1, ...wrapped.map((w) => w.length));
    const h = Math.max(6.4, lines * 3.7 + 1.4);

    y = ensureSpace(doc, y, h + 1);
    if (y <= 13.5) {
      y = drawTableHeader(doc, y, x, cols);
    }

    if (rowIndex % 2 === 1) {
      doc.setFillColor(250, 252, 255);
      doc.rect(x, y, pageWidth - margin * 2, h, "F");
    }

    let cx = x;
    for (let i = 0; i < cols.length; i++) {
      doc.setDrawColor(222, 229, 238);
      doc.rect(cx, y, cols[i].w, h);
      doc.text(wrapped[i], cx + 1.1, y + 3.2, { maxWidth: cols[i].w - 2, baseline: "top" });
      cx += cols[i].w;
    }
    y += h;
    rowIndex += 1;
  }
  return y;
}

function addAntibiogramSection(doc, y, payload, settings) {
  const rows = payload?.antibiogram || [];
  const margin = 12;
  const pageWidth = 210;
  const x = margin;

  y = ensureSpace(doc, y, 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.2);
  doc.setTextColor(20, 40, 70);
  doc.text("Antibiogramma MIC", x, y);
  y += 3.5;

  const cols = [
    { key: "antibiotic_name", label: "Antibiotico", w: 21, value: (r) => r.antibiotic_name || "-" },
    { key: "antibiotic_class", label: "Classe", w: 17, value: (r) => r.antibiotic_class || "-" },
    { key: "active_ingredient", label: "Principio attivo", w: 24, value: (r) => r.active_ingredient || "-" },
    {
      key: "commercial_names",
      label: "N. commerciale",
      w: 24,
      value: (r) => settings.include_commercial_names_pdf ? csv(r.commercial_names) || "-" : "-",
    },
    { key: "mic", label: "MIC", w: 10, value: (r) => r.mic || "-" },
    { key: "breakpoint_ref", label: "Breakpoint", w: 18, value: (r) => r.breakpoint_ref || "-" },
    { key: "sir", label: "S/I/R", w: 8, value: (r) => (r.interpretation || "-") },
    { key: "interp", label: "Interpretazione", w: 30, value: (r) => interpText(r.interpretation) },
  ];

  y = drawTableHeader(doc, y, x, cols);
  if (!rows.length) {
    doc.setFont("helvetica", "italic");
    doc.text("Nessun antibiotico inserito.", x + 2, y + 5);
    y += 8;
    return y;
  }

  y = drawTableRows(doc, y, x, rows, cols, pageWidth, margin);
  return y + 2;
}

function addInterpretationSection(doc, y, interpretation, includeInterpretation, pageWidth, margin) {
  if (!includeInterpretation || !interpretation) return y;

  y = ensureSpace(doc, y, 42);
  doc.setFillColor(247, 251, 255);
  doc.setDrawColor(197, 214, 235);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 38, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(19, 50, 95);
  doc.text("Interpretazione diagnostica", margin + 3, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.8);
  doc.setTextColor(30, 42, 58);
  const summary = doc.splitTextToSize(interpretation.summary || "-", pageWidth - margin * 2 - 6);
  doc.text(summary, margin + 3, y + 11);

  let yy = y + 11 + summary.length * 3.5 + 1.5;
  const fc = interpretation.first_choice;
  const firstChoiceText = fc
    ? `Prima scelta consigliata: ${fc.antibiotic_name}${(fc.commercial_names || []).length ? ` (${(fc.commercial_names || []).join(", ")})` : ""}`
    : "Prima scelta consigliata: nessuna (assenza di antibiotici S).";
  const line1 = doc.splitTextToSize(firstChoiceText, pageWidth - margin * 2 - 6);
  doc.text(line1, margin + 3, yy);
  yy += line1.length * 3.5 + 1;

  const patterns = (interpretation.resistance_patterns || []).join(" • ");
  if (patterns) {
    const patt = doc.splitTextToSize(`Pattern di resistenza: ${patterns}`, pageWidth - margin * 2 - 6);
    doc.text(patt, margin + 3, yy);
  }

  return y + 40;
}

function addFooterNotes(doc, y, payload, interpretation, pageWidth, margin) {
  y = ensureSpace(doc, y, 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  doc.setTextColor(34, 48, 68);

  const methodology = safe(payload?.methodology) || "n/d";
  const methodLines = doc.splitTextToSize(`Metodica analitica: ${methodology}`, pageWidth - margin * 2);
  doc.text(methodLines, margin, y);
  y += methodLines.length * 3.6 + 1.6;

  const notes = safe(payload?.notes);
  if (notes) {
    const noteLines = doc.splitTextToSize(`Note: ${notes}`, pageWidth - margin * 2);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 3.6 + 1.6;
  }

  const warns = interpretation?.warnings || [];
  if (warns.length) {
    const warnLines = doc.splitTextToSize(`Avvertenze: ${warns.join(" • ")}`, pageWidth - margin * 2);
    doc.text(warnLines, margin, y);
    y += warnLines.length * 3.6 + 1.6;
  }

  y = ensureSpace(doc, y, 14);
  doc.setTextColor(90, 102, 118);
  doc.setFontSize(8);
  doc.text(
    "Referto generato automaticamente. Validazione clinica e terapeutica a cura del medico responsabile.",
    margin,
    y
  );
  doc.text(`Data stampa: ${new Date().toLocaleString("it-IT")}`, 210 - margin, y, { align: "right" });

  return y;
}

function generatePdf() {
  if (!state.selectedPatient) {
    alert("Seleziona un paziente.");
    return;
  }
  if (!state.lastPayload) {
    alert("Calcola prima la preview o salva un esame.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });

  const pageWidth = 210;
  const margin = 12;

  const settings = { ...FALLBACK_REPORT_SETTINGS, ...(state.reportSettings || {}), ...readCurrentReportSettingsFromUI() };
  const payload = state.lastPayload;
  const interpretation = state.interpretation || null;

  let y = drawHeader(doc, settings, pageWidth, margin);
  y = ensureSpace(doc, y, 40);
  y = drawPatientBox(doc, y, pageWidth, margin, payload, state.selectedPatient);
  y = addAntibiogramSection(doc, y + 2, payload, settings);
  y = addInterpretationSection(doc, y + 1, interpretation, settings.include_interpretation_pdf, pageWidth, margin);
  addFooterNotes(doc, y + 3, payload, interpretation, pageWidth, margin);

  const datePart = payload.exam_date ? String(payload.exam_date).replaceAll("-", "") : new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const p = state.selectedPatient;
  const fileName = `Referto_MIC_${safe(p?.surname) || "Paziente"}_${safe(p?.name) || ""}_${datePart}.pdf`;
  doc.save(fileName);
}

export async function bindReportUI() {
  try {
    const saved = await api.getReportSettings();
    state.reportSettings = { ...FALLBACK_REPORT_SETTINGS, ...(saved || {}) };
    applyReportSettingsToUI(state.reportSettings);
  } catch (e) {
    state.reportSettings = { ...FALLBACK_REPORT_SETTINGS };
    applyReportSettingsToUI(state.reportSettings);
  }

  $("btnSaveReportSettings").addEventListener("click", async () => {
    const status = $("reportSettingsStatus");
    status.textContent = "Salvataggio...";
    status.className = "muted";
    try {
      const payload = readCurrentReportSettingsFromUI();
      payload.header_logo_data_url = state.reportSettings?.header_logo_data_url || null;
      const saved = await api.saveReportSettings(payload);
      state.reportSettings = { ...FALLBACK_REPORT_SETTINGS, ...saved };
      status.textContent = "Impostazioni salvate.";
      status.className = "status-ok";
    } catch (e) {
      status.textContent = "Errore salvataggio: " + e.message;
      status.className = "status-err";
    }
  });

  $("header_logo_file").addEventListener("change", async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Seleziona un file immagine valido.");
      ev.target.value = "";
      return;
    }
    try {
      const dataUrl = await readFileAsDataURL(file);
      state.reportSettings = state.reportSettings || { ...FALLBACK_REPORT_SETTINGS };
      state.reportSettings.header_logo_data_url = dataUrl;
      renderLogoPreview(dataUrl);
    } catch (e) {
      alert("Impossibile leggere il logo.");
    } finally {
      ev.target.value = "";
    }
  });

  $("btnRemoveLogo").addEventListener("click", () => {
    state.reportSettings = state.reportSettings || { ...FALLBACK_REPORT_SETTINGS };
    state.reportSettings.header_logo_data_url = null;
    renderLogoPreview(null);
  });

  $("btnPdf").addEventListener("click", generatePdf);
}
