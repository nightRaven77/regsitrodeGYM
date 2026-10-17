from typing import Dict, Any, List

BACKEND_GUIDE_MAPPING: Dict[str, Dict[str, Any]] = {
    "p1": {
        "guideSlug": "seated-leg-curl",
        "alternatives": [
            "lying-leg-curl",
            "stability-ball-hamstring-curl"
        ]
    },
    "p2": {
        "guideSlug": "leg-extension",
        "alternatives": [
            "sissy-squat",
            "bodyweight-squat"
        ]
    },
    "p3": {
        "guideSlug": "lying-leg-curl",
        "alternatives": [
            "seated-leg-curl",
            "nordic-hamstring-curl"
        ]
    },
    "p4": {
        "guideSlug": "leg-press",
        "alternatives": [
            "hack-squat",
            "belt-squat",
            "squat"
        ]
    },
    "p5": {
        "guideSlug": "smith-machine-squat",
        "alternatives": [
            "squat",
            "hack-squat",
            "smith-machine-split-squat"
        ]
    },
    "p6": {
        "guideSlug": "squat",
        "alternatives": [
            "front-squat",
            "goblet-squat",
            "smith-machine-squat"
        ]
    },
    "p7": {
        "guideSlug": "single-leg-romanian-deadlift",
        "alternatives": [
            "single-leg-glute-bridge",
            "rack-pull"
        ]
    },
    "p8": {
        "guideSlug": "side-lying-leg-raise",
        "alternatives": [
            "cossack-squat",
            "skater-squat"
        ]
    },
    "p9": {
        "guideSlug": "cossack-squat",
        "alternatives": [
            "side-lying-leg-raise"
        ]
    },
    "p10": {
        "guideSlug": "single-leg-calf-raise",
        "alternatives": [
            "leg-press-calf-raise"
        ]
    },
    "p11": {
        "guideSlug": "split-squat",
        "alternatives": [
            "bulgarian-split-squat",
            "front-foot-elevated-split-squat"
        ]
    },
    "p12": {
        "guideSlug": "single-leg-glute-bridge",
        "alternatives": [
            "cable-pull-through",
            "glute-focused-back-extension"
        ]
    },
    "p13": {
        "guideSlug": "single-leg-glute-bridge",
        "alternatives": [
            "cable-pull-through"
        ]
    },
    "p14": {
        "guideSlug": "single-leg-glute-bridge",
        "alternatives": [
            "cable-pull-through"
        ]
    },
    "p15": {
        "guideSlug": "wall-handstand-push-up",
        "alternatives": [
            "bodyweight-squat"
        ]
    },
    "p16": {
        "guideSlug": "single-leg-romanian-deadlift",
        "alternatives": [
            "rack-pull",
            "cable-pull-through"
        ]
    },
    "p17": {
        "guideSlug": "single-leg-glute-bridge",
        "alternatives": [
            "glute-focused-back-extension"
        ]
    },
    "p18": {
        "guideSlug": "leg-press",
        "alternatives": [
            "hack-squat"
        ]
    },
    "p19": {
        "guideSlug": "bulgarian-split-squat",
        "alternatives": [
            "smith-machine-bulgarian-split-squat",
            "split-squat"
        ]
    },
    "c1": {
        "guideSlug": "decline-bench-press",
        "alternatives": [
            "decline-dumbbell-press",
            "decline-push-up"
        ]
    },
    "c2": {
        "guideSlug": "push-up",
        "alternatives": [
            "wide-push-up",
            "incline-push-up",
            "diamond-push-up"
        ]
    },
    "c3": {
        "guideSlug": "machine-chest-press",
        "alternatives": [
            "bench-press",
            "incline-dumbbell-press"
        ]
    },
    "c4": {
        "guideSlug": "incline-bench-press",
        "alternatives": [
            "incline-dumbbell-press",
            "incline-push-up"
        ]
    },
    "c5": {
        "guideSlug": "bench-press",
        "alternatives": [
            "dumbbell-bench-press",
            "smith-machine-bench-press",
            "push-up"
        ]
    },
    "c6": {
        "guideSlug": "cable-fly",
        "alternatives": [
            "pec-deck",
            "push-up"
        ]
    },
    "c7": {
        "guideSlug": "incline-dumbbell-press",
        "alternatives": [
            "incline-bench-press",
            "decline-dumbbell-press"
        ]
    },
    "c8": {
        "guideSlug": "pec-deck",
        "alternatives": [
            "cable-fly",
            "machine-chest-press"
        ]
    },
    "c9": {
        "guideSlug": "machine-chest-press",
        "alternatives": [
            "bench-press"
        ]
    },
    "c10": {
        "guideSlug": "chest-dip",
        "alternatives": [
            "dip",
            "bench-dip",
            "weighted-dip"
        ]
    },
    "b1": {
        "guideSlug": "pull-up",
        "alternatives": [
            "chin-up",
            "wide-grip-lat-pulldown",
            "assisted-pull-up"
        ]
    },
    "b2": {
        "guideSlug": "lat-pulldown",
        "alternatives": [
            "wide-grip-lat-pulldown",
            "banded-lat-pulldown",
            "pull-up"
        ]
    },
    "b3": {
        "guideSlug": "close-grip-lat-pulldown",
        "alternatives": [
            "lat-pulldown",
            "chin-up"
        ]
    },
    "b4": {
        "guideSlug": "machine-row",
        "alternatives": [
            "seated-row",
            "t-bar-row",
            "barbell-row"
        ]
    },
    "b5": {
        "guideSlug": "one-arm-dumbbell-row",
        "alternatives": [
            "dumbbell-bent-over-row",
            "seated-row"
        ]
    },
    "b6": {
        "guideSlug": "lat-pulldown",
        "alternatives": [
            "machine-row"
        ]
    },
    "b7": {
        "guideSlug": "barbell-row",
        "alternatives": [
            "dumbbell-bent-over-row",
            "pendlay-row",
            "t-bar-row"
        ]
    },
    "b8": {
        "guideSlug": "back-extension",
        "alternatives": [
            "reverse-hyperextension",
            "glute-focused-back-extension"
        ]
    },
    "b9": {
        "guideSlug": "seated-row",
        "alternatives": [
            "machine-row",
            "chest-supported-row"
        ]
    },
    "b10": {
        "guideSlug": "lat-pulldown",
        "alternatives": [
            "wide-grip-lat-pulldown"
        ]
    },
    "s1": {
        "guideSlug": "machine-shoulder-press",
        "alternatives": [
            "overhead-press",
            "seated-dumbbell-press"
        ]
    },
    "s2": {
        "guideSlug": "cable-lateral-raise",
        "alternatives": [
            "lateral-raise"
        ]
    },
    "s3": {
        "guideSlug": "overhead-press",
        "alternatives": [
            "push-press",
            "standing-dumbbell-press",
            "arnold-press"
        ]
    },
    "s4": {
        "guideSlug": "overhead-press",
        "alternatives": [
            "machine-shoulder-press"
        ]
    },
    "s5": {
        "guideSlug": "lateral-raise",
        "alternatives": [
            "cable-lateral-raise"
        ]
    },
    "s6": {
        "guideSlug": "front-raise",
        "alternatives": [
            "lateral-raise"
        ]
    },
    "s7": {
        "guideSlug": "upright-row",
        "alternatives": [
            "face-pull",
            "banded-face-pull"
        ]
    },
    "s8": {
        "guideSlug": "rear-delt-fly",
        "alternatives": [
            "reverse-pec-deck",
            "face-pull"
        ]
    },
    "s9": {
        "guideSlug": "seated-dumbbell-press",
        "alternatives": [
            "arnold-press",
            "standing-dumbbell-press"
        ]
    },
    "s10": {
        "guideSlug": "dumbbell-shrug",
        "alternatives": [
            "upright-row"
        ]
    },
    "s11": {
        "guideSlug": "chest-supported-row",
        "alternatives": [
            "rear-delt-fly"
        ]
    },
    "bi1": {
        "guideSlug": "preacher-curl",
        "alternatives": [
            "spider-curl",
            "ez-bar-curl"
        ]
    },
    "bi2": {
        "guideSlug": "bicep-curl",
        "alternatives": [
            "ez-bar-curl",
            "drag-curl"
        ]
    },
    "bi3": {
        "guideSlug": "bicep-curl",
        "alternatives": [
            "incline-dumbbell-curl",
            "hammer-curl"
        ]
    },
    "bi4": {
        "guideSlug": "cable-curl",
        "alternatives": [
            "bicep-curl"
        ]
    },
    "bi5": {
        "guideSlug": "concentration-curl",
        "alternatives": [
            "spider-curl",
            "preacher-curl"
        ]
    },
    "bi6": {
        "guideSlug": "chin-up",
        "alternatives": [
            "pull-up",
            "bicep-curl"
        ]
    },
    "bi7": {
        "guideSlug": "hammer-curl",
        "alternatives": [
            "rope-hammer-curl",
            "bicep-curl"
        ]
    },
    "bi8": {
        "guideSlug": "cable-curl",
        "alternatives": [
            "bicep-curl"
        ]
    },
    "bi9": {
        "guideSlug": "wrist-curl",
        "alternatives": [
            "wrist-extension",
            "reverse-curl"
        ]
    },
    "bi10": {
        "guideSlug": "preacher-curl",
        "alternatives": [
            "spider-curl"
        ]
    },
    "tr1": {
        "guideSlug": "single-arm-dumbbell-tricep-extension",
        "alternatives": [
            "overhead-tricep-extension"
        ]
    },
    "tr2": {
        "guideSlug": "overhead-tricep-extension",
        "alternatives": [
            "close-grip-bench-press"
        ]
    },
    "tr3": {
        "guideSlug": "overhead-tricep-extension",
        "alternatives": [
            "dumbbell-overhead-tricep-extension"
        ]
    },
    "tr4": {
        "guideSlug": "close-grip-bench-press",
        "alternatives": [
            "bench-press",
            "dip"
        ]
    },
    "tr5": {
        "guideSlug": "dip",
        "alternatives": [
            "chest-dip",
            "bench-dip",
            "assisted-dip"
        ]
    },
    "tr6": {
        "guideSlug": "single-arm-dumbbell-tricep-extension",
        "alternatives": [
            "overhead-tricep-extension"
        ]
    },
    "tr7": {
        "guideSlug": "rope-tricep-pushdown",
        "alternatives": [
            "tricep-pushdown"
        ]
    },
    "tr8": {
        "guideSlug": "tricep-pushdown",
        "alternatives": [
            "rope-tricep-pushdown"
        ]
    },
    "tr9": {
        "guideSlug": "assisted-dip",
        "alternatives": [
            "dip",
            "bench-dip"
        ]
    },
    "tr10": {
        "guideSlug": "overhead-tricep-extension",
        "alternatives": [
            "tricep-pushdown"
        ]
    },
    "ab1": {
        "guideSlug": "plank",
        "alternatives": [
            "side-plank-hip-dip"
        ]
    },
    "ab2": {
        "guideSlug": "crunch",
        "alternatives": [
            "weighted-crunch",
            "cable-crunch"
        ]
    },
    "ab3": {
        "guideSlug": "hanging-leg-raise",
        "alternatives": [
            "lying-leg-raise"
        ]
    },
    "ab4": {
        "guideSlug": "side-plank-hip-dip",
        "alternatives": [
            "plank"
        ]
    },
    "ab5": {
        "guideSlug": "ab-wheel",
        "alternatives": [
            "crunch"
        ]
    },
    "ab6": {
        "guideSlug": "reverse-crunch",
        "alternatives": [
            "crunch",
            "hanging-leg-raise"
        ]
    },
    "ab7": {
        "guideSlug": "crunch",
        "alternatives": [
            "weighted-crunch"
        ]
    },
    "ab8": {
        "guideSlug": "crunch",
        "alternatives": [
            "cable-crunch"
        ]
    },
    "ab9": {
        "guideSlug": "cable-crunch",
        "alternatives": [
            "crunch"
        ]
    },
    "ab10": {
        "guideSlug": "hanging-leg-raise",
        "alternatives": [
            "lying-leg-raise"
        ]
    }
}

INITIAL_CATALOG_SEED: List[Dict[str, Any]] = [
    # --- PIERNA ---
    {"id": 'p1', "category": 'Pierna', "name": 'Leg Curl Sentado', "equipment": 'Máquina', "defaultSets": 3, "defaultReps": 15, "unit": 'reps'},
    {"id": 'p2', "category": 'Pierna', "name": 'Leg Extensión', "equipment": 'Máquina', "defaultSets": 3, "defaultReps": 12, "unit": 'reps'},
    {"id": 'p3', "category": 'Pierna', "name": 'Leg Curl Horizontal', "equipment": 'Máquina', "defaultSets": 3, "defaultReps": 12, "unit": 'reps'},
    {"id": 'p4', "category": 'Pierna', "name": 'Prensa Para Pierna', "equipment": 'Máquina', "defaultSets": 4, "defaultReps": 12, "unit": 'reps'},
    {"id": 'p5', "category": 'Pierna', "name": 'Sentadilla Smith', "equipment": 'Máquina Smith', "defaultSets": 4, "defaultReps": 12, "unit": 'reps'},
    {"id": 'p6', "category": 'Pierna', "name": 'Sentadilla Barra Libre', "equipment": 'Barra', "defaultSets": 4, "defaultReps": 10, "unit": 'reps'},
    {"id": 'p7', "category": 'Pierna', "name": 'Peso Muerto', "equipment": 'Barra', "defaultSets": 4, "defaultReps": 10, "unit": 'reps'},
    {"id": 'p8', "category": 'Pierna', "name": 'Máquina de Abductores', "equipment": 'Máquina', "defaultSets": 3, "defaultReps": 15, "unit": 'reps'},
    {"id": 'p9', "category": 'Pierna', "name": 'Máquina de Aductores', "equipment": 'Máquina', "defaultSets": 3, "defaultReps": 15, "unit": 'reps'},
    {"id": 'p10', "category": 'Pierna', "name": 'Elevación de Talones', "equipment": 'Máquina/Mancuerna', "defaultSets": 4, "defaultReps": 15, "unit": 'reps'},
    {"id": 'p11', "category": 'Pierna', "name": 'Desplantes', "equipment": 'Mancuernas', "defaultSets": 3, "defaultReps": 12, "unit": 'reps'},
    {"id": 'p12', "category": 'Pierna', "name": 'Glúteo Polea', "equipment": 'Polea', "defaultSets": 3, "defaultReps": 15, "unit": 'reps'},
    {"id": 'p13', "category": 'Pierna', "name": 'Patada Atrás', "equipment": 'Polea/Libre', "defaultSets": 3, "defaultReps": 15, "unit": 'reps'},
    {"id": 'p14', "category": 'Pierna', "name": 'Puente', "equipment": 'Barra/Libre', "defaultSets": 4, "defaultReps": 12, "unit": 'reps'},
    {"id": 'p15', "category": 'Pierna', "name": 'Sentadilla Isométrica', "equipment": 'Peso Corporal', "defaultSets": 3, "defaultReps": 45, "unit": 'seg'},
    {"id": 'p16', "category": 'Pierna', "name": 'Peso Muerto Rumano', "equipment": 'Barra/Mancuerna', "defaultSets": 4, "defaultReps": 12, "unit": 'reps'},
    {"id": 'p17', "category": 'Pierna', "name": 'Patada de Glúteo en Máquina', "equipment": 'Máquina', "defaultSets": 3, "defaultReps": 15, "unit": 'reps'},
    {"id": 'p18', "category": 'Pierna', "name": 'Prensa Horizontal', "equipment": 'Máquina', "defaultSets": 4, "defaultReps": 12, "unit": 'reps'},
    {"id": 'p19', "category": 'Pierna', "name": 'Lunge con Pierna Trasera Elevada', "equipment": 'Mancuernas', "defaultSets": 3, "defaultReps": 12, "unit": 'reps'},

    # --- PECTORAL ---
    {"id": 'c1', "category": 'Pectoral', "name": 'Declinado', "equipment": 'Barra', "defaultSets": 4, "defaultReps": 12, "unit": 'reps'},
    {"id": 'c2', "category": 'Pectoral', "name": 'Lagartija', "equipment": 'Peso Corporal', "defaultSets": 3, "defaultReps": 15, "unit": 'reps'},
    {"id": 'c3', "category": 'Pectoral', "name": 'Press Vertical', "equipment": 'Máquina', "defaultSets": 3, "defaultReps": 12, "unit": 'reps'},
    {"id": 'c4', "category": 'Pectoral', "name": 'Press Inclinado con Barra', "equipment": 'Barra', "defaultSets": 4, "defaultReps": 10, "unit": 'reps'},
    {"id": 'c5', "category": 'Pectoral', "name": 'Press Plano', "equipment": 'Barra', "defaultSets": 4, "defaultReps": 10, "unit": 'reps'},
    {"id": 'c6', "category": 'Pectoral', "name": 'Cable Cruzado', "equipment": 'Polea', "defaultSets": 3, "defaultReps": 15, "unit": 'reps'},
    {"id": 'c7', "category": 'Pectoral', "name": 'Press Inclinado Mancuernas', "equipment": 'Mancuernas', "defaultSets": 4, "defaultReps": 12, "unit": 'reps'},
    {"id": 'c8', "category": 'Pectoral', "name": 'Pec Fly en Máquina', "equipment": 'Máquina', "defaultSets": 3, "defaultReps": 15, "unit": 'reps'},
    {"id": 'c9', "category": 'Pectoral', "name": 'Press Articulado', "equipment": 'Máquina', "defaultSets": 3, "defaultReps": 12, "unit": 'reps'},
    {"id": 'c10', "category": 'Pectoral', "name": 'Fondos Pectoral', "equipment": 'Paralelas', "defaultSets": 3, "defaultReps": 12, "unit": 'reps'},

    # --- ESPALDA ---
    {"id": 'b1', "category": 'Espalda', "name": 'Dominadas', "equipment": 'Barra Fija', "defaultSets": 4, "defaultReps": 10, "unit": 'reps'},
    {"id": 'b2', "category": 'Espalda', "name": 'Jalón Polea Alta', "equipment": 'Polea', "defaultSets": 4, "defaultReps": 12, "unit": 'reps'},
    {"id": 'b3', "category": 'Espalda', "name": 'Jalón Polea Cerrado', "equipment": 'Polea', "defaultSets": 3, "defaultReps": 12, "unit": 'reps'},
    {"id": 'b4', "category": 'Espalda', "name": 'Remo Máquina', "equipment": 'Máquina', "defaultSets": 3, "defaultReps": 12, "unit": 'reps'},
    {"id": 'b5', "category": 'Espalda', "name": 'Remo con Mancuerna', "equipment": 'Mancuerna', "defaultSets": 3, "defaultReps": 12, "unit": 'reps'},
    {"id": 'b6', "category": 'Espalda', "name": 'Jalón con Máquina', "equipment": 'Máquina', "defaultSets": 3, "defaultReps": 12, "unit": 'reps'},
    {"id": 'b7', "category": 'Espalda', "name": 'Remo con Barra', "equipment": 'Barra', "defaultSets": 4, "defaultReps": 10, "unit": 'reps'},
    {"id": 'b8', "category": 'Espalda', "name": 'Hiper Extension', "equipment": 'Banco Romano', "defaultSets": 3, "defaultReps": 15, "unit": 'reps'},
    {"id": 'b9', "category": 'Espalda', "name": 'Remo Articulado', "equipment": 'Máquina', "defaultSets": 3, "defaultReps": 12, "unit": 'reps'},
    {"id": 'b10', "category": 'Espalda', "name": 'Lat Pulldown', "equipment": 'Polea', "defaultSets": 4, "defaultReps": 12, "unit": 'reps'},

    # --- HOMBRO ---
    {"id": 's1', "category": 'Hombro', "name": 'Hombro Press', "equipment": 'Máquina', "defaultSets": 4, "defaultReps": 12, "unit": 'reps'},
    {"id": 's2', "category": 'Hombro', "name": 'Elevaciones Laterales en Polea', "equipment": 'Polea', "defaultSets": 3, "defaultReps": 15, "unit": 'reps'},
    {"id": 's3', "category": 'Hombro', "name": 'Press Militar', "equipment": 'Barra', "defaultSets": 4, "defaultReps": 10, "unit": 'reps'},
    {"id": 's4', "category": 'Hombro', "name": 'Press Tras Nuca Barra', "equipment": 'Barra', "defaultSets": 3, "defaultReps": 12, "unit": 'reps'},
    {"id": 's5', "category": 'Hombro', "name": 'Elevación Late Manc.', "equipment": 'Mancuernas', "defaultSets": 4, "defaultReps": 15, "unit": 'reps'},
    {"id": 's6', "category": 'Hombro', "name": 'Elevaciones Frontales Manc.', "equipment": 'Mancuernas', "defaultSets": 3, "defaultReps": 15, "unit": 'reps'},
    {"id": 's7', "category": 'Hombro', "name": 'Remo de Pie', "equipment": 'Barra/Polea', "defaultSets": 3, "defaultReps": 12, "unit": 'reps'},
    {"id": 's8', "category": 'Hombro', "name": 'Deltoides Posteriores Mancuernas', "equipment": 'Mancuernas', "defaultSets": 3, "defaultReps": 15, "unit": 'reps'},
    {"id": 's9', "category": 'Hombro', "name": 'Press Mancuerna', "equipment": 'Mancuernas', "defaultSets": 4, "defaultReps": 12, "unit": 'reps'},
    {"id": 's10', "category": 'Hombro', "name": 'Encogimiento Hombros Mancuerna', "equipment": 'Mancuernas', "defaultSets": 3, "defaultReps": 15, "unit": 'reps'},
    {"id": 's11', "category": 'Hombro', "name": 'Remo en Banco Inclinado', "equipment": 'Mancuernas', "defaultSets": 3, "defaultReps": 12, "unit": 'reps'},

    # --- BÍCEPS ---
    {"id": 'bi1', "category": 'Bíceps', "name": 'Predicador en Máquina', "equipment": 'Máquina', "defaultSets": 3, "defaultReps": 12, "unit": 'reps'},
    {"id": 'bi2', "category": 'Bíceps', "name": 'Bíceps Barra Agarre Abierto', "equipment": 'Barra Z', "defaultSets": 3, "defaultReps": 12, "unit": 'reps'},
    {"id": 'bi3', "category": 'Bíceps', "name": 'Bíceps Mancuerna', "equipment": 'Mancuernas', "defaultSets": 3, "defaultReps": 12, "unit": 'reps'},
    {"id": 'bi4', "category": 'Bíceps', "name": 'Bíceps Polea', "equipment": 'Polea', "defaultSets": 3, "defaultReps": 15, "unit": 'reps'},
    {"id": 'bi5', "category": 'Bíceps', "name": 'Curl Concentrado', "equipment": 'Mancuerna', "defaultSets": 3, "defaultReps": 12, "unit": 'reps'},
    {"id": 'bi6', "category": 'Bíceps', "name": 'Dominadas en Supinación', "equipment": 'Barra Fija', "defaultSets": 3, "defaultReps": 10, "unit": 'reps'},
    {"id": 'bi7', "category": 'Bíceps', "name": 'Martillos', "equipment": 'Mancuernas', "defaultSets": 3, "defaultReps": 12, "unit": 'reps'},
    {"id": 'bi8', "category": 'Bíceps', "name": 'Bíceps en Polea Alta', "equipment": 'Polea', "defaultSets": 3, "defaultReps": 15, "unit": 'reps'},
    {"id": 'bi9', "category": 'Bíceps', "name": 'Antebrazo Barra o Mancuerna', "equipment": 'Barra/Mancuerna', "defaultSets": 3, "defaultReps": 15, "unit": 'reps'},
    {"id": 'bi10', "category": 'Bíceps', "name": 'Bíceps Predicador', "equipment": 'Banco Scott', "defaultSets": 3, "defaultReps": 12, "unit": 'reps'},

    # --- TRÍCEPS ---
    {"id": 'tr1', "category": 'Tríceps', "name": 'Patada Tríceps con Polea', "equipment": 'Polea', "defaultSets": 3, "defaultReps": 15, "unit": 'reps'},
    {"id": 'tr2', "category": 'Tríceps', "name": 'Press Francés', "equipment": 'Barra Z', "defaultSets": 3, "defaultReps": 12, "unit": 'reps'},
    {"id": 'tr3', "category": 'Tríceps', "name": 'Copa Tríceps', "equipment": 'Mancuerna', "defaultSets": 3, "defaultReps": 12, "unit": 'reps'},
    {"id": 'tr4', "category": 'Tríceps', "name": 'Press Cerrado', "equipment": 'Barra', "defaultSets": 3, "defaultReps": 10, "unit": 'reps'},
    {"id": 'tr5', "category": 'Tríceps', "name": 'Fondos Tríceps', "equipment": 'Paralelas', "defaultSets": 3, "defaultReps": 12, "unit": 'reps'},
    {"id": 'tr6', "category": 'Tríceps', "name": 'Patada de Tríceps', "equipment": 'Mancuerna', "defaultSets": 3, "defaultReps": 15, "unit": 'reps'},
    {"id": 'tr7', "category": 'Tríceps', "name": 'Jalón con Cuerda', "equipment": 'Polea', "defaultSets": 3, "defaultReps": 15, "unit": 'reps'},
    {"id": 'tr8', "category": 'Tríceps', "name": 'Jalón con Barra', "equipment": 'Polea', "defaultSets": 3, "defaultReps": 15, "unit": 'reps'},
    {"id": 'tr9', "category": 'Tríceps', "name": 'Fondos en Máquina', "equipment": 'Máquina', "defaultSets": 3, "defaultReps": 12, "unit": 'reps'},
    {"id": 'tr10', "category": 'Tríceps', "name": 'Press Francés en Máquina', "equipment": 'Máquina', "defaultSets": 3, "defaultReps": 12, "unit": 'reps'},

    # --- ABDOMEN ---
    {"id": 'ab1', "category": 'Abdomen', "name": 'Plancha Estática', "equipment": 'Peso Corporal', "defaultSets": 3, "defaultReps": 45, "unit": 'seg'},
    {"id": 'ab2', "category": 'Abdomen', "name": 'Abdominal Banco', "equipment": 'Banco Declinado', "defaultSets": 3, "defaultReps": 20, "unit": 'reps'},
    {"id": 'ab3', "category": 'Abdomen', "name": 'Abdominal Paralelas', "equipment": 'Paralelas', "defaultSets": 3, "defaultReps": 15, "unit": 'reps'},
    {"id": 'ab4', "category": 'Abdomen', "name": 'Oblicuos', "equipment": 'Peso Corporal', "defaultSets": 3, "defaultReps": 20, "unit": 'reps'},
    {"id": 'ab5', "category": 'Abdomen', "name": 'Rueda Abdominal', "equipment": 'Rueda', "defaultSets": 3, "defaultReps": 15, "unit": 'reps'},
    {"id": 'ab6', "category": 'Abdomen', "name": 'Encogimiento Tronco y Piernas', "equipment": 'Peso Corporal', "defaultSets": 3, "defaultReps": 20, "unit": 'reps'},
    {"id": 'ab7', "category": 'Abdomen', "name": 'Crunch Fitball', "equipment": 'Fitball', "defaultSets": 3, "defaultReps": 20, "unit": 'reps'},
    {"id": 'ab8', "category": 'Abdomen', "name": 'Stability Crunches', "equipment": 'Fitball', "defaultSets": 3, "defaultReps": 20, "unit": 'reps'},
    {"id": 'ab9', "category": 'Abdomen', "name": 'Crunch en Máquina', "equipment": 'Máquina', "defaultSets": 3, "defaultReps": 20, "unit": 'reps'},
    {"id": 'ab10', "category": 'Abdomen', "name": 'Abcoaster', "equipment": 'Máquina', "defaultSets": 3, "defaultReps": 20, "unit": 'reps'}
]
