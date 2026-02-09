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

    exams = relationship("Exam", back_populates="patient", cascade="all, delete-orphan")


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), index=True)

    exam_date: Mapped[date] = mapped_column(Date, default=date.today, index=True)
    requester_doctor: Mapped[str | None] = mapped_column(String(150), nullable=True)
    acceptance_number: Mapped[str | None] = mapped_column(String(80), nullable=True)

    curve_mode: Mapped[str] = mapped_column(String(20), default="glyc")  # glyc | ins | combined
    pregnant_mode: Mapped[int] = mapped_column(Integer, default=0)  # 0/1
    glucose_load_g: Mapped[int] = mapped_column(Integer, default=75)

    glyc_unit: Mapped[str] = mapped_column(String(20), default="mg/dL")
    ins_unit: Mapped[str] = mapped_column(String(20), default="µUI/mL")

    glyc_times_json: Mapped[str] = mapped_column(Text, default="[]")
    ins_times_json: Mapped[str] = mapped_column(Text, default="[]")
    glyc_values_json: Mapped[str] = mapped_column(Text, default="[]")
    ins_values_json: Mapped[str] = mapped_column(Text, default="[]")
    glyc_refs_json: Mapped[str] = mapped_column(Text, default="{}")
    ins_refs_json: Mapped[str] = mapped_column(Text, default="{}")

    methodology: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    interpretation_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    interpretation_details_json: Mapped[str] = mapped_column(Text, default="{}")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="exams")


class ReportSettings(Base):
    __tablename__ = "report_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    report_title: Mapped[str] = mapped_column(
        String(180),
        default="Referto Curva da Carico Orale di Glucosio",
    )
    header_line1: Mapped[str] = mapped_column(
        String(180),
        default="Centro Polispecialistico Giovanni Paolo I srl",
    )
    header_line2: Mapped[str] = mapped_column(
        String(180),
        default="Via Ignazio Garbini, 25 - 01100 Viterbo",
    )
    header_line3: Mapped[str] = mapped_column(
        String(180),
        default="Tel 0761 304260 - www.polispecialisticoviterbo.it",
    )
    header_logo_data_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    include_interpretation_default: Mapped[int] = mapped_column(Integer, default=1)
    merge_charts_default: Mapped[int] = mapped_column(Integer, default=1)

    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ReferenceProfile(Base):
    __tablename__ = "reference_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    profile_key: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    profile_name: Mapped[str] = mapped_column(String(180))

    glyc_refs_json: Mapped[str] = mapped_column(Text, default="{}")
    pregnant_glyc_refs_json: Mapped[str] = mapped_column(Text, default="{}")
    ins_refs_json: Mapped[str] = mapped_column(Text, default="{}")
    sources_json: Mapped[str] = mapped_column(Text, default="[]")

    method_glyc: Mapped[str | None] = mapped_column(Text, nullable=True)
    method_ins: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    updated_on: Mapped[date] = mapped_column(Date, default=date.today)
    is_active: Mapped[int] = mapped_column(Integer, default=1)
