// Catálogo Oficial de Ejercicios extraído de CenterFit mx Gimnasio (Todas las rutinas inician con 1 serie por defecto)

const DEFAULT_EXERCISES_CATALOG = [
  // --- PIERNA ---
  { id: 'p1', category: 'Pierna', name: 'Leg Curl Sentado', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'p2', category: 'Pierna', name: 'Leg Extensión', defaultSets: 1, defaultReps: 12, unit: 'reps' },
  { id: 'p3', category: 'Pierna', name: 'Leg Curl Horizontal', defaultSets: 1, defaultReps: 12, unit: 'reps' },
  { id: 'p4', category: 'Pierna', name: 'Prensa Para Pierna', defaultSets: 1, defaultReps: 12, unit: 'reps' },
  { id: 'p5', category: 'Pierna', name: 'Sentadilla Smith', defaultSets: 1, defaultReps: 12, unit: 'reps' },
  { id: 'p6', category: 'Pierna', name: 'Sentadilla Barra Libre', defaultSets: 1, defaultReps: 12, unit: 'reps' },
  { id: 'p7', category: 'Pierna', name: 'Peso Muerto', defaultSets: 1, defaultReps: 12, unit: 'reps' },
  { id: 'p8', category: 'Pierna', name: 'Máquina de Abductores', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'p9', category: 'Pierna', name: 'Máquina de Aductores', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'p10', category: 'Pierna', name: 'Elevación de Talones', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'p11', category: 'Pierna', name: 'Desplantes', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'p12', category: 'Pierna', name: 'Glúteo Polea', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'p13', category: 'Pierna', name: 'Patada Atrás', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'p14', category: 'Pierna', name: 'Puente', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'p15', category: 'Pierna', name: 'Sentadilla Isométrica', defaultSets: 1, defaultReps: 30, unit: 'seg' },
  { id: 'p16', category: 'Pierna', name: 'Peso Muerto Rumano', defaultSets: 1, defaultReps: 12, unit: 'reps' },
  { id: 'p17', category: 'Pierna', name: 'Patada de Glúteo en Máquina', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'p18', category: 'Pierna', name: 'Prensa Horizontal', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'p19', category: 'Pierna', name: 'Lunge con Pierna Trasera Elevada', defaultSets: 1, defaultReps: 15, unit: 'reps' },

  // --- PECTORAL ---
  { id: 'c1', category: 'Pectoral', name: 'Declinado', defaultSets: 1, defaultReps: 12, unit: 'reps' },
  { id: 'c2', category: 'Pectoral', name: 'Lagartija', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'c3', category: 'Pectoral', name: 'Press Vertical', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'c4', category: 'Pectoral', name: 'Press Inclinado con Barra', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'c5', category: 'Pectoral', name: 'Press Plano', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'c6', category: 'Pectoral', name: 'Cable Cruzado', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'c7', category: 'Pectoral', name: 'Press Inclinado Mancuernas', defaultSets: 1, defaultReps: 12, unit: 'reps' },
  { id: 'c8', category: 'Pectoral', name: 'Pec Fly en Máquina', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'c9', category: 'Pectoral', name: 'Press Articulado', defaultSets: 1, defaultReps: 12, unit: 'reps' },
  { id: 'c10', category: 'Pectoral', name: 'Fondos Pectoral', defaultSets: 1, defaultReps: 12, unit: 'reps' },

  // --- ESPALDA ---
  { id: 'b1', category: 'Espalda', name: 'Dominadas', defaultSets: 1, defaultReps: 12, unit: 'reps' },
  { id: 'b2', category: 'Espalda', name: 'Jalón Polea Alta', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'b3', category: 'Espalda', name: 'Jalón Polea Cerrado', defaultSets: 1, defaultReps: 12, unit: 'reps' },
  { id: 'b4', category: 'Espalda', name: 'Remo Máquina', defaultSets: 1, defaultReps: 12, unit: 'reps' },
  { id: 'b5', category: 'Espalda', name: 'Remo con Mancuerna', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'b6', category: 'Espalda', name: 'Jalón con Máquina', defaultSets: 1, defaultReps: 12, unit: 'reps' },
  { id: 'b7', category: 'Espalda', name: 'Remo con Barra', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'b8', category: 'Espalda', name: 'Hiper Extension', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'b9', category: 'Espalda', name: 'Remo Articulado', defaultSets: 1, defaultReps: 12, unit: 'reps' },
  { id: 'b10', category: 'Espalda', name: 'Lat Pulldown', defaultSets: 1, defaultReps: 15, unit: 'reps' },

  // --- HOMBRO ---
  { id: 's1', category: 'Hombro', name: 'Hombro Press', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 's2', category: 'Hombro', name: 'Elevaciones Laterales en Polea', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 's3', category: 'Hombro', name: 'Press Militar', defaultSets: 1, defaultReps: 12, unit: 'reps' },
  { id: 's4', category: 'Hombro', name: 'Press Tras Nuca Barra', defaultSets: 1, defaultReps: 12, unit: 'reps' },
  { id: 's5', category: 'Hombro', name: 'Elevación Late Manc.', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 's6', category: 'Hombro', name: 'Elevaciones Frontales Manc.', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 's7', category: 'Hombro', name: 'Remo de Pie', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 's8', category: 'Hombro', name: 'Deltoides Posteriores Mancuernas', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 's9', category: 'Hombro', name: 'Press Mancuerna', defaultSets: 1, defaultReps: 12, unit: 'reps' },
  { id: 's10', category: 'Hombro', name: 'Encogimiento Hombros Mancuerna', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 's11', category: 'Hombro', name: 'Remo en Banco Inclinado', defaultSets: 1, defaultReps: 12, unit: 'reps' },

  // --- BÍCEPS ---
  { id: 'bi1', category: 'Bíceps', name: 'Predicador en Máquina', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'bi2', category: 'Bíceps', name: 'Bíceps Barra Agarre Abierto', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'bi3', category: 'Bíceps', name: 'Bíceps Mancuerna', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'bi4', category: 'Bíceps', name: 'Bíceps Polea', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'bi5', category: 'Bíceps', name: 'Curl Concentrado', defaultSets: 1, defaultReps: 12, unit: 'reps' },
  { id: 'bi6', category: 'Bíceps', name: 'Dominadas en Supinación', defaultSets: 1, defaultReps: 12, unit: 'reps' },
  { id: 'bi7', category: 'Bíceps', name: 'Martillos', defaultSets: 1, defaultReps: 12, unit: 'reps' },
  { id: 'bi8', category: 'Bíceps', name: 'Bíceps en Polea Alta', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'bi9', category: 'Bíceps', name: 'Antebrazo Barra o Mancuerna', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'bi10', category: 'Bíceps', name: 'Bíceps Predicador', defaultSets: 1, defaultReps: 12, unit: 'reps' },

  // --- TRÍCEPS ---
  { id: 'tr1', category: 'Tríceps', name: 'Patada Tríceps con Polea', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'tr2', category: 'Tríceps', name: 'Press Francés', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'tr3', category: 'Tríceps', name: 'Copa Tríceps', defaultSets: 1, defaultReps: 12, unit: 'reps' },
  { id: 'tr4', category: 'Tríceps', name: 'Press Cerrado', defaultSets: 1, defaultReps: 12, unit: 'reps' },
  { id: 'tr5', category: 'Tríceps', name: 'Fondos Tríceps', defaultSets: 1, defaultReps: 12, unit: 'reps' },
  { id: 'tr6', category: 'Tríceps', name: 'Patada de Tríceps', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'tr7', category: 'Tríceps', name: 'Jalón con Cuerda', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'tr8', category: 'Tríceps', name: 'Jalón con Barra', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'tr9', category: 'Tríceps', name: 'Fondos en Máquina', defaultSets: 1, defaultReps: 12, unit: 'reps' },
  { id: 'tr10', category: 'Tríceps', name: 'Press Francés en Máquina', defaultSets: 1, defaultReps: 12, unit: 'reps' },

  // --- ABDOMEN ---
  { id: 'ab1', category: 'Abdomen', name: 'Plancha Estática', defaultSets: 1, defaultReps: 390, unit: 'seg' },
  { id: 'ab2', category: 'Abdomen', name: 'Abdominal Banco', defaultSets: 1, defaultReps: 20, unit: 'reps' },
  { id: 'ab3', category: 'Abdomen', name: 'Abdominal Paralelas', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'ab4', category: 'Abdomen', name: 'Oblicuos', defaultSets: 1, defaultReps: 20, unit: 'reps' },
  { id: 'ab5', category: 'Abdomen', name: 'Rueda Abdominal', defaultSets: 1, defaultReps: 15, unit: 'reps' },
  { id: 'ab6', category: 'Abdomen', name: 'Encogimiento Tronco y Piernas', defaultSets: 1, defaultReps: 20, unit: 'reps' },
  { id: 'ab7', category: 'Abdomen', name: 'Crunch Fitball', defaultSets: 1, defaultReps: 20, unit: 'reps' },
  { id: 'ab8', category: 'Abdomen', name: 'Stability Crunches', defaultSets: 1, defaultReps: 20, unit: 'reps' },
  { id: 'ab9', category: 'Abdomen', name: 'Crunch en Máquina', defaultSets: 1, defaultReps: 20, unit: 'reps' },
  { id: 'ab10', category: 'Abdomen', name: 'Abcoaster', defaultSets: 1, defaultReps: 20, unit: 'reps' }
];

const DEFAULT_ROUTINES = [
  {
    id: 'rot_hypertrophy_4d',
    name: 'Hipertrofia 4 Días (CenterFit)',
    days: [
      { dayName: 'Día 1: Pecho y Tríceps', exerciseIds: ['c5', 'c4', 'c6', 'tr7', 'tr3'] },
      { dayName: 'Día 2: Espalda y Bíceps', exerciseIds: ['b2', 'b4', 'b5', 'bi3', 'bi1'] },
      { dayName: 'Día 3: Pierna Completa', exerciseIds: ['p4', 'p2', 'p1', 'p7', 'p10'] },
      { dayName: 'Día 4: Hombro y Abdomen', exerciseIds: ['s3', 's5', 's8', 'ab2', 'ab1'] }
    ]
  },
  {
    id: 'rot_torso_pierna_3d',
    name: 'Torso / Pierna 3 Días',
    days: [
      { dayName: 'Día 1: Torso Enfoque Empuje', exerciseIds: ['c5', 'c7', 's3', 'tr7'] },
      { dayName: 'Día 2: Pierna y Core', exerciseIds: ['p5', 'p4', 'p2', 'ab10'] },
      { dayName: 'Día 3: Torso Enfoque Jalón', exerciseIds: ['b2', 'b7', 's5', 'bi3'] }
    ]
  }
];
