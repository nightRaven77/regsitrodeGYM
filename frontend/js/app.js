// ==========================================================================
// GymTracker PWA - Core Logic & State Management
// ==========================================================================

// Global App State
let appState = {
  profiles: [],
  activeProfileId: null,
  routines: [],
  activeRoutineId: null,
  activeDayIndex: 0,
  activeSession: null,
  weightsHistory: {},
  workoutHistory: [],
  restTimer: {
    intervalId: null,
    remainingSeconds: 0
  },
  sessionTimerInterval: null
};

const DEFAULT_PROFILES = [
  { id: 'prof_erick', name: 'Erick', avatar: '👨‍🏽‍🦱' },
  { id: 'prof_pareja', name: 'Pareja', avatar: '👩🏻' }
];

// --- Web Audio API Synth Beep for Rest Timer Alert ---
function playTimerBeep() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.6);
  } catch (e) {
    console.log('Audio Context not allowed without interaction');
  }

  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200, 100, 300]);
  }
}

// --- LocalStorage Helpers ---
function loadStorageData() {
  // 1. Profiles
  const savedProfiles = localStorage.getItem('gym_profiles');
  if (savedProfiles) {
    appState.profiles = JSON.parse(savedProfiles);
  } else {
    appState.profiles = DEFAULT_PROFILES;
    localStorage.setItem('gym_profiles', JSON.stringify(appState.profiles));
  }

  const savedActiveProfileId = localStorage.getItem('gym_active_profile_id');
  if (savedActiveProfileId && appState.profiles.some(p => p.id === savedActiveProfileId)) {
    appState.activeProfileId = savedActiveProfileId;
  } else {
    appState.activeProfileId = appState.profiles[0].id;
    localStorage.setItem('gym_active_profile_id', appState.activeProfileId);
  }

  loadActiveProfileData();
}

function loadActiveProfileData() {
  const pId = appState.activeProfileId;

  // 1. Fast load from LocalStorage for instant UI response
  const savedRoutines = localStorage.getItem(`gym_routines_${pId}`);
  if (savedRoutines) {
    appState.routines = JSON.parse(savedRoutines);
  } else {
    appState.routines = [DEFAULT_PRESET_ROUTINE];
    localStorage.setItem(`gym_routines_${pId}`, JSON.stringify(appState.routines));
  }

  const savedActiveRoutineId = localStorage.getItem(`gym_active_routine_id_${pId}`);
  appState.activeRoutineId = savedActiveRoutineId || appState.routines[0].id;

  const savedWeights = localStorage.getItem(`gym_weights_history_${pId}`);
  appState.weightsHistory = savedWeights ? JSON.parse(savedWeights) : {};

  const savedHistory = localStorage.getItem(`gym_workout_history_${pId}`);
  appState.workoutHistory = savedHistory ? JSON.parse(savedHistory) : [];

  const savedSession = localStorage.getItem(`gym_active_session_${pId}`);
  appState.activeSession = savedSession ? JSON.parse(savedSession) : null;

  // 2. Fetch latest data from SQLite Cloud API if connected
  fetchCloudState(pId);
}

async function fetchCloudState(pId) {
  try {
    const res = await fetch(`/api/state/${pId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.profiles && data.profiles.length > 0) {
        appState.profiles = data.profiles;
        localStorage.setItem('gym_profiles', JSON.stringify(appState.profiles));
      }
      if (data.routines) {
        appState.routines = data.routines;
        localStorage.setItem(`gym_routines_${pId}`, JSON.stringify(appState.routines));
      }
      if (data.weightsHistory) {
        appState.weightsHistory = data.weightsHistory;
        localStorage.setItem(`gym_weights_history_${pId}`, JSON.stringify(appState.weightsHistory));
      }
      if (data.workoutHistory) {
        appState.workoutHistory = data.workoutHistory;
        localStorage.setItem(`gym_workout_history_${pId}`, JSON.stringify(appState.workoutHistory));
      }
    }
  } catch (e) {
    // Offline mode
  }
}

async function syncToCloudDatabase() {
  const pId = appState.activeProfileId;
  if (!pId) return;

  try {
    const payload = {
      profiles: appState.profiles,
      activeProfileId: appState.activeProfileId,
      routines: appState.routines,
      weightsHistory: appState.weightsHistory,
      workoutHistory: appState.workoutHistory,
      activeSession: appState.activeSession
    };

    await fetch(`/api/sync/${pId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    // Fallback if server unreachable
  }
}

function saveProfiles() {
  localStorage.setItem('gym_profiles', JSON.stringify(appState.profiles));
  syncToCloudDatabase();
}

function saveRoutines() {
  const pId = appState.activeProfileId;
  localStorage.setItem(`gym_routines_${pId}`, JSON.stringify(appState.routines));
  syncToCloudDatabase();
}

function saveActiveSession() {
  const pId = appState.activeProfileId;
  if (appState.activeSession) {
    localStorage.setItem(`gym_active_session_${pId}`, JSON.stringify(appState.activeSession));
  } else {
    localStorage.removeItem(`gym_active_session_${pId}`);
  }
  syncToCloudDatabase();
}

function saveWeightsHistory() {
  const pId = appState.activeProfileId;
  localStorage.setItem(`gym_weights_history_${pId}`, JSON.stringify(appState.weightsHistory));
  syncToCloudDatabase();
}

function saveWorkoutHistory() {
  const pId = appState.activeProfileId;
  localStorage.setItem(`gym_workout_history_${pId}`, JSON.stringify(appState.workoutHistory));
  syncToCloudDatabase();
}

// --- DOM Element References ---
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');
const routineSelect = document.getElementById('routineSelect');
const daySelect = document.getElementById('daySelect');
const todayExerciseCount = document.getElementById('todayExerciseCount');
const todayExercisesList = document.getElementById('todayExercisesList');
const btnStartWorkout = document.getElementById('btnStartWorkout');

const workoutStartScreen = document.getElementById('workoutStartScreen');
const workoutActiveScreen = document.getElementById('workoutActiveScreen');
const activeRoutineDayName = document.getElementById('activeRoutineDayName');
const workoutStartTime = document.getElementById('workoutStartTime');
const sessionTimerDisplay = document.getElementById('sessionTimerDisplay');
const btnPauseWorkout = document.getElementById('btnPauseWorkout');
const btnEndWorkout = document.getElementById('btnEndWorkout');
const liveExercisesContainer = document.getElementById('liveExercisesContainer');
const headerStatus = document.getElementById('headerStatus');
const statusText = document.getElementById('statusText');

// Profile DOM Elements
const btnProfileSelect = document.getElementById('btnProfileSelect');
const activeProfileAvatar = document.getElementById('activeProfileAvatar');
const activeProfileName = document.getElementById('activeProfileName');
const profileModal = document.getElementById('profileModal');
const btnCloseProfileModal = document.getElementById('btnCloseProfileModal');
const profilesList = document.getElementById('profilesList');
const newProfileAvatar = document.getElementById('newProfileAvatar');
const newProfileName = document.getElementById('newProfileName');
const btnCreateProfile = document.getElementById('btnCreateProfile');

// Rest Timer Banner elements
const restTimerBanner = document.getElementById('restTimerBanner');
const restTimerSeconds = document.getElementById('restTimerSeconds');
const btnRestMinus15 = document.getElementById('btnRestMinus15');
const btnRestPlus15 = document.getElementById('btnRestPlus15');
const btnRestSkip = document.getElementById('btnRestSkip');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  loadStorageData();
  setupProfileUI();
  setupNavigation();
  refreshCurrentProfileUI();

  // Register Service Worker for PWA Offline mode
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW registration failed:', err));
  }
});

function refreshCurrentProfileUI() {
  updateHeaderProfilePill();
  setupRoutineDropdowns();
  setupCatalogFilter();
  renderCatalog();
  renderHistory();
  renderRoutinesList();

  if (typeof initAnalytics === 'function') {
    initAnalytics();
  }

  if (appState.activeSession) {
    resumeActiveSessionUI();
  } else {
    workoutActiveScreen.classList.add('hidden');
    workoutStartScreen.classList.remove('hidden');
    headerStatus.style.borderColor = 'rgba(0, 242, 254, 0.2)';
    statusText.textContent = 'Listo';
  }
}

// --- Multi-Profile UI Setup & Handlers ---
function setupProfileUI() {
  btnProfileSelect.addEventListener('click', () => {
    renderProfilesModal();
    profileModal.classList.remove('hidden');
  });

  btnCloseProfileModal.addEventListener('click', () => {
    profileModal.classList.add('hidden');
  });

  btnCreateProfile.addEventListener('click', () => {
    const name = newProfileName.value.trim();
    if (!name) {
      alert('Por favor ingresa un nombre para el perfil.');
      return;
    }

    const newProfile = {
      id: 'prof_' + Date.now(),
      name: name,
      avatar: newProfileAvatar.value
    };

    appState.profiles.push(newProfile);
    saveProfiles();
    newProfileName.value = '';
    
    // Switch to newly created profile
    switchProfile(newProfile.id);
    profileModal.classList.add('hidden');
  });

  // Backup Export JSON handler
  const btnExportBackup = document.getElementById('btnExportBackup');
  const btnImportBackup = document.getElementById('btnImportBackup');
  const importFileInput = document.getElementById('importFileInput');

  btnExportBackup.onclick = () => {
    const backupData = {
      appName: "GymTracker",
      version: "2.0",
      exportDate: new Date().toISOString(),
      profiles: appState.profiles,
      activeProfileId: appState.activeProfileId,
      profileDataMap: {}
    };

    appState.profiles.forEach(p => {
      const pId = p.id;
      backupData.profileDataMap[pId] = {
        routines: JSON.parse(localStorage.getItem(`gym_routines_${pId}`) || '[]'),
        weightsHistory: JSON.parse(localStorage.getItem(`gym_weights_history_${pId}`) || '{}'),
        workoutHistory: JSON.parse(localStorage.getItem(`gym_workout_history_${pId}`) || '[]'),
        activeSession: JSON.parse(localStorage.getItem(`gym_active_session_${pId}`) || 'null')
      };
    });

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gymtracker_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  btnImportBackup.onclick = () => importFileInput.click();

  importFileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data.profiles || !data.profileDataMap) {
          alert('Archivo de respaldo no válido.');
          return;
        }

        appState.profiles = data.profiles;
        saveProfiles();

        Object.keys(data.profileDataMap).forEach(pId => {
          const pData = data.profileDataMap[pId];
          if (pData.routines) localStorage.setItem(`gym_routines_${pId}`, JSON.stringify(pData.routines));
          if (pData.weightsHistory) localStorage.setItem(`gym_weights_history_${pId}`, JSON.stringify(pData.weightsHistory));
          if (pData.workoutHistory) localStorage.setItem(`gym_workout_history_${pId}`, JSON.stringify(pData.workoutHistory));
          if (pData.activeSession) localStorage.setItem(`gym_active_session_${pId}`, JSON.stringify(pData.activeSession));
        });

        if (data.activeProfileId) {
          appState.activeProfileId = data.activeProfileId;
          localStorage.setItem('gym_active_profile_id', data.activeProfileId);
        }

        loadActiveProfileData();
        refreshCurrentProfileUI();
        profileModal.classList.add('hidden');
        alert('¡Copia de seguridad restaurada con éxito!');
      } catch (err) {
        alert('Error al leer el archivo JSON de respaldo.');
      }
    };
    reader.readAsText(file);
  };
}

function updateHeaderProfilePill() {
  const activeProfile = appState.profiles.find(p => p.id === appState.activeProfileId) || appState.profiles[0];
  activeProfileAvatar.textContent = activeProfile.avatar;
  activeProfileName.textContent = activeProfile.name;
}

function renderProfilesModal() {
  profilesList.innerHTML = '';
  appState.profiles.forEach(p => {
    const isCurrent = p.id === appState.activeProfileId;
    const card = document.createElement('div');
    card.className = `profile-item-card ${isCurrent ? 'active' : ''}`;
    
    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 24px;">${p.avatar}</span>
        <div>
          <strong style="font-size: 15px; color: #fff;">${p.name}</strong>
          ${isCurrent ? '<span style="font-size: 11px; color: var(--accent-cyan); display: block;">Activo ahora</span>' : ''}
        </div>
      </div>
      <div style="display: flex; gap: 6px;">
        ${!isCurrent ? '<button class="btn btn-primary btn-sm select-p-btn">Usar</button>' : ''}
        ${appState.profiles.length > 1 ? '<button class="btn btn-danger btn-sm del-p-btn">✕</button>' : ''}
      </div>
    `;

    const selectBtn = card.querySelector('.select-p-btn');
    if (selectBtn) {
      selectBtn.onclick = () => {
        switchProfile(p.id);
        profileModal.classList.add('hidden');
      };
    }

    const delBtn = card.querySelector('.del-p-btn');
    if (delBtn) {
      delBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm(`¿Eliminar el perfil de ${p.name}? Se borrarán sus rutinas e historial.`)) {
          deleteProfile(p.id);
        }
      };
    }

    profilesList.appendChild(card);
  });
}

function switchProfile(profileId) {
  if (appState.activeProfileId === profileId) return;

  appState.activeProfileId = profileId;
  localStorage.setItem('gym_active_profile_id', profileId);

  // Stop active timers if any
  clearInterval(appState.sessionTimerInterval);
  clearInterval(appState.restTimer.intervalId);
  restTimerBanner.classList.add('hidden');

  loadActiveProfileData();
  refreshCurrentProfileUI();
}

function deleteProfile(profileId) {
  appState.profiles = appState.profiles.filter(p => p.id !== profileId);
  saveProfiles();

  // Clean local storage for deleted profile
  localStorage.removeItem(`gym_routines_${profileId}`);
  localStorage.removeItem(`gym_weights_history_${profileId}`);
  localStorage.removeItem(`gym_workout_history_${profileId}`);
  localStorage.removeItem(`gym_active_session_${profileId}`);

  if (appState.activeProfileId === profileId) {
    appState.activeProfileId = appState.profiles[0].id;
    localStorage.setItem('gym_active_profile_id', appState.activeProfileId);
    loadActiveProfileData();
    refreshCurrentProfileUI();
  }

  renderProfilesModal();
}


// --- Tab Navigation ---
function setupNavigation() {
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');

      navItems.forEach(n => n.classList.remove('active'));
      tabContents.forEach(t => t.classList.remove('active'));

      item.classList.add('active');
      const targetEl = document.getElementById(targetTab);
      if (targetEl) targetEl.classList.add('active');

      if (targetTab === 'tab-analytics' && typeof renderAnalyticsDashboard === 'function') {
        renderAnalyticsDashboard();
      }
    });
  });
}

// --- Routine Selectors Setup ---
function setupRoutineDropdowns() {
  routineSelect.innerHTML = '';
  appState.routines.forEach(routine => {
    const option = document.createElement('option');
    option.value = routine.id;
    option.textContent = routine.name;
    if (routine.id === appState.activeRoutineId) option.selected = true;
    routineSelect.appendChild(option);
  });

  updateDayDropdown();

  routineSelect.addEventListener('change', (e) => {
    appState.activeRoutineId = e.target.value;
    localStorage.setItem('gym_active_routine_id', appState.activeRoutineId);
    updateDayDropdown();
  });

  daySelect.addEventListener('change', (e) => {
    appState.activeDayIndex = parseInt(e.target.value, 10);
    renderTodayExercisesPreview();
  });

  btnStartWorkout.addEventListener('click', startNewWorkoutSession);
}

function updateDayDropdown() {
  const activeRoutine = appState.routines.find(r => r.id === appState.activeRoutineId) || appState.routines[0];
  daySelect.innerHTML = '';
  
  if (activeRoutine && activeRoutine.days) {
    activeRoutine.days.forEach((day, idx) => {
      const option = document.createElement('option');
      option.value = idx;
      option.textContent = day.dayName;
      daySelect.appendChild(option);
    });
  }

  appState.activeDayIndex = 0;
  renderTodayExercisesPreview();
}

function renderTodayExercisesPreview() {
  const activeRoutine = appState.routines.find(r => r.id === appState.activeRoutineId) || appState.routines[0];
  if (!activeRoutine || !activeRoutine.days || !activeRoutine.days[appState.activeDayIndex]) {
    todayExercisesList.innerHTML = '<div style="color: var(--text-muted);">Sin ejercicios asignados</div>';
    todayExerciseCount.textContent = '0 ejercicios';
    return;
  }

  const currentDay = activeRoutine.days[appState.activeDayIndex];
  const exercises = currentDay.exerciseIds
    .map(id => DEFAULT_EXERCISES_CATALOG.find(ex => ex.id === id))
    .filter(Boolean);

  todayExerciseCount.textContent = `${exercises.length} ejercicios`;
  todayExercisesList.innerHTML = '';

  exercises.forEach(ex => {
    const item = document.createElement('div');
    item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: var(--bg-input); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 13px;';
    
    const lastHistory = appState.weightsHistory[ex.id];
    const lastWeightStr = lastHistory ? `${lastHistory.weight} kg` : 'Sin registro';

    item.innerHTML = `
      <div>
        <strong style="color: #fff;">${ex.name}</strong>
        <span class="badge badge-${ex.category.toLowerCase()}" style="margin-left: 6px;">${ex.category}</span>
      </div>
      <div style="color: var(--text-muted); font-size: 12px;">
        ${ex.defaultSets}x${ex.defaultReps} ${ex.unit} • <span style="color: var(--accent-cyan);">${lastWeightStr}</span>
      </div>
    `;
    todayExercisesList.appendChild(item);
  });
}

// --- Live Workout Session Management ---
function startNewWorkoutSession() {
  const activeRoutine = appState.routines.find(r => r.id === appState.activeRoutineId) || appState.routines[0];
  const currentDay = activeRoutine.days[appState.activeDayIndex];

  if (!currentDay || !currentDay.exerciseIds || currentDay.exerciseIds.length === 0) {
    alert('Por favor selecciona un día con ejercicios asignados.');
    return;
  }

  const exercises = currentDay.exerciseIds
    .map(id => DEFAULT_EXERCISES_CATALOG.find(ex => ex.id === id))
    .filter(Boolean);

  const now = new Date();
  
  // Construct sets data structure for each exercise
  const setsData = {};
  exercises.forEach(ex => {
    const lastHistory = appState.weightsHistory[ex.id];
    const initialWeight = lastHistory ? lastHistory.weight : 0;
    
    setsData[ex.id] = [];
    for (let i = 1; i <= ex.defaultSets; i++) {
      setsData[ex.id].push({
        setNum: i,
        targetReps: ex.defaultReps,
        actualReps: ex.defaultReps,
        weight: initialWeight,
        completed: false
      });
    }
  });

  appState.activeSession = {
    routineName: activeRoutine.name,
    dayName: currentDay.dayName,
    startTimeIso: now.toISOString(),
    startTimeFormatted: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    elapsedSeconds: 0,
    isPaused: false,
    exercises: exercises,
    setsData: setsData
  };

  saveActiveSession();
  resumeActiveSessionUI();
}

function resumeActiveSessionUI() {
  workoutStartScreen.classList.add('hidden');
  workoutActiveScreen.classList.remove('hidden');

  headerStatus.style.borderColor = 'var(--accent-green)';
  statusText.textContent = 'En Entrenamiento';

  activeRoutineDayName.textContent = appState.activeSession.dayName;
  workoutStartTime.textContent = `Inicio: ${appState.activeSession.startTimeFormatted}`;

  renderLiveExercisesCards();
  startSessionTimer();

  btnPauseWorkout.onclick = togglePauseWorkout;
  btnEndWorkout.onclick = confirmEndWorkout;
}

function startSessionTimer() {
  clearInterval(appState.sessionTimerInterval);
  appState.sessionTimerInterval = setInterval(() => {
    if (!appState.activeSession || appState.activeSession.isPaused) return;

    appState.activeSession.elapsedSeconds += 1;
    updateSessionTimerDisplay();
    saveActiveSession();
  }, 1000);
  updateSessionTimerDisplay();
}

function updateSessionTimerDisplay() {
  const secs = appState.activeSession ? appState.activeSession.elapsedSeconds : 0;
  const h = String(Math.floor(secs / 3600)).padStart(2, '0');
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  sessionTimerDisplay.textContent = `${h}:${m}:${s}`;
}

function togglePauseWorkout() {
  if (!appState.activeSession) return;
  appState.activeSession.isPaused = !appState.activeSession.isPaused;
  btnPauseWorkout.textContent = appState.activeSession.isPaused ? 'Reanudar' : 'Pausar';
  btnPauseWorkout.classList.toggle('btn-success', appState.activeSession.isPaused);
  statusText.textContent = appState.activeSession.isPaused ? 'Pausado' : 'En Entrenamiento';
  saveActiveSession();
}

function renderLiveExercisesCards() {
  liveExercisesContainer.innerHTML = '';

  appState.activeSession.exercises.forEach(ex => {
    const sets = appState.activeSession.setsData[ex.id] || [];
    const allDone = sets.every(s => s.completed);
    const lastHistory = appState.weightsHistory[ex.id];
    const unit = ex.weightUnit || 'kg';
    const lastWeightStr = lastHistory ? `(Último: ${lastHistory.weight} ${lastHistory.unit || 'kg'})` : '';

    const card = document.createElement('div');
    card.className = `exercise-live-card ${allDone ? 'completed' : ''}`;
    card.innerHTML = `
      <div class="exercise-live-title">
        <div>
          <span>${ex.name}</span>
          <span class="badge badge-${ex.category.toLowerCase()}" style="margin-left: 6px;">${ex.category}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="font-size: 11px; color: var(--accent-cyan); font-weight: 500;">
            ${lastWeightStr}
          </div>
          <div class="unit-toggle-group">
            <button class="btn-unit-toggle ${unit === 'kg' ? 'active' : ''}" data-unit="kg">kg</button>
            <button class="btn-unit-toggle ${unit === 'lb' ? 'active' : ''}" data-unit="lb">lb</button>
          </div>
        </div>
      </div>
      <div id="setsContainer_${ex.id}"></div>
    `;

    // Unit toggle buttons (kg vs lb) handler
    card.querySelectorAll('.btn-unit-toggle').forEach(btn => {
      btn.onclick = () => {
        ex.weightUnit = btn.getAttribute('data-unit');
        saveActiveSession();
        renderLiveExercisesCards();
      };
    });

    liveExercisesContainer.appendChild(card);
    const setsContainer = card.querySelector(`#setsContainer_${ex.id}`);

    sets.forEach(set => {
      const weightVal = set.weight || 0;
      let comparativeText = '';
      if (unit === 'kg') {
        const lbVal = (weightVal * 2.20462).toFixed(1);
        comparativeText = `≈ ${lbVal} lb`;
      } else {
        const kgVal = (weightVal * 0.453592).toFixed(1);
        comparativeText = `≈ ${kgVal} kg`;
      }

      const row = document.createElement('div');
      row.className = 'set-row';
      row.style.gridTemplateColumns = '32px 1.3fr 1.3fr 44px';
      row.innerHTML = `
        <div class="set-number">S${set.setNum}</div>
        
        <!-- Weight Input + Stepper + Comparative Conversion -->
        <div class="set-input-group">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
            <label class="set-input-label">Peso (${unit})</label>
            <span class="conversion-badge">${comparativeText}</span>
          </div>
          <div class="stepper-group">
            <button class="btn-step btn-weight-minus" ${set.completed ? 'disabled' : ''}>-</button>
            <input type="number" step="${unit === 'lb' ? '5' : '0.5'}" class="set-input weight-input" value="${set.weight}" ${set.completed ? 'disabled' : ''}>
            <button class="btn-step btn-weight-plus" ${set.completed ? 'disabled' : ''}>+</button>
          </div>
        </div>

        <!-- Reps Input + Stepper -->
        <div class="set-input-group">
          <label class="set-input-label" style="margin-bottom: 2px;">Reps (${ex.unit})</label>
          <div class="stepper-group">
            <button class="btn-step btn-reps-minus" ${set.completed ? 'disabled' : ''}>-</button>
            <input type="number" class="set-input reps-input" value="${set.actualReps}" ${set.completed ? 'disabled' : ''}>
            <button class="btn-step btn-reps-plus" ${set.completed ? 'disabled' : ''}>+</button>
          </div>
        </div>

        <button class="btn-check-set ${set.completed ? 'done' : ''}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
        </button>
      `;

      const weightInput = row.querySelector('.weight-input');
      const repsInput = row.querySelector('.reps-input');
      const btnCheck = row.querySelector('.btn-check-set');
      const conversionBadge = row.querySelector('.conversion-badge');

      const btnWeightMinus = row.querySelector('.btn-weight-minus');
      const btnWeightPlus = row.querySelector('.btn-weight-plus');
      const btnRepsMinus = row.querySelector('.btn-reps-minus');
      const btnRepsPlus = row.querySelector('.btn-reps-plus');

      const updateConversion = (w) => {
        if (unit === 'kg') {
          conversionBadge.textContent = `≈ ${(w * 2.20462).toFixed(1)} lb`;
        } else {
          conversionBadge.textContent = `≈ ${(w * 0.453592).toFixed(1)} kg`;
        }
      };

      const weightStep = unit === 'lb' ? 5 : 2.5;

      btnWeightMinus.onclick = () => {
        set.weight = Math.max(0, parseFloat((set.weight - weightStep).toFixed(1)));
        weightInput.value = set.weight;
        updateConversion(set.weight);
        saveActiveSession();
      };

      btnWeightPlus.onclick = () => {
        set.weight = parseFloat((set.weight + weightStep).toFixed(1));
        weightInput.value = set.weight;
        updateConversion(set.weight);
        saveActiveSession();
      };

      btnRepsMinus.onclick = () => {
        set.actualReps = Math.max(0, set.actualReps - 1);
        repsInput.value = set.actualReps;
        saveActiveSession();
      };

      btnRepsPlus.onclick = () => {
        set.actualReps = set.actualReps + 1;
        repsInput.value = set.actualReps;
        saveActiveSession();
      };

      weightInput.addEventListener('input', (e) => {
        set.weight = parseFloat(e.target.value) || 0;
        updateConversion(set.weight);
        saveActiveSession();
      });

      repsInput.addEventListener('change', (e) => {
        set.actualReps = parseInt(e.target.value, 10) || 0;
        saveActiveSession();
      });

      btnCheck.addEventListener('click', () => {
        set.weight = parseFloat(weightInput.value) || 0;
        set.actualReps = parseInt(repsInput.value, 10) || 0;
        set.completed = !set.completed;

        if (set.completed) {
          appState.weightsHistory[ex.id] = {
            weight: set.weight,
            unit: unit,
            reps: set.actualReps,
            date: new Date().toISOString()
          };
          saveWeightsHistory();
          triggerRestTimer(60);
        }

        saveActiveSession();
        renderLiveExercisesCards();
      });

      setsContainer.appendChild(row);
    });

    // Controls bar to Add / Remove Series dynamically
    const controlsBar = document.createElement('div');
    controlsBar.className = 'set-controls-bar';
    controlsBar.innerHTML = `
      <button class="btn-add-set">+ Agregar Serie</button>
      ${sets.length > 1 ? '<button class="btn-remove-set">- Eliminar Serie</button>' : ''}
    `;

    controlsBar.querySelector('.btn-add-set').onclick = () => {
      const lastSet = sets[sets.length - 1];
      const newSetNum = sets.length + 1;
      sets.push({
        setNum: newSetNum,
        targetReps: lastSet ? lastSet.targetReps : ex.defaultReps,
        actualReps: lastSet ? lastSet.actualReps : ex.defaultReps,
        weight: lastSet ? lastSet.weight : 0,
        completed: false
      });
      saveActiveSession();
      renderLiveExercisesCards();
    };

    const btnRemSet = controlsBar.querySelector('.btn-remove-set');
    if (btnRemSet) {
      btnRemSet.onclick = () => {
        if (sets.length > 1) {
          sets.pop();
          saveActiveSession();
          renderLiveExercisesCards();
        }
      };
    }

    card.appendChild(controlsBar);
  });
}

// --- Rest Timer Floating Banner Logic ---
function triggerRestTimer(seconds = 60) {
  clearInterval(appState.restTimer.intervalId);
  appState.restTimer.remainingSeconds = seconds;

  restTimerBanner.classList.remove('hidden');
  updateRestTimerUI();

  appState.restTimer.intervalId = setInterval(() => {
    appState.restTimer.remainingSeconds -= 1;
    updateRestTimerUI();

    if (appState.restTimer.remainingSeconds <= 0) {
      clearInterval(appState.restTimer.intervalId);
      restTimerBanner.classList.add('hidden');
      playTimerBeep();
    }
  }, 1000);
}

function updateRestTimerUI() {
  restTimerSeconds.textContent = `${appState.restTimer.remainingSeconds}s`;
}

btnRestMinus15.onclick = () => {
  appState.restTimer.remainingSeconds = Math.max(0, appState.restTimer.remainingSeconds - 15);
  updateRestTimerUI();
};

btnRestPlus15.onclick = () => {
  appState.restTimer.remainingSeconds += 15;
  updateRestTimerUI();
};

btnRestSkip.onclick = () => {
  clearInterval(appState.restTimer.intervalId);
  restTimerBanner.classList.add('hidden');
};

// --- End & Save Workout ---
function confirmEndWorkout() {
  if (!confirm('¿Deseas finalizar y guardar este entrenamiento?')) return;

  clearInterval(appState.sessionTimerInterval);
  clearInterval(appState.restTimer.intervalId);
  restTimerBanner.classList.add('hidden');

  let totalSetsCompleted = 0;
  let totalVolumeKg = 0;

  Object.keys(appState.activeSession.setsData).forEach(exId => {
    const ex = appState.activeSession.exercises.find(e => e.id === exId);
    const unit = ex ? (ex.weightUnit || 'kg') : 'kg';
    const sets = appState.activeSession.setsData[exId];
    sets.forEach(set => {
      if (set.completed) {
        totalSetsCompleted += 1;
        const weightKg = (unit === 'lb') ? (set.weight * 0.453592) : set.weight;
        totalVolumeKg += (weightKg * set.actualReps);
      }
    });
  });

  // Extract detailed sets data for each exercise with unit metadata
  const detailedExercises = appState.activeSession.exercises.map(ex => {
    const unit = ex.weightUnit || 'kg';
    const completedSets = (appState.activeSession.setsData[ex.id] || [])
      .filter(s => s.completed)
      .map(s => {
        const weightKg = (unit === 'lb') ? (s.weight * 0.453592) : s.weight;
        return {
          setNum: s.setNum,
          weight: s.weight,
          weightUnit: unit,
          weightKg: parseFloat(weightKg.toFixed(1)),
          actualReps: s.actualReps
        };
      });
    return {
      name: ex.name,
      category: ex.category,
      unit: ex.unit || 'reps',
      weightUnit: unit,
      sets: completedSets
    };
  }).filter(ex => ex.sets.length > 0);

  const workoutRecord = {
    id: 'work_' + Date.now(),
    dateFormatted: new Date().toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }),
    timeFormatted: appState.activeSession.startTimeFormatted,
    dayName: appState.activeSession.dayName,
    durationSeconds: appState.activeSession.elapsedSeconds,
    totalSets: totalSetsCompleted,
    totalVolumeKg: Math.round(totalVolumeKg),
    exercisesSummary: appState.activeSession.exercises.map(ex => ({
      name: ex.name,
      category: ex.category,
      completedSets: appState.activeSession.setsData[ex.id].filter(s => s.completed).length
    })),
    detailedExercises: detailedExercises
  };

  appState.workoutHistory.unshift(workoutRecord);
  saveWorkoutHistory();

  appState.activeSession = null;
  saveActiveSession();

  workoutActiveScreen.classList.add('hidden');
  workoutStartScreen.classList.remove('hidden');
  headerStatus.style.borderColor = 'rgba(0, 242, 254, 0.2)';
  statusText.textContent = 'Listo';

  renderHistory();
  alert(`¡Entrenamiento Guardado! 💪\nDuración: ${Math.floor(workoutRecord.durationSeconds/60)} mins\nSeries Completadas: ${totalSetsCompleted}`);
}

// --- Exercises Catalog View & Filtering ---
function setupCatalogFilter() {
  const filterPills = document.querySelectorAll('#categoryFilters .filter-pill');
  const catalogSearch = document.getElementById('catalogSearch');

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      renderCatalog(pill.getAttribute('data-cat'), catalogSearch.value);
    });
  });

  catalogSearch.addEventListener('input', (e) => {
    const activePill = document.querySelector('#categoryFilters .filter-pill.active');
    const activeCat = activePill ? activePill.getAttribute('data-cat') : 'ALL';
    renderCatalog(activeCat, e.target.value);
  });
}

function renderCatalog(category = 'ALL', searchQuery = '') {
  const catalogList = document.getElementById('catalogList');
  catalogList.innerHTML = '';

  const filtered = DEFAULT_EXERCISES_CATALOG.filter(ex => {
    const matchesCat = (category === 'ALL') || (ex.category.toLowerCase() === category.toLowerCase());
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  filtered.forEach(ex => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginBottom = '8px';
    card.style.padding = '12px 16px';

    const lastHistory = appState.weightsHistory[ex.id];
    const lastWeightStr = lastHistory ? `${lastHistory.weight} ${lastHistory.unit || 'kg'} (Última vez)` : 'Sin registro de peso';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong style="font-size: 15px; color: #fff;">${ex.name}</strong>
          <span class="badge badge-${ex.category.toLowerCase()}" style="margin-left: 6px;">${ex.category}</span>
        </div>
        <div style="font-size: 12px; color: var(--accent-cyan); font-weight: 600;">
          ${ex.defaultSets} series x ${ex.defaultReps} ${ex.unit}
        </div>
      </div>
      <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
        Carga sugerida: <span style="color: #fff;">${lastWeightStr}</span>
      </div>
    `;
    catalogList.appendChild(card);
  });
}

// --- History View ---
function renderHistory() {
  const historyLogsContainer = document.getElementById('historyLogsContainer');
  historyLogsContainer.innerHTML = '';

  if (!appState.workoutHistory || appState.workoutHistory.length === 0) {
    historyLogsContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">Aún no has registrado ningún entrenamiento.</div>';
    return;
  }

  appState.workoutHistory.forEach(record => {
    const mins = Math.floor(record.durationSeconds / 60);
    const item = document.createElement('div');
    item.className = 'history-item card';
    item.style.marginBottom = '12px';

    const hasDetails = record.detailedExercises && record.detailedExercises.length > 0;

    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <strong style="font-size: 16px; color: #fff;">${record.dayName}</strong>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 11px; color: var(--accent-cyan);">${record.dateFormatted} • ${record.timeFormatted}</span>
          <button class="btn btn-danger btn-sm del-log-btn" style="padding: 2px 6px; font-size: 11px;">🗑️</button>
        </div>
      </div>

      <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">
        ⏱️ Duración: <strong>${mins} min</strong> • 🏋️ Series: <strong>${record.totalSets}</strong> • 📊 Vol: <strong>${record.totalVolumeKg} kg</strong>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 11px; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
          ${record.exercisesSummary ? record.exercisesSummary.map(e => `${e.name}`).join(', ') : ''}
        </div>
        <span class="toggle-detail-label" style="font-size: 11px; color: var(--accent-cyan); font-weight: 700; white-space: nowrap; margin-left: 10px;">
          Ver Detalle ▼
        </span>
      </div>

      <div class="history-detail-drawer hidden">
        <div style="font-size: 12px; font-weight: 700; color: #fff; margin-bottom: 8px;">
          📋 Desglose de Ejercicios y Series:
        </div>
        <div class="detail-exercises-list"></div>
      </div>
    `;

    // Delete Log Button Handler
    const delLogBtn = item.querySelector('.del-log-btn');
    delLogBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm('¿Borrar este registro del historial?')) {
        appState.workoutHistory = appState.workoutHistory.filter(h => h.id !== record.id);
        saveWorkoutHistory();
        renderHistory();
      }
    };

    // Toggle Drawer Handler
    const drawer = item.querySelector('.history-detail-drawer');
    const toggleLabel = item.querySelector('.toggle-detail-label');
    const detailList = item.querySelector('.detail-exercises-list');

    item.onclick = (e) => {
      if (e.target.closest('.del-log-btn')) return;

      const isHidden = drawer.classList.toggle('hidden');
      toggleLabel.textContent = isHidden ? 'Ver Detalle ▼' : 'Ocultar Detalle ▲';

      if (!isHidden && detailList.children.length === 0) {
        if (hasDetails) {
          record.detailedExercises.forEach(ex => {
            const exBlock = document.createElement('div');
            exBlock.className = 'history-detail-exercise';
            
            const setsHtml = ex.sets.map(s => {
              const u = s.weightUnit || 'kg';
              const altUnitText = (u === 'lb') 
                ? `(≈ ${(s.weight * 0.453592).toFixed(1)} kg)` 
                : `(≈ ${(s.weight * 2.20462).toFixed(1)} lb)`;
              return `<span class="history-set-tag">S${s.setNum}: <strong>${s.weight} ${u}</strong> <span style="font-size:10px; color:var(--accent-green);">${altUnitText}</span> × ${s.actualReps} ${ex.unit || 'reps'}</span>`;
            }).join('');

            exBlock.innerHTML = `
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong style="font-size: 13px; color: #fff;">${ex.name}</strong>
                <span class="badge badge-${ex.category.toLowerCase()}">${ex.category}</span>
              </div>
              <div style="display: flex; flex-wrap: wrap; margin-top: 4px;">
                ${setsHtml}
              </div>
            `;
            detailList.appendChild(exBlock);
          });
        } else if (record.exercisesSummary) {
          record.exercisesSummary.forEach(ex => {
            const exBlock = document.createElement('div');
            exBlock.className = 'history-detail-exercise';
            exBlock.innerHTML = `
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong style="font-size: 13px; color: #fff;">${ex.name}</strong>
                <span class="badge badge-${ex.category.toLowerCase()}">${ex.category}</span>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                ${ex.completedSets} series completadas
              </div>
            `;
            detailList.appendChild(exBlock);
          });
        }
      }
    };

    historyLogsContainer.appendChild(item);
  });
}

// --- Routine Configurator & Editor ---
const routineEditorCard = document.getElementById('routineEditorCard');
const routinesListContainer = document.getElementById('routinesListContainer');
const btnNewRoutine = document.getElementById('btnNewRoutine');
const btnCloseEditor = document.getElementById('btnCloseEditor');
const routineNameInput = document.getElementById('routineNameInput');
const daysEditorContainer = document.getElementById('daysEditorContainer');
const btnAddDayBtn = document.getElementById('btnAddDayBtn');
const btnSaveRoutine = document.getElementById('btnSaveRoutine');

let editingRoutine = null;

function renderRoutinesList() {
  routinesListContainer.innerHTML = '';
  if (!appState.routines || appState.routines.length === 0) {
    routinesListContainer.innerHTML = `
      <div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">
        No tienes ninguna rutina configurada. Toca <strong>"+ Nueva"</strong> arriba para armar tu rutina personalizada desde 0.
      </div>
    `;
    return;
  }

  appState.routines.forEach(r => {
    const item = document.createElement('div');
    item.className = 'card';
    item.style.marginBottom = '10px';

    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong style="font-size: 16px; color: #fff;">${r.name}</strong>
          <div style="font-size: 12px; color: var(--text-muted);">${r.days ? r.days.length : 0} Días de entrenamiento</div>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-secondary btn-sm edit-r-btn">Editar</button>
          <button class="btn btn-danger btn-sm del-r-btn">🗑️</button>
        </div>
      </div>
    `;

    item.querySelector('.edit-r-btn').onclick = () => openRoutineEditor(r);
    item.querySelector('.del-r-btn').onclick = () => {
      if (confirm(`¿Eliminar la rutina "${r.name}"?`)) {
        appState.routines = appState.routines.filter(item => item.id !== r.id);
        if (appState.activeRoutineId === r.id) {
          appState.activeRoutineId = appState.routines.length > 0 ? appState.routines[0].id : null;
        }
        saveRoutines();
        renderRoutinesList();
        setupRoutineDropdowns();
      }
    };

    routinesListContainer.appendChild(item);
  });
}

btnNewRoutine.onclick = () => {
  openRoutineEditor({
    id: 'routine_' + Date.now(),
    name: 'Mi Rutina Personalizada',
    days: [
      { dayName: 'Día 1: Mi primer día', exerciseIds: [] }
    ]
  });
};

btnCloseEditor.onclick = () => routineEditorCard.classList.add('hidden');

function openRoutineEditor(routine) {
  editingRoutine = JSON.parse(JSON.stringify(routine));
  routineNameInput.value = editingRoutine.name;
  routineEditorCard.classList.remove('hidden');
  renderDaysInEditor();
}

function renderDaysInEditor() {
  daysEditorContainer.innerHTML = '';
  const muscleCategories = ['Pierna', 'Pectoral', 'Espalda', 'Hombro', 'Bíceps', 'Tríceps', 'Abdomen'];
  const categoryIcons = {
    'Pierna': '🦵',
    'Pectoral': '🛡️',
    'Espalda': '📐',
    'Hombro': '⚡',
    'Bíceps': '🦾',
    'Tríceps': '💥',
    'Abdomen': '🎯'
  };

  editingRoutine.days.forEach((day, dIdx) => {
    const dayCard = document.createElement('div');
    dayCard.className = 'routine-day-card';

    // Summary of selected exercise objects
    const selectedExList = day.exerciseIds
      .map(id => DEFAULT_EXERCISES_CATALOG.find(ex => ex.id === id))
      .filter(Boolean);

    dayCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <input type="text" class="form-control day-name-in" value="${day.dayName}" style="font-weight: 700; width: 80%;">
        <button class="btn btn-danger btn-sm del-day-btn">✕</button>
      </div>

      <!-- Selected Summary Badge -->
      <div style="margin-bottom: 10px; padding: 8px; background: rgba(0, 242, 254, 0.05); border-radius: var(--radius-sm); border: 1px solid rgba(0, 242, 254, 0.15);">
        <div style="font-size: 11px; color: var(--accent-cyan); font-weight: 700; margin-bottom: 4px;">
          Ejercicios Seleccionados para este día (${selectedExList.length}):
        </div>
        <div class="selected-summary-chips" style="display: flex; flex-wrap: wrap; gap: 4px;">
          ${selectedExList.length === 0 ? '<span style="font-size: 11px; color: var(--text-muted);">Ningún ejercicio seleccionado. Haz clic abajo en cada músculo para agregarlos.</span>' : ''}
        </div>
      </div>

      <div style="font-size: 12px; font-weight: 700; color: #fff; margin-bottom: 6px; border-bottom: 1px solid var(--border-color); padding-bottom: 4px;">
        📁 Seleccionar Ejercicios por Grupo Muscular:
      </div>
      <div class="muscle-groups-container"></div>
    `;

    // 1. Day Name Input Handler
    const dayNameIn = dayCard.querySelector('.day-name-in');
    dayNameIn.onchange = (e) => day.dayName = e.target.value;

    // 2. Delete Day Handler
    dayCard.querySelector('.del-day-btn').onclick = () => {
      editingRoutine.days.splice(dIdx, 1);
      renderDaysInEditor();
    };

    // 3. Render Selected Exercises with Reordering Controls (▲ / ▼ / ✕)
    const selectedSummaryChips = dayCard.querySelector('.selected-summary-chips');
    selectedExList.forEach((ex, exIdx) => {
      const row = document.createElement('div');
      row.className = 'reorder-item-row';
      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <span style="font-weight: 800; color: var(--accent-cyan); font-size: 12px; width: 22px;">#${exIdx + 1}</span>
          <strong style="color: #fff; font-size: 13px; text-overflow: ellipsis; overflow: hidden;">${ex.name}</strong>
          <span class="badge badge-${ex.category.toLowerCase()}">${ex.category}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 2px; flex-shrink: 0;">
          <button class="btn-reorder btn-up" ${exIdx === 0 ? 'disabled style="opacity:0.3;"' : ''}>▲</button>
          <button class="btn-reorder btn-down" ${exIdx === selectedExList.length - 1 ? 'disabled style="opacity:0.3;"' : ''}>▼</button>
          <button class="btn-reorder btn-remove" style="color: var(--accent-red); margin-left: 4px;">✕</button>
        </div>
      `;

      const btnUp = row.querySelector('.btn-up');
      btnUp.onclick = (e) => {
        e.stopPropagation();
        if (exIdx > 0) {
          const temp = day.exerciseIds[exIdx];
          day.exerciseIds[exIdx] = day.exerciseIds[exIdx - 1];
          day.exerciseIds[exIdx - 1] = temp;
          renderDaysInEditor();
        }
      };

      const btnDown = row.querySelector('.btn-down');
      btnDown.onclick = (e) => {
        e.stopPropagation();
        if (exIdx < selectedExList.length - 1) {
          const temp = day.exerciseIds[exIdx];
          day.exerciseIds[exIdx] = day.exerciseIds[exIdx + 1];
          day.exerciseIds[exIdx + 1] = temp;
          renderDaysInEditor();
        }
      };

      const btnRemove = row.querySelector('.btn-remove');
      btnRemove.onclick = (e) => {
        e.stopPropagation();
        day.exerciseIds = day.exerciseIds.filter(id => id !== ex.id);
        renderDaysInEditor();
      };

      selectedSummaryChips.appendChild(row);
    });

    // 4. Render Grouped Muscle Categories Accordions
    const muscleGroupsContainer = dayCard.querySelector('.muscle-groups-container');

    muscleCategories.forEach(cat => {
      const categoryExercises = DEFAULT_EXERCISES_CATALOG.filter(ex => ex.category.toLowerCase() === cat.toLowerCase());
      const selectedInCat = categoryExercises.filter(ex => day.exerciseIds.includes(ex.id));

      const groupWrapper = document.createElement('div');
      groupWrapper.style.marginBottom = '6px';

      const icon = categoryIcons[cat] || '💪';
      groupWrapper.innerHTML = `
        <div class="category-group-header">
          <div>
            <span>${icon} ${cat}</span>
            <span class="badge badge-${cat.toLowerCase()}" style="margin-left: 6px;">${selectedInCat.length} / ${categoryExercises.length}</span>
          </div>
          <span class="accordion-arrow" style="font-size: 10px; color: var(--text-muted);">▼</span>
        </div>
        <div class="category-group-body collapsed"></div>
      `;

      const groupHeader = groupWrapper.querySelector('.category-group-header');
      const groupBody = groupWrapper.querySelector('.category-group-body');
      const arrow = groupWrapper.querySelector('.accordion-arrow');

      // Expand accordion automatically if this muscle has selected exercises
      if (selectedInCat.length > 0) {
        groupBody.classList.remove('collapsed');
        arrow.textContent = '▲';
      }

      groupHeader.onclick = () => {
        const isCollapsed = groupBody.classList.toggle('collapsed');
        arrow.textContent = isCollapsed ? '▼' : '▲';
      };

      // Populate exercises for this category
      categoryExercises.forEach(ex => {
        const isSelected = day.exerciseIds.includes(ex.id);
        const chip = document.createElement('div');
        chip.className = `exercise-select-chip ${isSelected ? 'selected' : ''}`;
        chip.innerHTML = `${isSelected ? '✓ ' : ''}${ex.name}`;

        chip.onclick = (e) => {
          e.stopPropagation();
          if (day.exerciseIds.includes(ex.id)) {
            day.exerciseIds = day.exerciseIds.filter(id => id !== ex.id);
          } else {
            day.exerciseIds.push(ex.id);
          }
          renderDaysInEditor();
        };

        groupBody.appendChild(chip);
      });

      muscleGroupsContainer.appendChild(groupWrapper);
    });

    daysEditorContainer.appendChild(dayCard);
  });
}

btnAddDayBtn.onclick = () => {
  editingRoutine.days.push({
    dayName: `Día ${editingRoutine.days.length + 1}: General`,
    exerciseIds: []
  });
  renderDaysInEditor();
};

btnSaveRoutine.onclick = () => {
  editingRoutine.name = routineNameInput.value.trim() || 'Mi Rutina';
  const existingIdx = appState.routines.findIndex(r => r.id === editingRoutine.id);

  if (existingIdx >= 0) {
    appState.routines[existingIdx] = editingRoutine;
  } else {
    appState.routines.push(editingRoutine);
  }

  saveRoutines();
  renderRoutinesList();
  setupRoutineDropdowns();
  routineEditorCard.classList.add('hidden');
  alert('¡Rutina guardada con éxito!');
};
