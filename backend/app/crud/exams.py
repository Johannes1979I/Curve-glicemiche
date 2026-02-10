import json
from sqlalchemy.orm import Session
from .. import models, schemas


def create_exam(db: Session, payload: schemas.ExamCreate, interpretation: dict) -> models.MicroExam:
    p = payload.model_dump()
    exam = models.MicroExam(
        patient_id=p["patient_id"],
        exam_date=p["exam_date"],
        acceptance_number=p.get("acceptance_number"),
        requester_doctor=p.get("requester_doctor"),
        specimen_type=p["specimen_type"],
        growth_result=p["growth_result"],
        microorganism=p.get("microorganism"),
        methodology=p.get("methodology"),
        notes=p.get("notes"),
        antibiogram_json=json.dumps(p.get("antibiogram", []), ensure_ascii=False),
        interpretation_summary=interpretation.get("summary"),
        interpretation_details_json=json.dumps(interpretation, ensure_ascii=False),
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return exam


def list_exams(db: Session, patient_id: int | None = None, limit: int = 200):
    q = db.query(models.MicroExam)
    if patient_id:
        q = q.filter(models.MicroExam.patient_id == patient_id)
    return q.order_by(models.MicroExam.exam_date.desc(), models.MicroExam.id.desc()).limit(limit).all()


def get_exam(db: Session, exam_id: int):
    return db.query(models.MicroExam).filter(models.MicroExam.id == exam_id).first()


def delete_exam(db: Session, row: models.MicroExam):
    db.delete(row)
    db.commit()
