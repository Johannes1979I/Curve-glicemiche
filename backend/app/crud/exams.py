import json
from sqlalchemy.orm import Session
from .. import models, schemas


def create_exam(db: Session, payload: schemas.ExamCreate, interpretation: dict) -> models.Exam:
    p = payload.model_dump()
    exam = models.Exam(
        patient_id=p["patient_id"],
        exam_date=p["exam_date"],
        requester_doctor=p.get("requester_doctor"),
        acceptance_number=p.get("acceptance_number"),
        curve_mode=p["curve_mode"],
        pregnant_mode=1 if p["pregnant_mode"] else 0,
        glucose_load_g=p["glucose_load_g"],
        glyc_unit=p["glyc_unit"],
        ins_unit=p["ins_unit"],
        glyc_times_json=json.dumps(p["glyc_times"]),
        ins_times_json=json.dumps(p["ins_times"]),
        glyc_values_json=json.dumps(p["glyc_values"]),
        ins_values_json=json.dumps(p["ins_values"]),
        glyc_refs_json=json.dumps({k: v for k, v in p["glyc_refs"].items()}),
        ins_refs_json=json.dumps({k: v for k, v in p["ins_refs"].items()}),
        methodology=p.get("methodology"),
        notes=p.get("notes"),
        interpretation_summary=interpretation.get("summary"),
        interpretation_details_json=json.dumps(interpretation),
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return exam


def list_exams(db: Session, patient_id: int | None = None, limit: int = 100):
    q = db.query(models.Exam)
    if patient_id:
        q = q.filter(models.Exam.patient_id == patient_id)
    return q.order_by(models.Exam.exam_date.desc(), models.Exam.id.desc()).limit(limit).all()


def get_exam(db: Session, exam_id: int):
    return db.query(models.Exam).filter(models.Exam.id == exam_id).first()


def delete_exam(db: Session, exam: models.Exam):
    db.delete(exam)
    db.commit()
