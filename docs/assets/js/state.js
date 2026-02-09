export const state = {
  selectedPatient: null,
  selectedExamId: null,
  presets: [],
  refs: null,
  lastPayload: null,
  interpretation: null,
  charts: {
    glyc: null,
    ins: null,
    combined: null,
  },
  reportSettings: {
    report_title: "Referto Curva da Carico Orale di Glucosio",
    header_line1: "Laboratorio Analisi",
    header_line2: "Centro Polispecialistico",
    header_line3: "Referto di laboratorio",
    include_interpretation_pdf: true,
    merge_charts_pdf: true,
    header_logo_data_url: null,
  },
};
