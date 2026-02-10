from datetime import date, datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


# ------------------- Patients -------------------
class PatientBase(BaseModel):
    surname: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=100)
    birth_date: Optional[date] = None
    sex: Literal["M", "F"] = "M"
    fiscal_code: Optional[str] = Field(default=None, max_length=32)
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    surname: Optional[str] = None
    name: Optional[str] = None
    birth_date: Optional[date] = None
    sex: Optional[Literal["M", "F"]] = None
    fiscal_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None


class PatientOut(PatientBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ------------------- Catalog -------------------
class CatalogItemBase(BaseModel):
    antibiotic_name: str = Field(min_length=1, max_length=120)
    antibiotic_class: Optional[str] = None
    active_ingredient: Optional[str] = None
    breakpoint_ref: Optional[str] = None
    specimen_types: List[str] = Field(default_factory=list)
    commercial_names: List[str] = Field(default_factory=list)
    aware_group: Optional[Literal["Access", "Watch", "Reserve", "Other"]] = None
    notes: Optional[str] = None
    enabled: bool = True


class CatalogItemCreate(CatalogItemBase):
    pass


class CatalogItemUpdate(BaseModel):
    antibiotic_name: Optional[str] = None
    antibiotic_class: Optional[str] = None
    active_ingredient: Optional[str] = None
    breakpoint_ref: Optional[str] = None
    specimen_types: Optional[List[str]] = None
    commercial_names: Optional[List[str]] = None
    aware_group: Optional[Literal["Access", "Watch", "Reserve", "Other"]] = None
    notes: Optional[str] = None
    enabled: Optional[bool] = None


class CatalogItemOut(CatalogItemBase):
    id: int
    created_at: datetime
    updated_at: datetime


# ------------------- Exams -------------------
class ExamAntibiogramEntry(BaseModel):
    antibiotic_id: Optional[int] = None
    antibiotic_name: str = Field(min_length=1, max_length=120)
    antibiotic_class: Optional[str] = None
    active_ingredient: Optional[str] = None
    mic: Optional[str] = None
    breakpoint_ref: Optional[str] = None
    interpretation: Literal["S", "I", "R", "-"] = "-"
    commercial_names: List[str] = Field(default_factory=list)
    aware_group: Optional[str] = None
    notes: Optional[str] = None


class ExamPayload(BaseModel):
    patient_id: int
    exam_date: date
    acceptance_number: Optional[str] = None
    requester_doctor: Optional[str] = None
    specimen_type: str = Field(min_length=1, max_length=50)
    growth_result: Literal["positive", "negative", "mixed"] = "positive"
    microorganism: Optional[str] = None
    methodology: Optional[str] = None
    notes: Optional[str] = None
    antibiogram: List[ExamAntibiogramEntry] = Field(default_factory=list)


class ExamCreate(ExamPayload):
    pass


class InterpretationOut(BaseModel):
    sensitive: List[ExamAntibiogramEntry] = Field(default_factory=list)
    intermediate: List[ExamAntibiogramEntry] = Field(default_factory=list)
    resistant: List[ExamAntibiogramEntry] = Field(default_factory=list)
    recommended: List[ExamAntibiogramEntry] = Field(default_factory=list)
    first_choice: Optional[ExamAntibiogramEntry] = None
    resistance_patterns: List[str] = Field(default_factory=list)
    summary: str = ""
    warnings: List[str] = Field(default_factory=list)


class ExamOut(ExamPayload):
    id: int
    interpretation_summary: Optional[str] = None
    interpretation: InterpretationOut
    created_at: datetime
    updated_at: datetime


# ------------------- Report settings -------------------
class ReportSettingsIn(BaseModel):
    report_title: str = "Referto Esame Microbiologico con MIC"
    header_line1: Optional[str] = None
    header_line2: Optional[str] = None
    header_line3: Optional[str] = None
    include_interpretation_pdf: bool = True
    include_commercial_names_pdf: bool = True
    header_logo_data_url: Optional[str] = None


class ReportSettingsOut(ReportSettingsIn):
    pass
