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
    {"id": "ins4", "name": "Curva insulinemica 4 punti", "type": "ins", "times": [0, 30, 60, 120]},
    {"id": "ins5", "name": "Curva insulinemica 5 punti", "type": "ins", "times": [0, 30, 60, 90, 120]},
    {
        "id": "combined4",
        "name": "Combinata 4 punti",
        "type": "combined",
        "glyc_times": [0, 30, 60, 120],
        "ins_times": [0, 30, 60, 120],
    },
    {
        "id": "combined5",
        "name": "Combinata 5 punti",
        "type": "combined",
        "glyc_times": [0, 30, 60, 90, 120],
        "ins_times": [0, 30, 60, 90, 120],
    },
    {
        "id": "combined6",
        "name": "Combinata 6 punti",
        "type": "combined",
        "glyc_times": [0, 30, 60, 90, 120, 180],
        "ins_times": [0, 30, 60, 90, 120, 180],
    },
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
