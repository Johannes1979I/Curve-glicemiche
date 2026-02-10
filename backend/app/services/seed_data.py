from __future__ import annotations
import json
from sqlalchemy.orm import Session
from .. import models

# Antibiotici di default caricati all'avvio (modificabili dall'operatore)
DEFAULT_ANTIBIOTICS = [
    # Urine
    {"antibiotic_name": "Fosfomicina", "antibiotic_class": "Fosfonati", "active_ingredient": "fosfomycin trometamol", "breakpoint_ref": "EUCAST 2026", "specimen_types": ["urine"], "commercial_names": ["Monuril", "Monurol"], "aware_group": "Access"},
    {"antibiotic_name": "Nitrofurantoina", "antibiotic_class": "Nitrofurani", "active_ingredient": "nitrofurantoin", "breakpoint_ref": "EUCAST 2026", "specimen_types": ["urine"], "commercial_names": ["Macrobid"], "aware_group": "Access"},
    {"antibiotic_name": "Amoxicillina/Acido clavulanico", "antibiotic_class": "Beta-lattamici + inibitore", "active_ingredient": "amoxicillin + clavulanic acid", "breakpoint_ref": "EUCAST 2026", "specimen_types": ["urine", "orofaringeo", "espettorato"], "commercial_names": ["Augmentin"], "aware_group": "Access"},
    {"antibiotic_name": "Trimetoprim/Sulfametossazolo", "antibiotic_class": "Folatoinibitori", "active_ingredient": "trimethoprim + sulfamethoxazole", "breakpoint_ref": "EUCAST 2026", "specimen_types": ["urine", "feci"], "commercial_names": ["Bactrim"], "aware_group": "Access"},
    {"antibiotic_name": "Ciprofloxacina", "antibiotic_class": "Fluorochinoloni", "active_ingredient": "ciprofloxacin", "breakpoint_ref": "EUCAST 2026", "specimen_types": ["urine", "feci"], "commercial_names": ["Cipro", "Ciproxin"], "aware_group": "Watch"},
    {"antibiotic_name": "Ceftriaxone", "antibiotic_class": "Cefalosporine III", "active_ingredient": "ceftriaxone", "breakpoint_ref": "EUCAST 2026", "specimen_types": ["urine", "feci", "sangue"], "commercial_names": ["Rocephin"], "aware_group": "Watch"},
    {"antibiotic_name": "Gentamicina", "antibiotic_class": "Aminoglicosidi", "active_ingredient": "gentamicin", "breakpoint_ref": "EUCAST 2026", "specimen_types": ["urine", "sangue"], "commercial_names": [], "aware_group": "Access"},

    # Feci / enteropatogeni
    {"antibiotic_name": "Azitromicina", "antibiotic_class": "Macrolidi", "active_ingredient": "azithromycin", "breakpoint_ref": "EUCAST 2026", "specimen_types": ["feci"], "commercial_names": ["Zithromax", "Zitromax"], "aware_group": "Watch"},
    {"antibiotic_name": "Ampicillina", "antibiotic_class": "Aminopenicilline", "active_ingredient": "ampicillin", "breakpoint_ref": "EUCAST 2026", "specimen_types": ["feci"], "commercial_names": [], "aware_group": "Access"},

    # Orofaringeo
    {"antibiotic_name": "Penicillina V", "antibiotic_class": "Penicilline naturali", "active_ingredient": "phenoxymethylpenicillin", "breakpoint_ref": "EUCAST 2026", "specimen_types": ["orofaringeo"], "commercial_names": [], "aware_group": "Access"},
    {"antibiotic_name": "Amoxicillina", "antibiotic_class": "Aminopenicilline", "active_ingredient": "amoxicillin", "breakpoint_ref": "EUCAST 2026", "specimen_types": ["orofaringeo"], "commercial_names": ["Zimox", "Amoxil"], "aware_group": "Access"},
    {"antibiotic_name": "Cefalexina", "antibiotic_class": "Cefalosporine I", "active_ingredient": "cephalexin", "breakpoint_ref": "EUCAST 2026", "specimen_types": ["orofaringeo"], "commercial_names": ["Keflex"], "aware_group": "Access"},
    {"antibiotic_name": "Clindamicina", "antibiotic_class": "Lincosamidi", "active_ingredient": "clindamycin", "breakpoint_ref": "EUCAST 2026", "specimen_types": ["orofaringeo"], "commercial_names": ["Dalacin C"], "aware_group": "Access"},
    {"antibiotic_name": "Claritromicina", "antibiotic_class": "Macrolidi", "active_ingredient": "clarithromycin", "breakpoint_ref": "EUCAST 2026", "specimen_types": ["orofaringeo"], "commercial_names": ["Klacid", "Biaxin"], "aware_group": "Watch"},

    # Respiratorio / altri
    {"antibiotic_name": "Levofloxacina", "antibiotic_class": "Fluorochinoloni", "active_ingredient": "levofloxacin", "breakpoint_ref": "EUCAST 2026", "specimen_types": ["espettorato"], "commercial_names": ["Tavanic", "Levaquin"], "aware_group": "Watch"},
    {"antibiotic_name": "Piperacillina/Tazobactam", "antibiotic_class": "Ureidopenicillina + inibitore", "active_ingredient": "piperacillin + tazobactam", "breakpoint_ref": "EUCAST 2026", "specimen_types": ["espettorato", "ferita", "sangue"], "commercial_names": ["Tazocin", "Zosyn"], "aware_group": "Watch"},
    {"antibiotic_name": "Vancomicina", "antibiotic_class": "Glicopeptidi", "active_ingredient": "vancomycin", "breakpoint_ref": "EUCAST 2026", "specimen_types": ["ferita", "sangue"], "commercial_names": [], "aware_group": "Watch"},
    {"antibiotic_name": "Linezolid", "antibiotic_class": "Oxazolidinoni", "active_ingredient": "linezolid", "breakpoint_ref": "EUCAST 2026", "specimen_types": ["ferita", "sangue"], "commercial_names": ["Zyvoxid"], "aware_group": "Reserve"},
    {"antibiotic_name": "Meropenem", "antibiotic_class": "Carbapenemi", "active_ingredient": "meropenem", "breakpoint_ref": "EUCAST 2026", "specimen_types": ["sangue", "ferita"], "commercial_names": ["Merrem"], "aware_group": "Watch"},
]


SPECIMEN_TYPES = [
    {"id": "urine", "label": "Urine"},
    {"id": "feci", "label": "Feci"},
    {"id": "orofaringeo", "label": "Tampone orofaringeo"},
    {"id": "espettorato", "label": "Espettorato"},
    {"id": "ferita", "label": "Tampone ferita"},
    {"id": "sangue", "label": "Emocoltura"},
]


REFERENCES_METADATA = {
    "profile_id": "micro-amr-guidelines-2026.02",
    "profile_name": "Microbiology MIC Guidance Profile",
    "dataset_name": "CDC + NICE + IDSA + EUCAST + WHO AWaRe (sintesi operativa locale)",
    "dataset_version": "2026.02",
    "updated_at": "2026-02-10",
    "sources": [
        "NICE NG109 (UTI): scelte antibiotiche comuni per cistite non complicata",
        "CDC Campylobacter e advisory Shigella XDR: indicazioni e importanza AST",
        "IDSA streptococcal pharyngitis: penicillina/amoxicillina prima linea",
        "EUCAST breakpoint tables e definizioni S/I/R",
        "WHO AWaRe classification (2023/2024): Access/Watch/Reserve",
    ],
    "notes": "Pannelli predefiniti orientativi. Ogni prescrizione deve seguire antibiogramma, quadro clinico e linee guida locali.",
}


DEFAULT_METHODOLOGIES = {
    "culture": "Coltura su terreni selettivi + identificazione biochimica/MALDI-TOF",
    "mic": "Determinazione MIC (broth microdilution o sistema automatizzato) interpretata secondo breakpoint EUCAST",
}


def ensure_default_catalog(db: Session) -> None:
    count = db.query(models.AntibioticCatalog).count()
    if count > 0:
        return

    for item in DEFAULT_ANTIBIOTICS:
        row = models.AntibioticCatalog(
            antibiotic_name=item["antibiotic_name"],
            antibiotic_class=item.get("antibiotic_class"),
            active_ingredient=item.get("active_ingredient"),
            breakpoint_ref=item.get("breakpoint_ref"),
            specimen_types_json=json.dumps(item.get("specimen_types", []), ensure_ascii=False),
            commercial_names_json=json.dumps(item.get("commercial_names", []), ensure_ascii=False),
            aware_group=item.get("aware_group"),
            notes=item.get("notes"),
            enabled=1,
        )
        db.add(row)
    db.commit()
