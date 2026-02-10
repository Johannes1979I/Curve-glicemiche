import { api } from "../api.js";
import { state } from "../state.js";
import { refreshExamHistory } from "./exams-ui.js";

function patientItemTemplate(p) {
  return `
  <div class="card-item">
    <div>
      <strong>${p.surname} ${p.name}</strong><br/>
      <small>${p.fiscal_code || "CF n/d"} • ${p.birth_date || "Data n/d"}</small>
    </div>
    <div class="row">
      <button data-action="select" data-id="${p.id}">Seleziona</button>
      <button data-action="edit" data-id="${p.id}">Modifica</button>
      <button data-action="delete" data-id="${p.id}" class="danger">Elimina</button>
    </div>
  </div>`;
}

function fillPatientForm(p) {
  document.getElementById("patientId").value = p.id || "";
  document.getElementById("surname").value = p.surname || "";
  document.getElementById("name").value = p.name || "";
  document.getElementById("birth_date").value = p.birth_date || "";
  document.getElementById("sex").value = p.sex || "M";
  document.getElementById("fiscal_code").value = p.fiscal_code || "";
  document.getElementById("phone").value = p.phone || "";
  document.getElementById("email").value = p.email || "";
  document.getElementById("patient_notes").value = p.notes || "";
}

function resetPatientForm() {
  fillPatientForm({});
}

function updateSelectedLabel() {
  const el = document.getElementById("selectedPatientLabel");
  if (!state.selectedPatient) {
    el.textContent = "Seleziona prima un paziente";
    return;
  }
  el.textContent = `Paziente selezionato: ${state.selectedPatient.surname} ${state.selectedPatient.name} (ID ${state.selectedPatient.id})`;
}

export async function refreshPatients() {
  const search = document.getElementById("searchPatient").value.trim();
  const rows = await api.listPatients(search);
  const list = document.getElementById("patientsList");
  list.innerHTML = rows.map(patientItemTemplate).join("") || '<div class="muted">Nessun paziente trovato</div>';
  list.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.id);
      const row = rows.find((x) => x.id === id);
      if (!row) return;

      const action = btn.dataset.action;
      if (action === "select") {
        state.selectedPatient = row;
        updateSelectedLabel();
        await refreshExamHistory();
      } else if (action === "edit") {
        fillPatientForm(row);
      } else if (action === "delete") {
        if (!confirm("Eliminare paziente e relativi esami?")) return;
        await api.deletePatient(id);
        if (state.selectedPatient?.id === id) {
          state.selectedPatient = null;
          updateSelectedLabel();
          await refreshExamHistory();
        }
        await refreshPatients();
      }
    });
  });
}

export function bindPatientUI() {
  updateSelectedLabel();

  document.getElementById("btnSearchPatient").addEventListener("click", refreshPatients);
  document.getElementById("btnResetPatient").addEventListener("click", resetPatientForm);

  document.getElementById("patientForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const id = Number(document.getElementById("patientId").value || 0);
    const payload = {
      surname: document.getElementById("surname").value.trim(),
      name: document.getElementById("name").value.trim(),
      birth_date: document.getElementById("birth_date").value || null,
      sex: document.getElementById("sex").value,
      fiscal_code: document.getElementById("fiscal_code").value.trim() || null,
      phone: document.getElementById("phone").value.trim() || null,
      email: document.getElementById("email").value.trim() || null,
      notes: document.getElementById("patient_notes").value.trim() || null,
    };
    if (!payload.surname || !payload.name) {
      alert("Cognome e nome sono obbligatori.");
      return;
    }

    if (id > 0) {
      await api.updatePatient(id, payload);
    } else {
      await api.createPatient(payload);
    }
    resetPatientForm();
    await refreshPatients();
  });
}
