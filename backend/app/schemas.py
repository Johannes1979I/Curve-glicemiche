from datetime import date, datetime
from typing import Dict, List, Literal, Optional, Any
from pydantic import BaseModel, Field, ConfigDict


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


class RefRange(BaseModel):
    min: float
    max: float


class ExamPayload(BaseModel):
    patient_id: int
    exam_date: date
    requester_doctor: Optional[str] = None
    acceptance_number: Optional[str] = None

    curve_mode: Literal["glyc", "ins", "combined"] = "glyc"
    pregnant_mode: bool = False
    glucose_load_g: int = 75

    glyc_unit: str = "mg/dL"
    ins_unit: str = "µUI/mL"

    glyc_times: List[int] = Field(default_factory=list)
    ins_times: List[int] = Field(default_factory=list)
    glyc_values: List[float] = Field(default_factory=list)
    ins_values: List[float] = Field(default_factory=list)

    glyc_refs: Dict[str, RefRange] = Field(default_factory=dict)
    ins_refs: Dict[str, RefRange] = Field(default_factory=dict)

    methodology: Optional[str] = None
    notes: Optional[str] = None


class InterpretationOut(BaseModel):
    overall_status: Literal["normal", "warning", "danger"]
    summary: str
    details: Dict[str, Any]


class ExamCreate(ExamPayload):
    pass


class ExamOut(ExamPayload):
    id: int
    interpretation_summary: Optional[str] = None
    interpretation: InterpretationOut
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExamListItem(BaseModel):
    id: int
    patient_id: int
    exam_date: date
    curve_mode: str
    interpretation_summary: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReportSettingsIn(BaseModel):
    report_title: str = Field(default="Referto Curva da Carico Orale di Glucosio", max_length=180)
    header_line1: str = Field(default="Centro Polispecialistico Giovanni Paolo I srl", max_length=180)
    header_line2: str = Field(default="Via Ignazio Garbini, 25 - 01100 Viterbo", max_length=180)
    header_line3: str = Field(default="Tel 0761 304260 - www.polispecialisticoviterbo.it", max_length=180)
    header_logo_data_url: Optional[str] = None
    include_interpretation_default: bool = True
    merge_charts_default: bool = True


class ReportSettingsOut(ReportSettingsIn):
    updated_at: Optional[str] = None
