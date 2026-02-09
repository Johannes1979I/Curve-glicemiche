from typing import Dict, Any


PRESETS = [
    {"id": "glyc3", "name": "Curva Glicemica 3 punti", "type": "glyc", "times": [0, 60, 120]},
    {"id": "glyc5", "name": "Curva Glicemica 5 punti", "type": "glyc", "times": [0, 30, 60, 90, 120]},
    {"id": "glyc6", "name": "Curva Glicemica 6 punti", "type": "glyc", "times": [0, 30, 60, 90, 120, 180]},
    {"id": "ins5", "name": "Curva Insulinemica 5 punti", "type": "ins", "times": [0, 30, 60, 90, 120]},
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
