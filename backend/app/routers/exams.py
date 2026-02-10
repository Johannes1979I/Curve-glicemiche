import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. import schemas
from ..crud import exams as crud_exams
from ..crud import patients as crud_patients
from ..services.interpretation import interpret_exam


router = APIRouter(prefix="/exams", tags=["exams"])


def _row_to_out(row):
    interpretation = json.loads(row.interpretation_details_json or "{}")
    return schemas.ExamOut(
        id=row.id,
        patient_id=row.patient_id,
        exam_date=row.exam_date,
        requester_doctor=row.requester_doctor,
        acceptance_number=row.acceptance_number,
        curve_mode=row.curve_mode,
        pregnant_mode=bool(row.pregnant_mode),
        glucose_load_g=row.glucose_load_g,
        glyc_unit=row.glyc_unit,
        ins_unit=row.ins_unit,
        glyc_times=json.loads(row.glyc_times_json or "[]"),
        ins_times=json.loads(row.ins_times_json or "[]"),
        glyc_values=json.loads(row.glyc_values_json or "[]"),
        ins_values=json.loads(row.ins_values_json or "[]"),
        glyc_refs=json.loads(row.glyc_refs_json or "{}"),
        ins_refs=json.loads(row.ins_refs_json or "{}"),
        methodology=row.methodology,
        notes=row.notes,
        interpretation_summary=row.interpretation_summary,
        interpretation=schemas.InterpretationOut(**interpretation),
        created_at=row.created_at,
    )


@router.post("/preview", response_model=schemas.InterpretationOut)
def preview_interpretation(payload: schemas.ExamPayload):
    interp = interpret_exam(payload.model_dump())
    return schemas.InterpretationOut(**interp)


@router.post("", response_model=schemas.ExamOut, status_code=201)
def create_exam(payload: schemas.ExamCreate, db: Session = Depends(get_db)):
    patient = crud_patients.get_patient(db, payload.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Paziente non trovato")

    interp = interpret_exam(payload.model_dump())
    created = crud_exams.create_exam(db, payload, interp)
    return _row_to_out(created)


@router.get("", response_model=list[schemas.ExamListItem])
def list_exams(
    patient_id: int | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    rows = crud_exams.list_exams(db, patient_id=patient_id, limit=limit)
    return rows


@router.get("/{exam_id}", response_model=schemas.ExamOut)
def get_exam(exam_id: int, db: Session = Depends(get_db)):
    row = crud_exams.get_exam(db, exam_id)
    if not row:
        raise HTTPException(status_code=404, detail="Esame non trovato")
    return _row_to_out(row)


@router.delete("/{exam_id}", status_code=204)
def delete_exam(exam_id: int, db: Session = Depends(get_db)):
    row = crud_exams.get_exam(db, exam_id)
    if not row:
        raise HTTPException(status_code=404, detail="Esame non trovato")
    crud_exams.delete_exam(db, row)
