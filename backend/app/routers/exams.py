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
    payload = {
        "id": row.id,
        "patient_id": row.patient_id,
        "exam_date": row.exam_date,
        "acceptance_number": row.acceptance_number,
        "requester_doctor": row.requester_doctor,
        "specimen_type": row.specimen_type,
        "growth_result": row.growth_result,
        "microorganism": row.microorganism,
        "methodology": row.methodology,
        "notes": row.notes,
        "antibiogram": json.loads(row.antibiogram_json or "[]"),
        "interpretation_summary": row.interpretation_summary,
        "interpretation": interpretation,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }
    return schemas.ExamOut(**payload)


@router.post("/preview", response_model=schemas.InterpretationOut)
def preview_exam(payload: schemas.ExamPayload):
    interpretation = interpret_exam(payload.model_dump())
    return schemas.InterpretationOut(**interpretation)


@router.post("", response_model=schemas.ExamOut, status_code=201)
def create_exam(payload: schemas.ExamCreate, db: Session = Depends(get_db)):
    patient = crud_patients.get_patient(db, payload.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Paziente non trovato")

    interpretation = interpret_exam(payload.model_dump())
    row = crud_exams.create_exam(db, payload, interpretation)
    return _row_to_out(row)


@router.get("", response_model=list[schemas.ExamOut])
def list_exams(
    patient_id: int | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=2000),
    db: Session = Depends(get_db),
):
    rows = crud_exams.list_exams(db, patient_id=patient_id, limit=limit)
    return [_row_to_out(r) for r in rows]


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
    return None
