import { api } from "../api.js";
import { refreshCatalogForCurrentSpecimen } from "./exams-ui.js";

function $(id) {
  return document.getElementById(id);
}

function getSpecimenValues() {
  const raw = $("cat_specimen_types").value || "";
  return raw
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

function parseCsv(v) {
  return String(v || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

async function renderCatalogList() {
  const specimen = $("specimen_type")?.value || "";
  const search = $("cat_search").value.trim();
  const rows = await api.listCatalog({ search, specimen, only_enabled: true });

  const box = $("catalogList");
  if (!rows.length) {
    box.innerHTML = '<div class="muted">Nessun antibiotico in catalogo</div>';
    return;
  }

  box.innerHTML = rows
    .map(
      (r) => `
    <div class="card-item compact">
      <div>
        <strong>${r.antibiotic_name}</strong> ${r.aware_group ? `<span class="pill">${r.aware_group}</span>` : ""}<br/>
        <small>Classe: ${r.antibiotic_class || "-"} • Principio: ${r.active_ingredient || "-"}</small><br/>
        <small>Breakpoint: ${r.breakpoint_ref || "-"}</small><br/>
        <small>Campioni: ${(r.specimen_types || []).join(", ") || "-"}</small><br/>
        <small>Commerciali: ${(r.commercial_names || []).join(", ") || "-"}</small>
      </div>
      <div class="row">
        <button data-action="delete" data-id="${r.id}" class="danger">Rimuovi</button>
      </div>
    </div>
  `
    )
    .join("");

  box.querySelectorAll('button[data-action="delete"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Rimuovere antibiotico dal catalogo?")) return;
      await api.deleteCatalogItem(Number(btn.dataset.id));
      await renderCatalogList();
      await refreshCatalogForCurrentSpecimen();
    });
  });
}

export function bindCatalogUI() {
  $("btnSearchCatalog").addEventListener("click", renderCatalogList);

  $("catalogForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();

    const payload = {
      antibiotic_name: $("cat_antibiotic_name").value.trim(),
      antibiotic_class: $("cat_antibiotic_class").value.trim() || null,
      active_ingredient: $("cat_active_ingredient").value.trim() || null,
      breakpoint_ref: $("cat_breakpoint_ref").value.trim() || null,
      specimen_types: getSpecimenValues(),
      commercial_names: parseCsv($("cat_commercial_names").value),
      aware_group: $("cat_aware_group").value || null,
      notes: null,
      enabled: true,
    };

    if (!payload.antibiotic_name) {
      alert("Inserisci almeno il nome dell'antibiotico.");
      return;
    }
    if (!payload.specimen_types.length) {
      alert("Inserisci almeno un tipo campione (es. urine,feci).");
      return;
    }

    await api.createCatalogItem(payload);
    $("catalogForm").reset();
    await renderCatalogList();
    await refreshCatalogForCurrentSpecimen();
  });

  renderCatalogList();
}

export async function refreshCatalogUI() {
  await renderCatalogList();
}
