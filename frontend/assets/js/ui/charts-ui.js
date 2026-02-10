import { state } from "../state.js";

function killChart(instance) {
  if (instance && typeof instance.destroy === "function") instance.destroy();
}

function getCanvasContext(id) {
  const c = document.getElementById(id);
  return c ? c.getContext("2d") : null;
}

function lineDataset(label, data, color) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: color,
    pointRadius: 3,
    tension: 0.35,
    borderWidth: 2,
    fill: false,
  };
}

function areaDataset(label, dataTop, dataBottom, color) {
  return {
    label,
    data: dataTop,
    borderColor: "rgba(0,0,0,0)",
    backgroundColor: color,
    pointRadius: 0,
    tension: 0.35,
    fill: { target: "-1" },
    order: -10,
  };
}

function shouldShowInsulin(payload) {
  return !!(
    payload?.include_insulin === true || payload?.curve_mode === "combined"
  );
}

function setChartCardsVisibility(showIns) {
  const insCard = document.getElementById("insChartCard");
  const combCard = document.getElementById("combinedChartCard");
  if (insCard) insCard.classList.toggle("is-hidden", !showIns);
  if (combCard) combCard.classList.toggle("is-hidden", !showIns);
}

function toPoints(times, values) {
  return (times || []).map((t, i) => {
    const raw = values?.[i];
    if (raw === null || raw === undefined || String(raw).trim?.() === "") {
      return { x: Number(t), y: null };
    }
    const y = Number(String(raw).replace(",", "."));
    return { x: Number(t), y: Number.isFinite(y) ? y : null };
  });
}

function refsToPoints(times, refs, key) {
  return (times || []).map((t) => ({ x: Number(t), y: Number(refs?.[String(t)]?.[key] ?? 0) }));
}

function buildChartOptions(unitY) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { position: "top" },
      tooltip: { mode: "nearest", intersect: false },
    },
    scales: {
      x: {
        type: "linear",
        title: { display: true, text: "Tempo (min)" },
      },
      y: {
        title: { display: true, text: unitY || "Valore" },
      },
    },
  };
}

function renderSingle(idCanvas, times, values, refs, unit, labelSerie, areaColor, lineColor) {
  const ctx = getCanvasContext(idCanvas);
  if (!ctx) return null;

  const pointsVal = toPoints(times, values);
  const refMin = refsToPoints(times, refs, "min");
  const refMax = refsToPoints(times, refs, "max");

  const chart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        { ...lineDataset("Range min", refMin, "rgba(0,0,0,0)") },
        areaDataset("Range di normalità", refMax, refMin, areaColor),
        lineDataset(labelSerie, pointsVal, lineColor),
        { ...lineDataset("Range max", refMax, "rgba(22,163,74,0.55)") },
        { ...lineDataset("Range min", refMin, "rgba(22,163,74,0.55)") },
      ],
    },
    options: buildChartOptions(unit),
  });

  return chart;
}

function renderCombined(payload) {
  const ctx = getCanvasContext("combinedChart");
  if (!ctx) return null;

  const gTimes = payload.glyc_times || [];
  const iTimes = payload.ins_times || [];

  const gVals = payload.glyc_values || [];
  const iVals = payload.ins_values || [];

  const gRefs = payload.glyc_refs || {};
  const iRefs = payload.ins_refs || {};

  const ds = [
    areaDataset("Glicemia range", refsToPoints(gTimes, gRefs, "max"), refsToPoints(gTimes, gRefs, "min"), "rgba(16,185,129,0.14)"),
    areaDataset("Insulina range", refsToPoints(iTimes, iRefs, "max"), refsToPoints(iTimes, iRefs, "min"), "rgba(249,115,22,0.14)"),
    lineDataset(`Glicemia (${payload.glyc_unit || "mg/dL"})`, toPoints(gTimes, gVals), "#2563eb"),
    lineDataset(`Insulina (${payload.ins_unit || "µUI/mL"})`, toPoints(iTimes, iVals), "#1d4ed8"),
  ];

  return new Chart(ctx, {
    type: "line",
    data: { datasets: ds },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { position: "top" },
      },
      scales: {
        x: { type: "linear", title: { display: true, text: "Tempo (min)" } },
        y: { title: { display: true, text: "Valori" } },
      },
    },
  });
}

export function renderCharts(payload) {
  killChart(state.charts.glyc);
  killChart(state.charts.ins);
  killChart(state.charts.combined);

  const hasG = Array.isArray(payload?.glyc_times) && payload.glyc_times.length > 0;
  const hasIns = shouldShowInsulin(payload) && Array.isArray(payload?.ins_times) && payload.ins_times.length > 0;

  setChartCardsVisibility(hasIns);

  state.charts.glyc = hasG
    ? renderSingle(
        "glycChart",
        payload.glyc_times,
        payload.glyc_values,
        payload.glyc_refs,
        payload.glyc_unit,
        "Paziente",
        "rgba(16,185,129,0.18)",
        "#2563eb"
      )
    : null;

  state.charts.ins = hasIns
    ? renderSingle(
        "insChart",
        payload.ins_times,
        payload.ins_values,
        payload.ins_refs,
        payload.ins_unit,
        "Paziente",
        "rgba(249,115,22,0.18)",
        "#1d4ed8"
      )
    : null;

  state.charts.combined = hasG && hasIns ? renderCombined(payload) : null;
}
