from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. import schemas
from ..crud import patients as crud


router = APIRouter(prefix="/patients", tags=["patients"])


@router.post("", response_model=schemas.PatientOut, status_code=201)
def create_patient(payload: schemas.PatientCreate, db: Session = Depends(get_db)):
    return crud.create_patient(db, payload)


@router.get("", response_model=list[schemas.PatientOut])
def list_patients(
    search: str = Query("", description="Ricerca per cognome/nome/codice fiscale"),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return crud.list_patients(db, search=search, limit=limit)


@router.get("/{patient_id}", response_model=schemas.PatientOut)
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    p = crud.get_patient(db, patient_id)
    if not p:
        raise HTTPException(status_code=404, detail="Paziente non trovato")
    return p


@router.put("/{patient_id}", response_model=schemas.PatientOut)
def update_patient(patient_id: int, payload: schemas.PatientUpdate, db: Session = Depends(get_db)):
    p = crud.get_patient(db, patient_id)
    if not p:
        raise HTTPException(status_code=404, detail="Paziente non trovato")
    return crud.update_patient(db, p, payload)


@router.delete("/{patient_id}", status_code=204)
def delete_patient(patient_id: int, db: Session = Depends(get_db)):
    p = crud.get_patient(db, patient_id)
    if not p:
        raise HTTPException(status_code=404, detail="Paziente non trovato")
    crud.delete_patient(db, p)
