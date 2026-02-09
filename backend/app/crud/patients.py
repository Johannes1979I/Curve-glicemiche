from sqlalchemy.orm import Session
from sqlalchemy import or_
from .. import models, schemas


def create_patient(db: Session, payload: schemas.PatientCreate) -> models.Patient:
    p = models.Patient(**payload.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def list_patients(db: Session, search: str = "", limit: int = 50):
    q = db.query(models.Patient)
    if search:
        like = f"%{search}%"
        q = q.filter(
            or_(
                models.Patient.surname.ilike(like),
                models.Patient.name.ilike(like),
                models.Patient.fiscal_code.ilike(like),
            )
        )
    return q.order_by(models.Patient.surname.asc(), models.Patient.name.asc()).limit(limit).all()


def get_patient(db: Session, patient_id: int):
    return db.query(models.Patient).filter(models.Patient.id == patient_id).first()


def update_patient(db: Session, patient: models.Patient, payload: schemas.PatientUpdate):
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(patient, k, v)
    db.commit()
    db.refresh(patient)
    return patient


def delete_patient(db: Session, patient: models.Patient):
    db.delete(patient)
    db.commit()
