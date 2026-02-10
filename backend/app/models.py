from datetime import datetime, date
from sqlalchemy import String, Integer, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    surname: Mapped[str] = mapped_column(String(100), index=True)
    name: Mapped[str] = mapped_column(String(100), index=True)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    sex: Mapped[str] = mapped_column(String(1), default="M")
    fiscal_code: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(120), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    exams = relationship("MicroExam", back_populates="patient", cascade="all, delete-orphan")


class AntibioticCatalog(Base):
    __tablename__ = "antibiotic_catalog"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    antibiotic_name: Mapped[str] = mapped_column(String(120), index=True)
    antibiotic_class: Mapped[str | None] = mapped_column(String(120), nullable=True)
    active_ingredient: Mapped[str | None] = mapped_column(String(160), nullable=True)
    breakpoint_ref: Mapped[str | None] = mapped_column(String(120), nullable=True)
    specimen_types_json: Mapped[str] = mapped_column(Text, default="[]")
    commercial_names_json: Mapped[str] = mapped_column(Text, default="[]")
    aware_group: Mapped[str | None] = mapped_column(String(20), nullable=True)  # Access / Watch / Reserve
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    enabled: Mapped[int] = mapped_column(Integer, default=1)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MicroExam(Base):
    __tablename__ = "micro_exams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)

    exam_date: Mapped[date] = mapped_column(Date)
    acceptance_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    requester_doctor: Mapped[str | None] = mapped_column(String(120), nullable=True)

    specimen_type: Mapped[str] = mapped_column(String(50), index=True)  # urine, feci, orofaringeo, ...
    growth_result: Mapped[str] = mapped_column(String(30), default="positive")  # positive/negative/mixed
    microorganism: Mapped[str | None] = mapped_column(String(160), nullable=True)

    methodology: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    antibiogram_json: Mapped[str] = mapped_column(Text, default="[]")
    interpretation_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    interpretation_details_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("Patient", back_populates="exams")


class ReportSettings(Base):
    __tablename__ = "report_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    singleton_key: Mapped[str] = mapped_column(String(20), unique=True, default="default")
    report_title: Mapped[str] = mapped_column(String(200), default="Referto Esame Microbiologico con MIC")
    header_line1: Mapped[str | None] = mapped_column(String(200), nullable=True)
    header_line2: Mapped[str | None] = mapped_column(String(200), nullable=True)
    header_line3: Mapped[str | None] = mapped_column(String(200), nullable=True)
    include_interpretation_default: Mapped[int] = mapped_column(Integer, default=1)
    include_commercial_names_default: Mapped[int] = mapped_column(Integer, default=1)
    header_logo_data_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
