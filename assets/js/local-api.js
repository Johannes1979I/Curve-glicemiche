const STORAGE_KEY = "curvelab_localdb_v2";
const REPORT_SETTINGS_KEY = "curvelab_report_settings_v2";

const DEFAULT_GLYC_REFS = {
  0: { min: 60, max: 100 },
  30: { min: 110, max: 160 },
  60: { min: 120, max: 170 },
  90: { min: 90, max: 150 },
  120: { min: 60, max: 140 },
  180: { min: 60, max: 110 },
};

const PREGNANT_GLYC_REFS = {
  0: { min: 60, max: 92 },
  30: { min: 100, max: 170 },
  60: { min: 100, max: 180 },
  90: { min: 80, max: 165 },
  120: { min: 60, max: 153 },
  180: { min: 60, max: 110 },
};

// Nota: per l'insulina non esiste un unico range OGTT universalmente standardizzato
// in tutti i congressi/societa'. Questi range sono configurabili e modificabili dall'operatore.
const DEFAULT_INS_REFS = {
  0: { min: 2, max: 25 },
  30: { min: 20, max: 100 },
  60: { min: 20, max: 120 },
  90: { min: 20, max: 100 },
  120: { min: 6, max: 60 },
  180: { min: 2, max: 30 },
};

const DEFAULT_METHODS = {
  glyc: "Metodo enzimatico (Esochinasi/G6PDH) - Fotometria UV",
  ins: "Immunodosaggio in Chemiluminescenza (CLIA)",
};

const REFERENCES_METADATA = {
  profile_id: "global-endocrine-consensus-v2",
  profile_name: "Global Endocrine Consensus DB (profilo locale)",
  dataset_name: "Global Endocrine Guideline Profile",
  dataset_version: "2026.02.10",
  updated_at: "2026-02-10",
  sources: [
    "ADA Standards of Care in Diabetes—2026 (Diagnosis and Classification)",
    "ADA Diabetes Diagnosis & Tests (criteri OGTT/FPG/A1C)",
    "IDF Global Clinical Practice Recommendations 2025",
    "WHO Hyperglycaemia in pregnancy guideline",
    "IADPSG Consensus 75 g OGTT in gravidanza (92/180/153 mg/dL)",
    "Clinical Chemistry / ADA insulin standardization: variabilità assay insulinici",
  ],
  notes:
    "Le soglie diagnostiche principali sono allineate alle linee guida internazionali. I punti intermedi della curva e i range insulinemici sono configurabili dal laboratorio in base al metodo analitico e alla popolazione di riferimento.",
};

const PRESETS = [
  { id: "glyc3", name: "Curva glicemica 3 punti", type: "glyc", times: [0, 60, 120] },
  { id: "glyc3_preg", name: "Curva glicemica 3 punti in gravidanza", type: "glyc", times: [0, 60, 120], pregnant: true },
  { id: "glyc4", name: "Curva glicemica 4 punti", type: "glyc", times: [0, 30, 60, 120] },
  { id: "glyc5", name: "Curva glicemica 5 punti", type: "glyc", times: [0, 30, 60, 90, 120] },
  { id: "glyc6", name: "Curva glicemica 6 punti", type: "glyc", times: [0, 30, 60, 90, 120, 180] },
];

const DEFAULT_REPORT_SETTINGS = {
  report_title: "Referto Curva da Carico Orale di Glucosio",
  header_line1: "Centro Polispecialistico Giovanni Paolo I srl",
  header_line2: "Via Ignazio Garbini, 25 - 01100 Viterbo",
  header_line3: "Tel 0761 304260 - www.polispecialisticoviterbo.it",
  include_interpretation_pdf: true,
  merge_charts_pdf: true,
  header_logo_data_url: null,
};

function deepClone(x) {
  return JSON.parse(JSON.stringify(x));
}

function nowIso() {
  return new Date().toISOString();
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("empty");
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") throw new Error("invalid");
    if (!Array.isArray(data.patients)) data.patients = [];
    if (!Array.isArray(data.exams)) data.exams = [];
    if (!data.counters || typeof data.counters !== "object") data.counters = { patient: 0, exam: 0 };
    data.counters.patient = Number(data.counters.patient || 0);
    data.counters.exam = Number(data.counters.exam || 0);
    return data;
  } catch {
    const init = { patients: [], exams: [], counters: { patient: 0, exam: 0 } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
    return init;
  }
}

function saveStore(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function normalizeReportSettings(input = {}) {
  const src = { ...(input || {}) };

  // Retrocompatibilità con vecchi nomi campo
  if (typeof src.include_interpretation_pdf === "undefined" && typeof src.include_interpretation_default !== "undefined") {
    src.include_interpretation_pdf = !!src.include_interpretation_default;
  }
  if (typeof src.merge_charts_pdf === "undefined" && typeof src.merge_charts_default !== "undefined") {
    src.merge_charts_pdf = !!src.merge_charts_default;
  }

  return {
    ...DEFAULT_REPORT_SETTINGS,
    ...src,
    include_interpretation_pdf: !!src.include_interpretation_pdf,
    merge_charts_pdf: !!src.merge_charts_pdf,
    header_logo_data_url: src.header_logo_data_url || null,
  };
}

function loadReportSettings() {
  try {
    const raw = localStorage.getItem(REPORT_SETTINGS_KEY);
    if (!raw) throw new Error("empty");
    const parsed = JSON.parse(raw);
    return normalizeReportSettings(parsed || {});
  } catch {
    localStorage.setItem(REPORT_SETTINGS_KEY, JSON.stringify(DEFAULT_REPORT_SETTINGS));
    return deepClone(DEFAULT_REPORT_SETTINGS);
  }
}

function saveReportSettingsData(payload = {}) {
  const merged = normalizeReportSettings(payload);
  localStorage.setItem(REPORT_SETTINGS_KEY, JSON.stringify(merged));
  return merged;
}

function summaryFromStatus(overall) {
  const map = {
    normal: "Referto complessivamente nei limiti di riferimento.",
    warning: "Referto con alterazioni da correlare clinicamente.",
    danger: "Referto con alterazioni: necessaria valutazione medica.",
  };
  return map[overall] || map.normal;
}

function evaluateSeries(times, values, refs) {
  const rows = [];
  let severity = "normal";

  for (let i = 0; i < times.length; i += 1) {
    const t = Number(times[i]);
    const raw = values[i];

    const hasValue = !(raw === null || raw === undefined || String(raw).trim?.() === "");
    const v = hasValue ? Number(String(raw).replace(",", ".")) : null;

    const ref = refs[String(t)] || refs[t] || { min: 0, max: 0 };
    const min = Number(ref.min);
    const max = Number(ref.max);

    let status = "missing";
    if (hasValue && Number.isFinite(v)) {
      status = "normal";
      if (v < min) {
        status = "low";
        if (severity === "normal") severity = "warning";
      } else if (v > max) {
        status = "high";
        if (severity === "normal" || severity === "warning") severity = "danger";
      }
    }

    rows.push({
      time: t,
      value: Number.isFinite(v) ? v : null,
      ref: { min: Number.isFinite(min) ? min : 0, max: Number.isFinite(max) ? max : 0 },
      status,
    });
  }

  return { rows, severity };
}

function interpretExam(payload) {
  const glyc_times = Array.isArray(payload.glyc_times) ? payload.glyc_times : [];
  const glyc_values = Array.isArray(payload.glyc_values) ? payload.glyc_values : [];

  const includeIns = payload?.include_insulin === true || payload?.curve_mode === "combined";
  const ins_times = includeIns && Array.isArray(payload.ins_times) ? payload.ins_times : [];
  const ins_values = includeIns && Array.isArray(payload.ins_values) ? payload.ins_values : [];

  const glyc_refs = payload.glyc_refs || {};
  const ins_refs = includeIns ? (payload.ins_refs || {}) : {};
  const pregnant = !!payload.pregnant_mode;

  const glyRes = evaluateSeries(glyc_times, glyc_values, glyc_refs);
  const insRes = includeIns ? evaluateSeries(ins_times, ins_values, ins_refs) : { rows: [], severity: "normal" };

  let overall = "normal";
  [glyRes.severity, insRes.severity].forEach((sev) => {
    if (sev === "danger") overall = "danger";
    else if (sev === "warning" && overall === "normal") overall = "warning";
  });

  // Diagnostica glicemica su valori realmente presenti
  let gly_diag = null;
  if (glyc_times.includes(120)) {
    const i120 = glyc_times.indexOf(120);
    const raw120 = glyc_values[i120];
    const v120 = raw120 === null || raw120 === undefined || String(raw120).trim() === ""
      ? null
      : Number(String(raw120).replace(",", "."));

    if (Number.isFinite(v120)) {
      if (pregnant) {
        const pick = (t) => {
          if (!glyc_times.includes(t)) return null;
          const raw = glyc_values[glyc_times.indexOf(t)];
          if (raw === null || raw === undefined || String(raw).trim() === "") return null;
          const n = Number(String(raw).replace(",", "."));
          return Number.isFinite(n) ? n : null;
        };

        const v0 = pick(0);
        const v60 = pick(60);
        const gdm = (v0 !== null && v0 >= 92) || (v60 !== null && v60 >= 180) || (v120 >= 153);

        if (gdm) {
          gly_diag = "Criteri IADPSG compatibili con diabete gestazionale (almeno un valore sopra soglia).";
          if (overall !== "danger") overall = "danger";
        } else {
          gly_diag = "Criteri IADPSG nei limiti.";
        }
      } else if (v120 < 140) {
        gly_diag = "Tolleranza glucidica normale.";
      } else if (v120 < 200) {
        gly_diag = "Ridotta tolleranza al glucosio (IGT).";
        if (overall === "normal") overall = "warning";
      } else {
        gly_diag = "Valore suggestivo di diabete mellito (da confermare clinicamente).";
        overall = "danger";
      }
    }
  }

  let ins_diag = null;
  const numericIns = (ins_values || [])
    .map((x) => (x === null || x === undefined || String(x).trim?.() === "" ? null : Number(String(x).replace(",", "."))))
    .filter((x) => Number.isFinite(x));

  if (includeIns && ins_times.length > 0 && numericIns.length > 0) {
    const normalized = (ins_values || []).map((x) => {
      if (x === null || x === undefined || String(x).trim?.() === "") return null;
      const n = Number(String(x).replace(",", "."));
      return Number.isFinite(n) ? n : null;
    });

    const peak_val = Math.max(...numericIns);
    const peak_idx = normalized.findIndex((x) => x === peak_val);
    const peak_time = peak_idx >= 0 ? ins_times[peak_idx] : null;
    const v0 = normalized[0];
    const idx120 = ins_times.indexOf(120);
    const v120 = idx120 >= 0 ? normalized[idx120] : null;

    if (peak_time !== null) {
      if (peak_time <= 60 && (v120 === null || v0 === null || v120 <= v0 * 3)) {
        ins_diag = "Pattern insulinemico nel range atteso.";
      } else if (peak_time > 60) {
        ins_diag = `Picco insulinemico ritardato (picco a ${peak_time}'). Possibile insulino-resistenza.`;
        if (overall === "normal") overall = "warning";
      } else if (v120 !== null && v0 !== null && v120 > v0 * 3) {
        ins_diag = "Ritorno lento verso il basale a 120'.";
        if (overall === "normal") overall = "warning";
      }
    }
  }

  return {
    overall_status: overall,
    summary: summaryFromStatus(overall),
    details: {
      glycemic_rows: glyRes.rows,
      insulin_rows: includeIns ? insRes.rows : [],
      glycemic_interpretation: gly_diag,
      insulin_interpretation: includeIns ? ins_diag : null,
    },
  };
}

function toDateString(value) {
  if (!value) return value;
  return String(value).slice(0, 10);
}

function toPatientOut(p) {
  return {
    id: Number(p.id),
    surname: p.surname,
    name: p.name,
    birth_date: p.birth_date || null,
    sex: p.sex || "M",
    fiscal_code: p.fiscal_code || null,
    phone: p.phone || null,
    email: p.email || null,
    notes: p.notes || null,
    created_at: p.created_at || nowIso(),
    updated_at: p.updated_at || nowIso(),
  };
}

function toExamListItem(e) {
  return {
    id: Number(e.id),
    patient_id: Number(e.patient_id),
    exam_date: e.exam_date,
    curve_mode: e.curve_mode,
    interpretation_summary: e.interpretation_summary || null,
    created_at: e.created_at || nowIso(),
  };
}

function toExamOut(e) {
  return deepClone({
    id: Number(e.id),
    patient_id: Number(e.patient_id),
    exam_date: e.exam_date,
    requester_doctor: e.requester_doctor || null,
    acceptance_number: e.acceptance_number || null,
    curve_mode: e.curve_mode || (e.include_insulin ? "combined" : "glyc"),
    include_insulin: e.include_insulin === true || e.curve_mode === "combined",
    pregnant_mode: !!e.pregnant_mode,
    glucose_load_g: Number(e.glucose_load_g ?? 75),
    glyc_unit: e.glyc_unit || "mg/dL",
    ins_unit: e.ins_unit || "µUI/mL",
    glyc_times: e.glyc_times || [],
    ins_times: e.ins_times || [],
    glyc_values: e.glyc_values || [],
    ins_values: e.ins_values || [],
    glyc_refs: e.glyc_refs || {},
    ins_refs: e.ins_refs || {},
    methodology: e.methodology || null,
    notes: e.notes || null,
    interpretation_summary: e.interpretation_summary || null,
    interpretation: e.interpretation || interpretExam(e),
    created_at: e.created_at || nowIso(),
  });
}

export const localApi = {
  async health() {
    return { status: "ok", app: "CurveLab (local browser DB)", env: "local" };
  },

  async getPresets() {
    return {
      presets: deepClone(PRESETS),
      default_glyc_refs: deepClone(DEFAULT_GLYC_REFS),
      pregnant_glyc_refs: deepClone(PREGNANT_GLYC_REFS),
      default_ins_refs: deepClone(DEFAULT_INS_REFS),
      references_metadata: deepClone(REFERENCES_METADATA),
      default_methodologies: deepClone(DEFAULT_METHODS),
    };
  },

  async getReportSettings() {
    return loadReportSettings();
  },

  async saveReportSettings(payload) {
    return saveReportSettingsData(payload || {});
  },

  async listPatients(search = "") {
    const db = loadStore();
    const q = String(search || "").trim().toLowerCase();
    let rows = db.patients.map(toPatientOut);

    if (q) {
      rows = rows.filter((p) => {
        const blob = `${p.surname} ${p.name} ${p.fiscal_code || ""}`.toLowerCase();
        return blob.includes(q);
      });
    }

    rows.sort((a, b) => {
      const s1 = `${a.surname} ${a.name}`.toLowerCase();
      const s2 = `${b.surname} ${b.name}`.toLowerCase();
      return s1.localeCompare(s2, "it");
    });

    return rows;
  },

  async createPatient(payload) {
    if (!payload?.surname || !payload?.name) {
      throw new Error("Cognome e nome sono obbligatori.");
    }

    const db = loadStore();
    const id = ++db.counters.patient;
    const now = nowIso();

    const row = toPatientOut({
      id,
      surname: String(payload.surname).trim(),
      name: String(payload.name).trim(),
      birth_date: toDateString(payload.birth_date),
      sex: payload.sex === "F" ? "F" : "M",
      fiscal_code: payload.fiscal_code || null,
      phone: payload.phone || null,
      email: payload.email || null,
      notes: payload.notes || null,
      created_at: now,
      updated_at: now,
    });

    db.patients.push(row);
    saveStore(db);
    return row;
  },

  async updatePatient(id, payload) {
    const db = loadStore();
    const idx = db.patients.findIndex((p) => Number(p.id) === Number(id));
    if (idx === -1) throw new Error("Paziente non trovato");

    const cur = db.patients[idx];
    const normalizedPayload = { ...(payload || {}) };
    const merged = toPatientOut({
      ...cur,
      ...normalizedPayload,
      id: cur.id,
      birth_date: payload.birth_date !== undefined ? toDateString(payload.birth_date) : cur.birth_date,
      sex: payload.sex ? (payload.sex === "F" ? "F" : "M") : cur.sex,
      updated_at: nowIso(),
    });

    db.patients[idx] = merged;
    saveStore(db);
    return merged;
  },

  async deletePatient(id) {
    const db = loadStore();
    const pid = Number(id);
    db.patients = db.patients.filter((p) => Number(p.id) !== pid);
    db.exams = db.exams.filter((e) => Number(e.patient_id) !== pid);
    saveStore(db);
    return null;
  },

  async previewExam(payload) {
    return interpretExam(payload || {});
  },

  async saveExam(payload) {
    const db = loadStore();

    const normalizedPayload = { ...(payload || {}) };
    const includeIns = normalizedPayload.include_insulin === true || normalizedPayload.curve_mode === "combined";
    normalizedPayload.include_insulin = includeIns;
    normalizedPayload.curve_mode = includeIns ? "combined" : "glyc";
    if (includeIns && Array.isArray(normalizedPayload.glyc_times)) {
      normalizedPayload.ins_times = [...normalizedPayload.glyc_times];
    } else if (!includeIns) {
      normalizedPayload.ins_times = [];
      normalizedPayload.ins_values = [];
      normalizedPayload.ins_refs = {};
    }
    const pid = Number(normalizedPayload?.patient_id);
    const patient = db.patients.find((p) => Number(p.id) === pid);
    if (!patient) throw new Error("Paziente non trovato");

    const interpretation = interpretExam(normalizedPayload || {});
    const id = ++db.counters.exam;
    const now = nowIso();

    const row = toExamOut({
      id,
      ...normalizedPayload,
      exam_date: toDateString(normalizedPayload.exam_date),
      interpretation,
      interpretation_summary: interpretation.summary,
      created_at: now,
    });

    db.exams.push(row);
    saveStore(db);
    return row;
  },

  async listExams(patientId) {
    const db = loadStore();
    const pid = Number(patientId);
    const rows = db.exams
      .filter((e) => Number(e.patient_id) === pid)
      .map(toExamListItem)
      .sort((a, b) => {
        const c = String(b.exam_date).localeCompare(String(a.exam_date));
        return c !== 0 ? c : Number(b.id) - Number(a.id);
      });

    return rows;
  },

  async getExam(id) {
    const db = loadStore();
    const row = db.exams.find((e) => Number(e.id) === Number(id));
    if (!row) throw new Error("Esame non trovato");
    return toExamOut(row);
  },

  async deleteExam(id) {
    const db = loadStore();
    db.exams = db.exams.filter((e) => Number(e.id) !== Number(id));
    saveStore(db);
    return null;
  },
};

export function clearLocalDatabase() {
  localStorage.removeItem(STORAGE_KEY);
}
