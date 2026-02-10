const STORAGE_KEY = "microlab_localdb_v2";
const REPORT_SETTINGS_KEY = "microlab_report_settings_v2";

const SPECIMEN_TYPES = [
  { id: "urine", label: "Urine" },
  { id: "feci", label: "Feci" },
  { id: "orofaringeo", label: "Tampone orofaringeo" },
  { id: "espettorato", label: "Espettorato" },
  { id: "ferita", label: "Tampone ferita" },
  { id: "sangue", label: "Emocoltura" },
];

const DEFAULT_METHODOLOGIES = {
  culture: "Coltura su terreni selettivi + identificazione biochimica/MALDI-TOF",
  mic: "Determinazione MIC (broth microdilution o sistema automatizzato) interpretata secondo breakpoint EUCAST",
};

const REFERENCES_METADATA = {
  profile_id: "micro-amr-guidelines-2026.02",
  profile_name: "Microbiology MIC Guidance Profile",
  dataset_name: "CDC + NICE + IDSA + EUCAST + WHO AWaRe (sintesi operativa locale)",
  dataset_version: "2026.02",
  updated_at: "2026-02-10",
  sources: [
    "NICE NG109 (UTI)",
    "CDC Campylobacter e advisory Shigella XDR",
    "IDSA streptococcal pharyngitis",
    "EUCAST breakpoint tables e definizioni S/I/R",
    "WHO AWaRe classification",
  ],
  notes: "Pannelli predefiniti orientativi. La scelta finale va integrata con quadro clinico e linee guida locali.",
};

const ANTI_META = {
  "Fosfomicina": { antibiotic_class: "Fosfonati", breakpoint_ref: "EUCAST 2026" },
  "Nitrofurantoina": { antibiotic_class: "Nitrofurani", breakpoint_ref: "EUCAST 2026" },
  "Amoxicillina/Acido clavulanico": { antibiotic_class: "Beta-lattamici + inibitore", breakpoint_ref: "EUCAST 2026" },
  "Trimetoprim/Sulfametossazolo": { antibiotic_class: "Folatoinibitori", breakpoint_ref: "EUCAST 2026" },
  "Ciprofloxacina": { antibiotic_class: "Fluorochinoloni", breakpoint_ref: "EUCAST 2026" },
  "Ceftriaxone": { antibiotic_class: "Cefalosporine III", breakpoint_ref: "EUCAST 2026" },
  "Gentamicina": { antibiotic_class: "Aminoglicosidi", breakpoint_ref: "EUCAST 2026" },
  "Azitromicina": { antibiotic_class: "Macrolidi", breakpoint_ref: "EUCAST 2026" },
  "Ampicillina": { antibiotic_class: "Aminopenicilline", breakpoint_ref: "EUCAST 2026" },
  "Penicillina V": { antibiotic_class: "Penicilline naturali", breakpoint_ref: "EUCAST 2026" },
  "Amoxicillina": { antibiotic_class: "Aminopenicilline", breakpoint_ref: "EUCAST 2026" },
  "Cefalexina": { antibiotic_class: "Cefalosporine I", breakpoint_ref: "EUCAST 2026" },
  "Clindamicina": { antibiotic_class: "Lincosamidi", breakpoint_ref: "EUCAST 2026" },
  "Claritromicina": { antibiotic_class: "Macrolidi", breakpoint_ref: "EUCAST 2026" },
  "Levofloxacina": { antibiotic_class: "Fluorochinoloni", breakpoint_ref: "EUCAST 2026" },
  "Piperacillina/Tazobactam": { antibiotic_class: "Ureidopenicillina + inibitore", breakpoint_ref: "EUCAST 2026" },
  "Vancomicina": { antibiotic_class: "Glicopeptidi", breakpoint_ref: "EUCAST 2026" },
  "Linezolid": { antibiotic_class: "Oxazolidinoni", breakpoint_ref: "EUCAST 2026" },
  "Meropenem": { antibiotic_class: "Carbapenemi", breakpoint_ref: "EUCAST 2026" },
};

const RAW_DEFAULT_CATALOG = [
  { antibiotic_name: "Fosfomicina", active_ingredient: "fosfomycin trometamol", specimen_types: ["urine"], commercial_names: ["Monuril", "Monurol"], aware_group: "Access", enabled: true },
  { antibiotic_name: "Nitrofurantoina", active_ingredient: "nitrofurantoin", specimen_types: ["urine"], commercial_names: ["Macrobid"], aware_group: "Access", enabled: true },
  { antibiotic_name: "Amoxicillina/Acido clavulanico", active_ingredient: "amoxicillin + clavulanic acid", specimen_types: ["urine", "orofaringeo", "espettorato"], commercial_names: ["Augmentin"], aware_group: "Access", enabled: true },
  { antibiotic_name: "Trimetoprim/Sulfametossazolo", active_ingredient: "trimethoprim + sulfamethoxazole", specimen_types: ["urine", "feci"], commercial_names: ["Bactrim"], aware_group: "Access", enabled: true },
  { antibiotic_name: "Ciprofloxacina", active_ingredient: "ciprofloxacin", specimen_types: ["urine", "feci"], commercial_names: ["Cipro", "Ciproxin"], aware_group: "Watch", enabled: true },
  { antibiotic_name: "Ceftriaxone", active_ingredient: "ceftriaxone", specimen_types: ["urine", "feci", "sangue"], commercial_names: ["Rocephin"], aware_group: "Watch", enabled: true },
  { antibiotic_name: "Gentamicina", active_ingredient: "gentamicin", specimen_types: ["urine", "sangue"], commercial_names: [], aware_group: "Access", enabled: true },
  { antibiotic_name: "Azitromicina", active_ingredient: "azithromycin", specimen_types: ["feci"], commercial_names: ["Zithromax", "Zitromax"], aware_group: "Watch", enabled: true },
  { antibiotic_name: "Ampicillina", active_ingredient: "ampicillin", specimen_types: ["feci"], commercial_names: [], aware_group: "Access", enabled: true },
  { antibiotic_name: "Penicillina V", active_ingredient: "phenoxymethylpenicillin", specimen_types: ["orofaringeo"], commercial_names: [], aware_group: "Access", enabled: true },
  { antibiotic_name: "Amoxicillina", active_ingredient: "amoxicillin", specimen_types: ["orofaringeo"], commercial_names: ["Zimox", "Amoxil"], aware_group: "Access", enabled: true },
  { antibiotic_name: "Cefalexina", active_ingredient: "cephalexin", specimen_types: ["orofaringeo"], commercial_names: ["Keflex"], aware_group: "Access", enabled: true },
  { antibiotic_name: "Clindamicina", active_ingredient: "clindamycin", specimen_types: ["orofaringeo"], commercial_names: ["Dalacin C"], aware_group: "Access", enabled: true },
  { antibiotic_name: "Claritromicina", active_ingredient: "clarithromycin", specimen_types: ["orofaringeo"], commercial_names: ["Klacid", "Biaxin"], aware_group: "Watch", enabled: true },
  { antibiotic_name: "Levofloxacina", active_ingredient: "levofloxacin", specimen_types: ["espettorato"], commercial_names: ["Tavanic", "Levaquin"], aware_group: "Watch", enabled: true },
  { antibiotic_name: "Piperacillina/Tazobactam", active_ingredient: "piperacillin + tazobactam", specimen_types: ["espettorato", "ferita", "sangue"], commercial_names: ["Tazocin", "Zosyn"], aware_group: "Watch", enabled: true },
  { antibiotic_name: "Vancomicina", active_ingredient: "vancomycin", specimen_types: ["ferita", "sangue"], commercial_names: [], aware_group: "Watch", enabled: true },
  { antibiotic_name: "Linezolid", active_ingredient: "linezolid", specimen_types: ["ferita", "sangue"], commercial_names: ["Zyvoxid"], aware_group: "Reserve", enabled: true },
  { antibiotic_name: "Meropenem", active_ingredient: "meropenem", specimen_types: ["sangue", "ferita"], commercial_names: ["Merrem"], aware_group: "Watch", enabled: true },
];

const DEFAULT_CATALOG = RAW_DEFAULT_CATALOG.map((x) => ({ ...x, ...(ANTI_META[x.antibiotic_name] || {}) }));

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function nowIso() {
  return new Date().toISOString();
}

function defaultDb() {
  const catalog = DEFAULT_CATALOG.map((x, idx) => ({
    id: idx + 1,
    ...deepClone(x),
    notes: x.notes || null,
    created_at: nowIso(),
    updated_at: nowIso(),
  }));
  return {
    patients: [],
    exams: [],
    catalog,
    seq: { patient: 1, exam: 1, catalog: catalog.length + 1 },
  };
}

function readDb() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const db = defaultDb();
    writeDb(db);
    return db;
  }
  try {
    const db = JSON.parse(raw);
    if (!db || typeof db !== "object") throw new Error("bad db");
    db.patients = Array.isArray(db.patients) ? db.patients : [];
    db.exams = Array.isArray(db.exams) ? db.exams : [];
    db.catalog = Array.isArray(db.catalog) ? db.catalog : [];
    db.seq = db.seq || { patient: 1, exam: 1, catalog: 1 };
    return db;
  } catch {
    const db = defaultDb();
    writeDb(db);
    return db;
  }
}

function writeDb(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function readSettings() {
  const raw = localStorage.getItem(REPORT_SETTINGS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeSettings(s) {
  localStorage.setItem(REPORT_SETTINGS_KEY, JSON.stringify(s));
}

const DEFAULT_REPORT_SETTINGS = {
  report_title: "Referto Esame Microbiologico con MIC",
  header_line1: "Centro Polispecialistico Giovanni Paolo I srl",
  header_line2: "Laboratorio Analisi",
  header_line3: "Referto microbiologico",
  include_interpretation_pdf: true,
  include_commercial_names_pdf: true,
  header_logo_data_url: null,
};

function normalizeInterp(v) {
  const s = String(v || "").trim().toUpperCase();
  if (["S", "SUSCETTIBILE", "SENSITIVE"].includes(s)) return "S";
  if (["I", "INTERMEDIO", "INCREASED EXPOSURE"].includes(s)) return "I";
  if (["R", "RESISTENTE", "RESISTANT"].includes(s)) return "R";
  return "-";
}

const awarePriority = { Access: 0, Watch: 1, Reserve: 2, Other: 3 };

function parseMicNumeric(v) {
  if (!v) return null;
  const s = String(v).replace(",", ".").replace(/[^0-9.]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function withDerived(entry) {
  const sir = normalizeInterp(entry.interpretation);
  return {
    ...entry,
    interpretation: sir,
    antibiotic_class: entry.antibiotic_class || null,
    breakpoint_ref: entry.breakpoint_ref || null,
    commercial_names: Array.isArray(entry.commercial_names) ? entry.commercial_names : [],
    mic_numeric: parseMicNumeric(entry.mic),
  };
}

function computeResistancePatterns(specimen, rows) {
  const resistant = rows.filter((x) => x.interpretation === "R");
  const names = resistant.map((x) => String(x.antibiotic_name || "").toLowerCase());
  const patterns = [];

  const hasFq = names.some((n) => n.includes("cipro") || n.includes("levoflox"));
  const has3genCeph = names.some((n) => n.includes("ceftriax") || n.includes("cefotax") || n.includes("ceftaz"));
  const hasCarb = names.some((n) => n.includes("meropen") || n.includes("imipenem") || n.includes("ertapen"));

  if (resistant.length >= 3) {
    patterns.push("Multi-resistenza (MDR) sospetta: ≥3 antibiotici classificati R.");
  }
  if (hasFq && has3genCeph) {
    patterns.push("Pattern compatibile con possibile ESBL: resistenza a cefalosporine di III gen e fluorochinoloni.");
  }
  if (hasCarb) {
    patterns.push("Attenzione: resistenza ai carbapenemi nel pannello testato.");
  }
  if (specimen === "feci" && resistant.length >= 2) {
    patterns.push("Nelle enteriti batteriche valutare terapia solo se indicata clinicamente.");
  }
  return patterns;
}

function interpret(payload) {
  const specimen = String(payload.specimen_type || "").toLowerCase();
  const growth = String(payload.growth_result || "positive").toLowerCase();
  const entries = (payload.antibiogram || []).map(withDerived);

  const sensitive = entries.filter((e) => e.interpretation === "S");
  const intermediate = entries.filter((e) => e.interpretation === "I");
  const resistant = entries.filter((e) => e.interpretation === "R");

  const recommended = [...sensitive].sort((a, b) => {
    const pa = awarePriority[a.aware_group] ?? 9;
    const pb = awarePriority[b.aware_group] ?? 9;
    if (pa !== pb) return pa - pb;
    const ma = Number.isFinite(a.mic_numeric) ? a.mic_numeric : 999999;
    const mb = Number.isFinite(b.mic_numeric) ? b.mic_numeric : 999999;
    if (ma !== mb) return ma - mb;
    return String(a.antibiotic_name || "").localeCompare(String(b.antibiotic_name || ""));
  });

  const microorganism = payload.microorganism ? String(payload.microorganism).trim() : "";
  let summary = "";
  if (growth === "negative") {
    summary = "Nessuna crescita significativa nel campione inviato.";
  } else if (recommended.length) {
    const names = recommended.slice(0, 6).map((r) => {
      const comm = (r.commercial_names || []).join(", ");
      return comm ? `${r.antibiotic_name} (esempi: ${comm})` : r.antibiotic_name;
    });
    summary = `${microorganism || "Microrganismo isolato"}: antibiotici sensibili nel pannello testato -> ${names.join("; ")}.`;
  } else {
    summary = `${microorganism || "Microrganismo isolato"}: nessun antibiotico classificato come sensibile (S).`;
  }

  const resistance_patterns = computeResistancePatterns(specimen, entries);

  const warnings = [];
  if (specimen === "feci") {
    warnings.push("Nei quadri enterici molte infezioni sono autolimitanti: l'antibiotico si valuta solo se clinicamente indicato.");
  }
  if (growth !== "negative") {
    warnings.push("La scelta terapeutica finale deve considerare sede infezione, dosaggio, allergie, gravidanza, funzione renale e linee guida locali.");
  }

  const first_choice = recommended.length ? recommended[0] : null;
  return {
    sensitive,
    intermediate,
    resistant,
    recommended,
    first_choice,
    resistance_patterns,
    summary,
    warnings,
  };
}

function patientSort(a, b) {
  const s = String(a.surname || "").localeCompare(String(b.surname || ""));
  return s !== 0 ? s : String(a.name || "").localeCompare(String(b.name || ""));
}

function listCatalogBy(db, { search = "", specimen = "", only_enabled = true } = {}) {
  const s = String(search || "").trim().toLowerCase();
  const sp = String(specimen || "").trim().toLowerCase();

  return db.catalog
    .filter((x) => !only_enabled || x.enabled)
    .filter(
      (x) =>
        !s ||
        String(x.antibiotic_name).toLowerCase().includes(s) ||
        String(x.active_ingredient || "").toLowerCase().includes(s) ||
        String(x.antibiotic_class || "").toLowerCase().includes(s)
    )
    .filter((x) => {
      if (!sp) return true;
      const types = (x.specimen_types || []).map((t) => String(t).toLowerCase());
      return types.includes(sp) || types.includes("all");
    })
    .sort((a, b) => String(a.antibiotic_name).localeCompare(String(b.antibiotic_name)));
}

function buildPanels(db) {
  const panels = {};
  for (const s of SPECIMEN_TYPES) {
    panels[s.id] = listCatalogBy(db, { specimen: s.id, only_enabled: true });
  }
  return panels;
}

export const localApi = {
  async health() {
    return { status: "ok", app: "MicroLab local", env: "browser-local" };
  },

  async getPresets() {
    const db = readDb();
    return {
      specimen_types: deepClone(SPECIMEN_TYPES),
      catalog: deepClone(db.catalog.filter((x) => x.enabled)),
      default_panels: deepClone(buildPanels(db)),
      references_metadata: deepClone(REFERENCES_METADATA),
      default_methodologies: deepClone(DEFAULT_METHODOLOGIES),
    };
  },

  async getReportSettings() {
    return readSettings() || deepClone(DEFAULT_REPORT_SETTINGS);
  },

  async saveReportSettings(payload) {
    const merged = { ...DEFAULT_REPORT_SETTINGS, ...(payload || {}) };
    writeSettings(merged);
    return merged;
  },

  async listCatalog(filters = {}) {
    const db = readDb();
    return deepClone(listCatalogBy(db, filters));
  },

  async createCatalogItem(payload) {
    const db = readDb();
    const meta = ANTI_META[String(payload.antibiotic_name || "").trim()] || {};
    const item = {
      id: db.seq.catalog++,
      antibiotic_name: String(payload.antibiotic_name || "").trim(),
      antibiotic_class: (payload.antibiotic_class || "").trim() || meta.antibiotic_class || null,
      active_ingredient: (payload.active_ingredient || "").trim() || null,
      breakpoint_ref: (payload.breakpoint_ref || "").trim() || meta.breakpoint_ref || null,
      specimen_types: Array.isArray(payload.specimen_types) ? payload.specimen_types : [],
      commercial_names: Array.isArray(payload.commercial_names) ? payload.commercial_names : [],
      aware_group: payload.aware_group || null,
      notes: payload.notes || null,
      enabled: payload.enabled !== false,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    db.catalog.push(item);
    writeDb(db);
    return deepClone(item);
  },

  async updateCatalogItem(id, payload) {
    const db = readDb();
    const idx = db.catalog.findIndex((x) => x.id === Number(id));
    if (idx < 0) throw new Error("Antibiotico non trovato");
    db.catalog[idx] = {
      ...db.catalog[idx],
      ...payload,
      updated_at: nowIso(),
    };
    writeDb(db);
    return deepClone(db.catalog[idx]);
  },

  async deleteCatalogItem(id) {
    const db = readDb();
    db.catalog = db.catalog.filter((x) => x.id !== Number(id));
    writeDb(db);
    return null;
  },

  async listPatients(search = "") {
    const db = readDb();
    const q = String(search || "").toLowerCase().trim();
    const rows = db.patients
      .filter((p) => !q || [p.surname, p.name, p.fiscal_code].some((x) => String(x || "").toLowerCase().includes(q)))
      .sort(patientSort);
    return deepClone(rows);
  },

  async createPatient(payload) {
    const db = readDb();
    const row = {
      id: db.seq.patient++,
      surname: payload.surname,
      name: payload.name,
      birth_date: payload.birth_date || null,
      sex: payload.sex || "M",
      fiscal_code: payload.fiscal_code || null,
      phone: payload.phone || null,
      email: payload.email || null,
      notes: payload.notes || null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    db.patients.push(row);
    writeDb(db);
    return deepClone(row);
  },

  async updatePatient(id, payload) {
    const db = readDb();
    const idx = db.patients.findIndex((x) => x.id === Number(id));
    if (idx < 0) throw new Error("Paziente non trovato");
    db.patients[idx] = { ...db.patients[idx], ...payload, updated_at: nowIso() };
    writeDb(db);
    return deepClone(db.patients[idx]);
  },

  async deletePatient(id) {
    const db = readDb();
    const pid = Number(id);
    db.patients = db.patients.filter((x) => x.id !== pid);
    db.exams = db.exams.filter((x) => x.patient_id !== pid);
    writeDb(db);
    return null;
  },

  async previewExam(payload) {
    return interpret(payload);
  },

  async saveExam(payload) {
    const db = readDb();
    const interp = interpret(payload);
    const exam = {
      id: db.seq.exam++,
      ...payload,
      interpretation_summary: interp.summary || "",
      interpretation: interp,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    db.exams.push(exam);
    writeDb(db);
    return deepClone(exam);
  },

  async listExams(patientId) {
    const db = readDb();
    const pid = Number(patientId);
    const rows = db.exams
      .filter((x) => x.patient_id === pid)
      .sort((a, b) => String(b.exam_date || "").localeCompare(String(a.exam_date || "")));
    return deepClone(rows);
  },

  async getExam(id) {
    const db = readDb();
    const row = db.exams.find((x) => x.id === Number(id));
    if (!row) throw new Error("Esame non trovato");
    return deepClone(row);
  },

  async deleteExam(id) {
    const db = readDb();
    db.exams = db.exams.filter((x) => x.id !== Number(id));
    writeDb(db);
    return null;
  },
};
