import { state } from "../state.js";

function chartWrapFor(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  return canvas.closest(".chart-wrap") || canvas.closest(".chart-card");
}

function hideOrShowChart(canvasId, shouldShow) {
  const wrap = chartWrapFor(canvasId);
  if (!wrap) return;
  wrap.style.display = shouldShow ? "block" : "none";
}

function destroyChart(refName) {
  if (state.charts[refName]) {
    state.charts[refName].destroy();
    state.charts[refName] = null;
  }
}

function mkPairs(times, values) {
  return (times || []).map((t, i) => ({ x: Number(t), y: Number(values?.[i] ?? 0) }));
}

function mkRefPairs(times, refs, key) {
  return (times || []).map((t) => ({ x: Number(t), y: Number((refs?.[String(t)] || refs?.[t] || {})[key] ?? 0) }));
}

function computeBounds(seriesArray) {
  const vals = [];
  for (const serie of seriesArray) {
    for (const p of serie || []) {
      const v = Number(p?.y);
      if (Number.isFinite(v)) vals.push(v);
    }
  }
  if (!vals.length) return { min: 0, max: 100 };
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = Math.max(8, Math.ceil((max - min) * 0.12));
  return { min: Math.max(0, Math.floor(min - pad)), max: Math.ceil(max + pad) };
}

function commonOptions(yLabel, min, max) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "bottom" },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        type: "linear",
        title: { display: true, text: "Tempo (min)" },
        ticks: {
          callback: (v) => `${v}'`,
        },
      },
      y: {
        beginAtZero: false,
        min,
        max,
        title: { display: true, text: yLabel },
      },
    },
  };
}

function datasetBase() {
  return {
    borderWidth: 2,
    tension: 0.45,
    cubicInterpolationMode: "monotone",
    pointRadius: 3,
    pointHoverRadius: 5,
    spanGaps: true,
  };
}

function renderSingle(canvasId, label, unit, times, values, refs, chartRef) {
  destroyChart(chartRef);

  const ctx = document.getElementById(canvasId).getContext("2d");
  const measured = mkPairs(times, values);
  const refMin = mkRefPairs(times, refs, "min");
  const refMax = mkRefPairs(times, refs, "max");

  const bounds = computeBounds([measured, refMin, refMax]);

  state.charts[chartRef] = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          ...datasetBase(),
          label: `${label} limite max`,
          data: refMax,
          borderDash: [8, 6],
          borderWidth: 1.6,
          pointRadius: 0,
          fill: false,
        },
        {
          ...datasetBase(),
          label: `${label} intervallo di normalità`,
          data: refMin,
          borderDash: [8, 6],
          borderWidth: 1.6,
          pointRadius: 0,
          fill: "-1",
          backgroundColor: "rgba(34, 197, 94, 0.20)",
        },
        {
          ...datasetBase(),
          label: `${label} misurata`,
          data: measured,
        },
      ],
    },
    options: commonOptions(unit, bounds.min, bounds.max),
  });
}

function renderCombined(payload) {
  destroyChart("combined");

  const ctx = document.getElementById("combinedChart").getContext("2d");

  const gTimes = payload.glyc_times || [];
  const iTimes = payload.ins_times || [];

  const gMeasured = mkPairs(gTimes, payload.glyc_values || []);
  const gMin = mkRefPairs(gTimes, payload.glyc_refs || {}, "min");
  const gMax = mkRefPairs(gTimes, payload.glyc_refs || {}, "max");

  const iMeasured = mkPairs(iTimes, payload.ins_values || []);
  const iMin = mkRefPairs(iTimes, payload.ins_refs || {}, "min");
  const iMax = mkRefPairs(iTimes, payload.ins_refs || {}, "max");

  const gb = computeBounds([gMeasured, gMin, gMax]);
  const ib = computeBounds([iMeasured, iMin, iMax]);

  state.charts.combined = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          ...datasetBase(),
          label: "Glicemia limite max",
          yAxisID: "yG",
          data: gMax,
          borderDash: [8, 6],
          borderWidth: 1.6,
          pointRadius: 0,
          fill: false,
        },
        {
          ...datasetBase(),
          label: "Glicemia intervallo di normalità",
          yAxisID: "yG",
          data: gMin,
          borderDash: [8, 6],
          borderWidth: 1.6,
          pointRadius: 0,
          fill: "-1",
          backgroundColor: "rgba(34, 197, 94, 0.18)",
        },
        {
          ...datasetBase(),
          label: "Glicemia misurata",
          yAxisID: "yG",
          data: gMeasured,
        },
        {
          ...datasetBase(),
          label: "Insulina limite max",
          yAxisID: "yI",
          data: iMax,
          borderDash: [8, 6],
          borderWidth: 1.6,
          pointRadius: 0,
          fill: false,
        },
        {
          ...datasetBase(),
          label: "Insulina intervallo di normalità",
          yAxisID: "yI",
          data: iMin,
          borderDash: [8, 6],
          borderWidth: 1.6,
          pointRadius: 0,
          fill: "-1",
          backgroundColor: "rgba(250, 204, 21, 0.20)",
        },
        {
          ...datasetBase(),
          label: "Insulina misurata",
          yAxisID: "yI",
          data: iMeasured,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { position: "bottom" } },
      scales: {
        x: {
          type: "linear",
          title: { display: true, text: "Tempo (min)" },
          ticks: { callback: (v) => `${v}'` },
        },
        yG: {
          type: "linear",
          position: "left",
          min: gb.min,
          max: gb.max,
          title: { display: true, text: payload.glyc_unit || "mg/dL" },
        },
        yI: {
          type: "linear",
          position: "right",
          min: ib.min,
          max: ib.max,
          title: { display: true, text: payload.ins_unit || "µUI/mL" },
          grid: { drawOnChartArea: false },
        },
      },
    },
  });
}

export function renderCharts(payload) {
  const mode = payload.curve_mode;

  const hasGlyc = mode === "glyc" || mode === "combined";
  const hasIns = mode === "ins" || mode === "combined";
  const hasCombined = mode === "combined";

  hideOrShowChart("glycChart", hasGlyc);
  hideOrShowChart("insChart", hasIns);
  hideOrShowChart("combinedChart", hasCombined);

  if (hasGlyc) {
    renderSingle(
      "glycChart",
      "Glicemia",
      payload.glyc_unit || "mg/dL",
      payload.glyc_times || [],
      payload.glyc_values || [],
      payload.glyc_refs || {},
      "glyc"
    );
  } else {
    destroyChart("glyc");
  }

  if (hasIns) {
    renderSingle(
      "insChart",
      "Insulina",
      payload.ins_unit || "µUI/mL",
      payload.ins_times || [],
      payload.ins_values || [],
      payload.ins_refs || {},
      "ins"
    );
  } else {
    destroyChart("ins");
  }

  if (hasCombined) {
    renderCombined(payload);
  } else {
    destroyChart("combined");
  }
}
