import { api } from "../api.js";
import { state } from "../state.js";

const DEFAULT_REPORT_SETTINGS = {
  report_title: "Referto Curva da Carico Orale di Glucosio",
  header_line1: "Laboratorio Analisi",
  header_line2: "Centro Polispecialistico",
  header_line3: "Referto di laboratorio",
  include_interpretation_pdf: true,
  merge_charts_pdf: true,
  header_logo_data_url: null,
};

function $(id) {
  return document.getElementById(id);
}

function esc(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parseBool(v, fallback = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    if (["1", "true", "si", "sì", "yes", "on"].includes(t)) return true;
    if (["0", "false", "no", "off"].includes(t)) return false;
  }
  return fallback;
}

function nowIT() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function fmtDateIT(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function normalizeSettings(data) {
  const s = { ...DEFAULT_REPORT_SETTINGS, ...(data || {}) };
  s.include_interpretation_pdf = parseBool(s.include_interpretation_pdf, true);
  s.merge_charts_pdf = parseBool(s.merge_charts_pdf, true);
  s.header_logo_data_url = s.header_logo_data_url || null;
  return s;
}

function setStatus(msg, ok = true) {
  const el = $("reportSettingsStatus");
  if (!el) return;
  el.textContent = msg || "";
  el.classList.toggle("status-ok", !!ok);
  el.classList.toggle("status-err", !ok);
}

function setLogoPreview(dataUrl) {
  const box = $("logoPreviewBox");
  if (!box) return;

  if (!dataUrl) {
    box.classList.add("muted");
    box.innerHTML = "Nessun logo impostato";
    return;
  }

  box.classList.remove("muted");
  box.innerHTML = `<img src="${esc(dataUrl)}" alt="Logo intestazione" class="logo-preview-img" />`;
}

function applySettingsToForm(settings) {
  $("report_title").value = settings.report_title || DEFAULT_REPORT_SETTINGS.report_title;
  $("header_line1").value = settings.header_line1 || "";
  $("header_line2").value = settings.header_line2 || "";
  $("header_line3").value = settings.header_line3 || "";
  $("include_interpretation_pdf").checked = !!settings.include_interpretation_pdf;
  $("merge_charts_pdf").checked = !!settings.merge_charts_pdf;
  setLogoPreview(settings.header_logo_data_url);
}

function getFormSettings() {
  return normalizeSettings({
    report_title: $("report_title").value.trim() || DEFAULT_REPORT_SETTINGS.report_title,
    header_line1: $("header_line1").value.trim(),
    header_line2: $("header_line2").value.trim(),
    header_line3: $("header_line3").value.trim(),
    include_interpretation_pdf: $("include_interpretation_pdf").checked,
    merge_charts_pdf: $("merge_charts_pdf").checked,
    header_logo_data_url: state.reportSettings?.header_logo_data_url || null,
  });
}

async function loadReportSettings() {
  try {
    const settings = normalizeSettings(await api.getReportSettings());
    state.reportSettings = settings;
    applySettingsToForm(settings);
    setStatus(`Impostazioni caricate (${nowIT()})`, true);
  } catch (err) {
    console.error(err);
    state.reportSettings = normalizeSettings();
    applySettingsToForm(state.reportSettings);
    setStatus("Impossibile caricare le impostazioni. Uso i default locali.", false);
  }
}

async function saveReportSettings() {
  const payload = getFormSettings();
  try {
    const saved = normalizeSettings(await api.saveReportSettings(payload));
    state.reportSettings = saved;
    applySettingsToForm(saved);
    setStatus(`Impostazioni salvate (${nowIT()})`, true);
  } catch (err) {
    console.error(err);
    setStatus(`Errore salvataggio impostazioni: ${err?.message || err}`, false);
  }
}

function parseMethodologyField(payload) {
  const out = { glyc: "", ins: "" };
  const raw = String(payload?.methodology || "");
  if (!raw) return out;

  const rxG = /glicemia\s*:\s*([^|]+)/i;
  const rxI = /insulina\s*:\s*([^|]+)/i;
  const g = raw.match(rxG);
  const i = raw.match(rxI);

  out.glyc = g?.[1]?.trim() || "";
  out.ins = i?.[1]?.trim() || "";
  return out;
}

function buildRows(times = [], values = [], refs = {}) {
  return times.map((t, i) => {
    const value = Number(values?.[i] ?? 0);
    const ref = refs?.[String(t)] || refs?.[t] || { min: 0, max: 0 };
    let status = "N";
    if (value < Number(ref.min)) status = "B";
    else if (value > Number(ref.max)) status = "A";

    return {
      time: t,
      value,
      refMin: Number(ref.min ?? 0),
      refMax: Number(ref.max ?? 0),
      status,
    };
  });
}

function canvasToImage(canvas) {
  if (!canvas) return null;
  const tmp = document.createElement("canvas");
  tmp.width = canvas.width;
  tmp.height = canvas.height;
  const tctx = tmp.getContext("2d");
  tctx.fillStyle = "#ffffff";
  tctx.fillRect(0, 0, tmp.width, tmp.height);
  tctx.drawImage(canvas, 0, 0);
  return tmp.toDataURL("image/png", 1.0);
}

function drawHeader(doc, settings, pageWidth, margin) {
  let yBase = 9;

  if (settings.header_logo_data_url) {
    try {
      doc.addImage(settings.header_logo_data_url, "PNG", margin, 7, 36, 16);
    } catch {
      // Ignora logo non valido
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(settings.header_line1 || "", pageWidth / 2, yBase + 2, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(settings.header_line2 || "", pageWidth / 2, yBase + 7, { align: "center" });
  doc.text(settings.header_line3 || "", pageWidth / 2, yBase + 11.5, { align: "center" });

  doc.setDrawColor(170);
  doc.line(margin, 25, pageWidth - margin, 25);

  return 31;
}

function ensureSpace(doc, y, needed, settings, pageWidth, pageHeight, margin) {
  if (y + needed <= pageHeight - margin) return y;
  doc.addPage();
  return drawHeader(doc, settings, pageWidth, margin);
}

function drawSectionTitle(doc, text, y, margin, pageWidth) {
  doc.setFillColor(240, 248, 242);
  doc.rect(margin, y - 4.5, pageWidth - margin * 2, 7, "F");
  doc.setTextColor(20, 98, 61);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(text, margin + 2, y);
  doc.setTextColor(0, 0, 0);
  return y + 5;
}

function drawMiniTable(doc, y, title, unit, rows, methodology, settings, pageWidth, pageHeight, margin) {
  y = ensureSpace(doc, y, 24, settings, pageWidth, pageHeight, margin);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(`${title} (${unit})`, margin, y);
  y += 2;

  const x0 = margin;
  const widths = [24, 30, 30, 30, 18];
  const headers = ["Tempo", "Valore", "Ref min", "Ref max", "Stato"];
  const rowH = 6;

  doc.setFillColor(237, 242, 247);
  doc.rect(x0, y + 1, widths.reduce((a, b) => a + b, 0), rowH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  let x = x0 + 1.8;
  headers.forEach((h, i) => {
    doc.text(h, x, y + 5);
    x += widths[i];
  });

  y += rowH + 1;

  doc.setFont("helvetica", "normal");
  rows.forEach((r, idx) => {
    y = ensureSpace(doc, y, rowH + 2, settings, pageWidth, pageHeight, margin);

    if (idx % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(x0, y, widths.reduce((a, b) => a + b, 0), rowH, "F");
    }

    const statusTxt = r.status === "N" ? "OK" : r.status === "A" ? "ALTO" : "BASSO";
    const vals = [`${r.time}'`, `${r.value.toFixed(1)}`, `${r.refMin.toFixed(1)}`, `${r.refMax.toFixed(1)}`, statusTxt];

    x = x0 + 1.8;
    vals.forEach((v, i) => {
      if (i === 4 && statusTxt !== "OK") {
        doc.setTextColor(185, 28, 28);
        doc.setFont("helvetica", "bold");
      } else {
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
      }
      doc.text(String(v), x, y + 4.3);
      x += widths[i];
    });

    y += rowH;
  });

  y += 1;
  if (methodology) {
    y = ensureSpace(doc, y, 8, settings, pageWidth, pageHeight, margin);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Metodica analitica:", margin, y + 4);

    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(methodology, pageWidth - margin * 2 - 32);
    doc.text(wrapped, margin + 32, y + 4);
    y += Math.max(6, wrapped.length * 4.4);
  }

  return y + 2;
}

function drawStatusBadge(doc, y, overall, summary, margin, settings, pageWidth, pageHeight) {
  y = ensureSpace(doc, y, 14, settings, pageWidth, pageHeight, margin);

  let fill = [230, 245, 230];
  let text = [22, 101, 52];
  if (overall === "warning") {
    fill = [255, 248, 220];
    text = [146, 64, 14];
  }
  if (overall === "danger") {
    fill = [254, 226, 226];
    text = [153, 27, 27];
  }

  doc.setFillColor(...fill);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 11, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...text);
  doc.setFontSize(10.5);
  doc.text(summary || "", margin + 2, y + 7);
  doc.setTextColor(0, 0, 0);

  return y + 14;
}

function addFooterOnAllPages(doc, margin) {
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setDrawColor(190);
    doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Generato il ${nowIT()} • CurvaLab WebApp`, margin, pageHeight - 8);
    doc.text(`Pagina ${p}/${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }
}

function chartImagesForReport(payload, settings) {
  const mode = payload.curve_mode;
  const merge = !!settings.merge_charts_pdf;

  const g = $("glycChart");
  const i = $("insChart");
  const c = $("combinedChart");

  const out = [];

  if (merge && mode === "combined" && c) {
    const img = canvasToImage(c);
    if (img) out.push({ title: "Grafico combinato glicemia + insulina", image: img });
    return out;
  }

  if ((mode === "glyc" || mode === "combined") && g) {
    const img = canvasToImage(g);
    if (img) out.push({ title: "Curva glicemica", image: img });
  }
  if ((mode === "ins" || mode === "combined") && i) {
    const img = canvasToImage(i);
    if (img) out.push({ title: "Curva insulinemica", image: img });
  }

  return out;
}

function generatePdf() {
  if (!state.selectedPatient) {
    alert("Seleziona un paziente prima di generare il PDF.");
    return;
  }
  if (!state.lastPayload) {
    alert("Mancano i dati dell'esame: fai prima 'Calcola interpretazione' o apri un esame salvato.");
    return;
  }
  if (!state.interpretation) {
    alert("Manca l'interpretazione. Calcola prima i risultati.");
    return;
  }

  const payload = state.lastPayload;
  const settings = normalizeSettings({ ...state.reportSettings, ...getFormSettings() });
  state.reportSettings = settings;

  const meth = parseMethodologyField(payload);

  const glycRows = buildRows(payload.glyc_times, payload.glyc_values, payload.glyc_refs);
  const insRows = buildRows(payload.ins_times, payload.ins_values, payload.ins_refs);

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let y = drawHeader(doc, settings, pageWidth, margin);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(20, 98, 61);
  doc.text(settings.report_title || DEFAULT_REPORT_SETTINGS.report_title, pageWidth / 2, y, { align: "center" });
  doc.setTextColor(0, 0, 0);
  y += 8;

  y = drawSectionTitle(doc, "Dati paziente", y, margin, pageWidth);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const p = state.selectedPatient;
  const left = [
    `Cognome e nome: ${p.surname || ""} ${p.name || ""}`,
    `Data di nascita: ${fmtDateIT(p.birth_date) || "-"}`,
    `Sesso: ${p.sex || "-"}`,
  ];
  const right = [
    `Codice fiscale: ${p.fiscal_code || "-"}`,
    `N° accettazione: ${payload.acceptance_number || "-"}`,
    `Data esame: ${fmtDateIT(payload.exam_date) || "-"}`,
  ];

  left.forEach((line, idx) => doc.text(line, margin, y + idx * 5.2));
  right.forEach((line, idx) => doc.text(line, margin + 95, y + idx * 5.2));
  y += 18;

  y = ensureSpace(doc, y, 20, settings, pageWidth, pageHeight, margin);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("Dati tecnici esame", margin, y);
  y += 5.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(`Tipo curva: ${payload.curve_mode === "combined" ? "Combinata" : payload.curve_mode === "glyc" ? "Glicemica" : "Insulinemica"}`, margin, y);
  doc.text(`Carico glucosio: ${payload.glucose_load_g || 75} g`, margin + 70, y);
  doc.text(`Modalità gravidanza: ${payload.pregnant_mode ? "SÌ" : "NO"}`, margin + 125, y);
  y += 8;

  y = drawStatusBadge(
    doc,
    y,
    state.interpretation?.overall_status || "normal",
    state.interpretation?.summary || "",
    margin,
    settings,
    pageWidth,
    pageHeight
  );

  y = drawSectionTitle(doc, "Risultati analitici", y, margin, pageWidth);

  const showG = payload.curve_mode === "glyc" || payload.curve_mode === "combined";
  const showI = payload.curve_mode === "ins" || payload.curve_mode === "combined";

  if (showG) {
    y = drawMiniTable(
      doc,
      y,
      "Curva glicemica",
      payload.glyc_unit || "mg/dL",
      glycRows,
      meth.glyc || "",
      settings,
      pageWidth,
      pageHeight,
      margin
    );
  }

  if (showI) {
    y = drawMiniTable(
      doc,
      y,
      "Curva insulinemica",
      payload.ins_unit || "µUI/mL",
      insRows,
      meth.ins || "",
      settings,
      pageWidth,
      pageHeight,
      margin
    );
  }

  if (settings.include_interpretation_pdf) {
    y = drawSectionTitle(doc, "Interpretazione", y, margin, pageWidth);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.8);

    const details = state.interpretation?.details || {};
    const chunks = [
      state.interpretation?.summary || "",
      details.glycemic_interpretation ? `Glicemia: ${details.glycemic_interpretation}` : "",
      details.insulin_interpretation ? `Insulina: ${details.insulin_interpretation}` : "",
    ].filter(Boolean);

    for (const ch of chunks) {
      const wrapped = doc.splitTextToSize(ch, pageWidth - margin * 2);
      y = ensureSpace(doc, y, wrapped.length * 4.3 + 2, settings, pageWidth, pageHeight, margin);
      doc.text(wrapped, margin, y + 4);
      y += wrapped.length * 4.3 + 1;
    }
  }

  if (payload.notes) {
    y = drawSectionTitle(doc, "Note", y, margin, pageWidth);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.8);
    const wrapped = doc.splitTextToSize(payload.notes, pageWidth - margin * 2);
    y = ensureSpace(doc, y, wrapped.length * 4.2 + 2, settings, pageWidth, pageHeight, margin);
    doc.text(wrapped, margin, y + 4);
    y += wrapped.length * 4.2 + 1;
  }

  const sourceName = state.refs?.metadata?.source_name || state.refs?.metadata?.dataset_name || "";
  const sourceVersion = state.refs?.metadata?.dataset_version || state.refs?.metadata?.version || "";
  if (sourceName || sourceVersion) {
    y = ensureSpace(doc, y, 8, settings, pageWidth, pageHeight, margin);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(90);
    const txt = `Valori di riferimento: ${[sourceName, sourceVersion].filter(Boolean).join(" • ")}`;
    doc.text(txt, margin, y + 4);
    doc.setTextColor(0, 0, 0);
    y += 7;
  }

  const charts = chartImagesForReport(payload, settings);
  if (charts.length) {
    y = drawSectionTitle(doc, "Grafici", y, margin, pageWidth);
    for (const c of charts) {
      y = ensureSpace(doc, y, 74, settings, pageWidth, pageHeight, margin);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(c.title, margin, y + 3);
      y += 4;
      doc.addImage(c.image, "PNG", margin, y, pageWidth - margin * 2, 62);
      y += 65;
    }
  }

  addFooterOnAllPages(doc, margin);

  const surname = (p.surname || "paziente").replace(/[^a-z0-9_-]/gi, "_");
  const name = (p.name || "").replace(/[^a-z0-9_-]/gi, "_");
  const fileName = `Referto_Curva_${surname}_${name}_${payload.exam_date || ""}.pdf`;
  doc.save(fileName);
}

function bindLogoUpload() {
  const fileInput = $("header_logo_file");
  if (!fileInput) return;

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Seleziona un file immagine valido.");
      fileInput.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : null;
      state.reportSettings = normalizeSettings({ ...state.reportSettings, header_logo_data_url: dataUrl });
      setLogoPreview(dataUrl);
      setStatus("Logo caricato. Salva le impostazioni per renderlo predefinito.", true);
    };
    reader.onerror = () => {
      setStatus("Errore lettura logo.", false);
    };
    reader.readAsDataURL(file);
  });

  $("btnRemoveLogo")?.addEventListener("click", () => {
    state.reportSettings = normalizeSettings({ ...state.reportSettings, header_logo_data_url: null });
    if (fileInput) fileInput.value = "";
    setLogoPreview(null);
    setStatus("Logo rimosso. Salva le impostazioni per confermare.", true);
  });
}

export function bindReportUI() {
  $("btnPdf")?.addEventListener("click", generatePdf);
  $("btnSaveReportSettings")?.addEventListener("click", saveReportSettings);
  bindLogoUpload();
  loadReportSettings();
}
