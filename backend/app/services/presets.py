from typing import Dict, Any


PRESETS = [
    {"id": "glyc3", "name": "Curva glicemica 3 punti", "type": "glyc", "times": [0, 60, 120]},
    {
        "id": "glyc3_preg",
        "name": "Curva glicemica 3 punti in gravidanza",
        "type": "glyc",
        "times": [0, 60, 120],
        "pregnant": True,
    },
    {"id": "glyc4", "name": "Curva glicemica 4 punti", "type": "glyc", "times": [0, 30, 60, 120]},
    {"id": "glyc5", "name": "Curva glicemica 5 punti", "type": "glyc", "times": [0, 30, 60, 90, 120]},
    {"id": "glyc6", "name": "Curva glicemica 6 punti", "type": "glyc", "times": [0, 30, 60, 90, 120, 180]},
]


def get_presets_payload(reference_payload: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "presets": PRESETS,
        "default_glyc_refs": reference_payload.get("default_glyc_refs", {}),
        "pregnant_glyc_refs": reference_payload.get("pregnant_glyc_refs", {}),
        "default_ins_refs": reference_payload.get("default_ins_refs", {}),
        "references_metadata": reference_payload.get("references_metadata", {}),
        "default_methodologies": reference_payload.get("default_methodologies", {}),
    }
