export const state = {
  selectedPatient: null,
  selectedExamId: null,
  specimenTypes: [],
  catalog: [],
  defaultPanels: {},
  presetsMeta: null,
  lastPayload: null,
  interpretation: null,
  reportSettings: {
    report_title: "Referto Esame Microbiologico con MIC",
    header_line1: "Laboratorio Analisi",
    header_line2: "Centro Polispecialistico",
    header_line3: "Referto microbiologico",
    include_interpretation_pdf: true,
    include_commercial_names_pdf: true,
    header_logo_data_url: null,
  },
};
