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

// Central App Configuration Constants
const CONFIG = {
  DEFAULT_REST_SECONDS: 60,
  CHART_REFLOW_DELAY_MS: 60,
  MAX_PR_CARDS: 4
};

const STORAGE_KEYS = {
  PROFILES: 'gym_profiles',
  ACTIVE_PROFILE_ID: 'gym_active_profile_id',
  JWT_TOKEN: 'gym_jwt_token',
  USER_ACCOUNT: 'gym_user_account',
  routines: pId => `gym_routines_${pId}`,
  activeRoutineId: pId => `gym_active_routine_id_${pId}`,
  weightsHistory: pId => `gym_weights_history_${pId}`,
  workoutHistory: pId => `gym_workout_history_${pId}`,
  activeSession: pId => `gym_active_session_${pId}`
};

const DEFAULT_PROFILES = [
  { id: 'prof_guest', name: 'Invitado / Anónimo', avatar: '👤', isGuest: true }
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
  const savedProfiles = localStorage.getItem(STORAGE_KEYS.PROFILES);
  if (savedProfiles) {
    try {
      appState.profiles = JSON.parse(savedProfiles);
    } catch (e) {
      appState.profiles = DEFAULT_PROFILES;
    }
  } else {
    appState.profiles = DEFAULT_PROFILES;
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(appState.profiles));
  }

  // 2. Check for logged in user account session persistence
  const savedUserJson = localStorage.getItem(STORAGE_KEYS.USER_ACCOUNT);
  const jwtToken = localStorage.getItem(STORAGE_KEYS.JWT_TOKEN);

  if (savedUserJson && jwtToken) {
    try {
      const user = JSON.parse(savedUserJson);
      const userProfile = {
        id: user.id,
        name: user.name || 'Usuario',
        avatar: user.avatar || '👤'
      };

      if (!appState.profiles.some(p => p.id === userProfile.id)) {
        appState.profiles.push(userProfile);
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(appState.profiles));
      }
      appState.activeProfileId = userProfile.id;
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, userProfile.id);
    } catch (e) {
      console.error('Error cargando datos de cuenta guardada:', e);
    }
  } else {
    const savedActiveProfileId = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROFILE_ID);
    if (savedActiveProfileId && appState.profiles.some(p => p.id === savedActiveProfileId)) {
      appState.activeProfileId = savedActiveProfileId;
    } else {
      appState.activeProfileId = appState.profiles[0].id;
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, appState.activeProfileId);
    }
  }

  loadActiveProfileData();
}

function loadActiveProfileData() {
  const pId = appState.activeProfileId;

  // 1. Fast load from LocalStorage for instant UI response
  const savedRoutines = localStorage.getItem(STORAGE_KEYS.routines(pId));
  if (savedRoutines) {
    try {
      const parsed = JSON.parse(savedRoutines);
      appState.routines = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      appState.routines = [];
    }
  } else {
    appState.routines = [];
  }

  const savedActiveRoutineId = localStorage.getItem(STORAGE_KEYS.activeRoutineId(pId));
  appState.activeRoutineId = savedActiveRoutineId || (appState.routines.length > 0 ? appState.routines[0].id : null);

  const savedWeights = localStorage.getItem(STORAGE_KEYS.weightsHistory(pId));
  appState.weightsHistory = savedWeights ? JSON.parse(savedWeights) : {};

  const savedHistory = localStorage.getItem(STORAGE_KEYS.workoutHistory(pId));
  appState.workoutHistory = savedHistory ? JSON.parse(savedHistory) : [];

  const savedSession = localStorage.getItem(STORAGE_KEYS.activeSession(pId));
  appState.activeSession = savedSession ? JSON.parse(savedSession) : null;

  // 2. Fetch latest data from Cloud API if registered account (Guest profiles bypass cloud sync)
  if (pId !== 'prof_guest' && !pId.startsWith('prof_guest')) {
    fetchCloudState(pId);
  }
}

async function fetchCloudState(pId) {
  if (!pId || pId === 'prof_guest' || pId.startsWith('prof_guest')) return;

  try {
    const res = await fetch(`/api/state/${pId}`);
    if (res.ok) {
      const data = await res.json();
      let updated = false;

      if (data.routines !== undefined && data.routines !== null) {
        appState.routines = data.routines;
        localStorage.setItem(STORAGE_KEYS.routines(pId), JSON.stringify(appState.routines));
        updated = true;
      }
      if (data.weightsHistory) {
        appState.weightsHistory = data.weightsHistory;
        localStorage.setItem(STORAGE_KEYS.weightsHistory(pId), JSON.stringify(appState.weightsHistory));
        updated = true;
      }
      if (data.workoutHistory) {
        appState.workoutHistory = data.workoutHistory;
        localStorage.setItem(STORAGE_KEYS.workoutHistory(pId), JSON.stringify(appState.workoutHistory));
        updated = true;
      }
      if (data.activeSession !== undefined) {
        appState.activeSession = data.activeSession;
        if (data.activeSession) {
          localStorage.setItem(STORAGE_KEYS.activeSession(pId), JSON.stringify(appState.activeSession));
        } else {
          localStorage.removeItem(STORAGE_KEYS.activeSession(pId));
        }
        updated = true;
      }

      if (updated) {
        refreshCurrentProfileUI();
      }
    }
  } catch (e) {
    console.warn('⚠️ Cloud fetch error:', e);
  }
}

async function syncToCloudDatabase() {
  const pId = appState.activeProfileId;
  // Guest / Anonymous profile data lives EXCLUSIVELY on device (localStorage)
  if (!pId || pId === 'prof_guest' || pId.startsWith('prof_guest')) {
    return;
  }

  try {
    const payload = {
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
  localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(appState.profiles));
  syncToCloudDatabase();
}

function saveRoutines() {
  const pId = appState.activeProfileId;
  localStorage.setItem(STORAGE_KEYS.routines(pId), JSON.stringify(appState.routines));
  syncToCloudDatabase();
}

function saveActiveSession() {
  const pId = appState.activeProfileId;
  if (appState.activeSession) {
    localStorage.setItem(STORAGE_KEYS.activeSession(pId), JSON.stringify(appState.activeSession));
  } else {
    localStorage.removeItem(STORAGE_KEYS.activeSession(pId));
  }
  syncToCloudDatabase();
}

function saveWeightsHistory() {
  const pId = appState.activeProfileId;
  localStorage.setItem(STORAGE_KEYS.weightsHistory(pId), JSON.stringify(appState.weightsHistory));
  syncToCloudDatabase();
}

function saveWorkoutHistory() {
  const pId = appState.activeProfileId;
  localStorage.setItem(STORAGE_KEYS.workoutHistory(pId), JSON.stringify(appState.workoutHistory));
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

// Rest Timer Banner elements
const restTimerBanner = document.getElementById('restTimerBanner');
const restTimerSeconds = document.getElementById('restTimerSeconds');
const btnRestMinus15 = document.getElementById('btnRestMinus15');
const btnRestPlus15 = document.getElementById('btnRestPlus15');
const btnRestSkip = document.getElementById('btnRestSkip');

async function fetchCatalogFromAPI() {
  try {
    const res = await fetch('/api/exercises');
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        DEFAULT_EXERCISES_CATALOG.length = 0;
        data.forEach(ex => DEFAULT_EXERCISES_CATALOG.push(ex));
        localStorage.setItem('gym_catalog_cache', JSON.stringify(DEFAULT_EXERCISES_CATALOG));
        renderCatalog();
        setupCatalogFilter();
      }
    }
  } catch (e) {
    const cached = localStorage.getItem('gym_catalog_cache');
    if (cached) {
      try {
        const data = JSON.parse(cached);
        DEFAULT_EXERCISES_CATALOG.length = 0;
        data.forEach(ex => DEFAULT_EXERCISES_CATALOG.push(ex));
      } catch (err) {}
    }
  }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  loadStorageData();
  fetchCatalogFromAPI();
  setupProfileUI();
  setupAddExerciseModal();
  setupNavigation();
  refreshCurrentProfileUI();

  // Register Service Worker for PWA Offline mode with Instant Auto-Update Detection
  if ('serviceWorker' in navigator) {
    let refreshing = false;

    // Reload page automatically when new service worker takes control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    navigator.serviceWorker.register('sw.js').then(reg => {
      // Force update check on app open / regain focus
      reg.update();

      const showUpdateToast = (worker) => {
        const toast = document.getElementById('pwaUpdateToast');
        const btnReload = document.getElementById('btnReloadPWA');
        if (toast && btnReload) {
          toast.classList.remove('hidden');
          btnReload.onclick = () => {
            worker.postMessage({ type: 'SKIP_WAITING', action: 'skipWaiting' });
          };
        }
      };

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateToast(newWorker);
            }
          });
        }
      });

      if (reg.waiting && navigator.serviceWorker.controller) {
        showUpdateToast(reg.waiting);
      }
    }).catch(err => console.log('SW registration failed:', err));
  }

  // Auto-sync offline changes to Supabase when network is restored
  window.addEventListener('online', () => {
    console.log('📶 Red restablecida. Sincronizando datos con Supabase...');
    syncToCloudDatabase();
  });
});

function setupAddExerciseModal() {
  const btnOpen = document.getElementById('btnOpenAddExerciseModal');
  const btnClose = document.getElementById('btnCloseAddExerciseModal');
  const modal = document.getElementById('addExerciseModal');
  const btnSubmit = document.getElementById('btnSubmitNewExercise');

  if (!btnOpen || !modal) return;

  btnOpen.onclick = () => modal.classList.remove('hidden');
  if (btnClose) btnClose.onclick = () => modal.classList.add('hidden');

  if (btnSubmit) {
    btnSubmit.onclick = async () => {
      const name = document.getElementById('newExName').value.trim();
      const category = document.getElementById('newExCategory').value;
      const equipment = document.getElementById('newExEquipment').value.trim() || 'General';
      const defaultSets = parseInt(document.getElementById('newExSets').value, 10) || 1;
      const defaultReps = parseInt(document.getElementById('newExReps').value, 10) || 12;

      if (!name) {
        alert('Por favor ingresa el nombre del ejercicio.');
        return;
      }

      const payload = {
        name, category, equipment, defaultSets, defaultReps, unit: 'reps'
      };

      try {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Guardando...';
        const res = await fetch('/api/exercises', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        btnSubmit.disabled = false;
        btnSubmit.textContent = '✨ Guardar Ejercicio en Base de Datos';

        if (res.ok) {
          const newEx = await res.json();
          DEFAULT_EXERCISES_CATALOG.push(newEx);
          localStorage.setItem('gym_catalog_cache', JSON.stringify(DEFAULT_EXERCISES_CATALOG));
          renderCatalog();
          modal.classList.add('hidden');
          document.getElementById('newExName').value = '';
          alert(`¡Ejercicio "${newEx.name}" añadido exitosamente a la base de datos!`);
        } else {
          alert('Error al guardar el ejercicio en la base de datos.');
        }
      } catch (err) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = '✨ Guardar Ejercicio en Base de Datos';
        alert('Error de conexión con el servidor.');
      }
    };
  }
}

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
// --- Multi-Profile UI Setup & Handlers ---
function setupProfileUI() {
  setupProfileModalEvents();
  setupBackupExportImportHandlers();
  setupProfileHeroEditing();
  setupLogoutHandler();
  setupAuthHandlers();
}

function setupProfileModalEvents() {
  if (btnProfileSelect) {
    btnProfileSelect.addEventListener('click', () => {
      renderProfilesModal();
      profileModal.classList.remove('hidden');
    });
  }

  if (btnCloseProfileModal) {
    btnCloseProfileModal.addEventListener('click', () => {
      profileModal.classList.add('hidden');
    });
  }
}

function setupBackupExportImportHandlers() {
  const btnExportBackup = document.getElementById('btnExportBackup');
  const btnImportBackup = document.getElementById('btnImportBackup');
  const importFileInput = document.getElementById('importFileInput');

  if (btnExportBackup) {
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
          routines: JSON.parse(localStorage.getItem(STORAGE_KEYS.routines(pId)) || '[]'),
          weightsHistory: JSON.parse(localStorage.getItem(STORAGE_KEYS.weightsHistory(pId)) || '{}'),
          workoutHistory: JSON.parse(localStorage.getItem(STORAGE_KEYS.workoutHistory(pId)) || '[]'),
          activeSession: JSON.parse(localStorage.getItem(STORAGE_KEYS.activeSession(pId)) || 'null')
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
  }

  if (btnImportBackup && importFileInput) {
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
            if (pData.routines) localStorage.setItem(STORAGE_KEYS.routines(pId), JSON.stringify(pData.routines));
            if (pData.weightsHistory) localStorage.setItem(STORAGE_KEYS.weightsHistory(pId), JSON.stringify(pData.weightsHistory));
            if (pData.workoutHistory) localStorage.setItem(STORAGE_KEYS.workoutHistory(pId), JSON.stringify(pData.workoutHistory));
            if (pData.activeSession) localStorage.setItem(STORAGE_KEYS.activeSession(pId), JSON.stringify(pData.activeSession));
          });

          if (data.activeProfileId) {
            appState.activeProfileId = data.activeProfileId;
            localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, data.activeProfileId);
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
}

async function syncUserProfileToCloud(name, avatar) {
  const pId = appState.activeProfileId;

  // Update local user account storage
  const savedUserJson = localStorage.getItem(STORAGE_KEYS.USER_ACCOUNT);
  if (savedUserJson) {
    try {
      const u = JSON.parse(savedUserJson);
      if (name) u.name = name;
      if (avatar) u.avatar = avatar;
      localStorage.setItem(STORAGE_KEYS.USER_ACCOUNT, JSON.stringify(u));
    } catch (e) {}
  }

  // Sync to backend Supabase PostgreSQL / SQLite fallback
  if (pId && pId !== 'prof_guest' && !pId.startsWith('prof_guest')) {
    try {
      await fetch(`/api/user/profile/${pId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar })
      });
    } catch (err) {
      console.log('Error syncing profile to cloud:', err);
    }
  }
}

function setupProfileHeroEditing() {
  const profileHeroAvatar = document.getElementById('profileHeroAvatar');
  const avatarPickerGrid = document.getElementById('avatarPickerGrid');
  const editProfileNameInput = document.getElementById('editProfileNameInput');
  const btnSaveProfileName = document.getElementById('btnSaveProfileName');

  if (profileHeroAvatar && avatarPickerGrid) {
    profileHeroAvatar.onclick = () => {
      avatarPickerGrid.classList.toggle('hidden');
    };

    avatarPickerGrid.querySelectorAll('.emoji-picker-item').forEach(item => {
      item.onclick = () => {
        const emoji = item.getAttribute('data-emoji');
        const activeProfile = appState.profiles.find(p => p.id === appState.activeProfileId);
        if (activeProfile) {
          activeProfile.avatar = emoji;
          saveProfiles();
          syncUserProfileToCloud(null, emoji);
          updateHeaderProfilePill();
          if (profileHeroAvatar) profileHeroAvatar.textContent = emoji;
        }
        avatarPickerGrid.classList.add('hidden');
      };
    });
  }

  if (btnSaveProfileName && editProfileNameInput) {
    btnSaveProfileName.onclick = () => {
      const newName = editProfileNameInput.value.trim();
      if (!newName) return;
      const activeProfile = appState.profiles.find(p => p.id === appState.activeProfileId);
      if (activeProfile) {
        activeProfile.name = newName;
        saveProfiles();
        syncUserProfileToCloud(newName, null);
        updateHeaderProfilePill();
        alert('¡Nombre de perfil actualizado!');
      }
    };
  }
}

function setupLogoutHandler() {
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.onclick = () => {
      if (confirm('¿Cerrar sesión en esta cuenta?')) {
        localStorage.removeItem(STORAGE_KEYS.JWT_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_ACCOUNT);
        appState.activeProfileId = 'prof_guest';
        localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, 'prof_guest');
        loadActiveProfileData();
        refreshCurrentProfileUI();
        renderProfilesModal();
        alert('Sesión cerrada. Ahora estás en Modo Invitado.');
      }
    };
  }
}

function setupAuthHandlers() {
  const tabAuthLogin = document.getElementById('tabAuthLogin');
  const tabAuthRegister = document.getElementById('tabAuthRegister');
  const tabAuthGuest = document.getElementById('tabAuthGuest');

  const authFormSection = document.getElementById('authFormSection');
  const guestModeSection = document.getElementById('guestModeSection');
  const authRegisterAvatarGroup = document.getElementById('authRegisterAvatarGroup');

  const authName = document.getElementById('authName');
  const authEmail = document.getElementById('authEmail');
  const authPassword = document.getElementById('authPassword');
  const btnSubmitAuth = document.getElementById('btnSubmitAuth');
  const btnContinueAsGuest = document.getElementById('btnContinueAsGuest');
  const authStatusMessage = document.getElementById('authStatusMessage');

  let currentAuthMode = 'login';
  let selectedRegisterEmoji = '👤';

  if (tabAuthLogin && tabAuthRegister && tabAuthGuest) {
    tabAuthLogin.onclick = () => {
      currentAuthMode = 'login';
      tabAuthLogin.classList.add('active');
      tabAuthRegister.classList.remove('active');
      tabAuthGuest.classList.remove('active');

      authFormSection.classList.remove('hidden');
      guestModeSection.classList.add('hidden');

      authName.classList.add('hidden');
      authRegisterAvatarGroup.classList.add('hidden');
      btnSubmitAuth.textContent = '🔑 Iniciar Sesión con JWT';
      if (authStatusMessage) authStatusMessage.textContent = '';
    };

    tabAuthRegister.onclick = () => {
      currentAuthMode = 'register';
      tabAuthRegister.classList.add('active');
      tabAuthLogin.classList.remove('active');
      tabAuthGuest.classList.remove('active');

      authFormSection.classList.remove('hidden');
      guestModeSection.classList.add('hidden');

      authName.classList.remove('hidden');
      authRegisterAvatarGroup.classList.remove('hidden');
      btnSubmitAuth.textContent = '✨ Registrar Cuenta en Supabase';
      if (authStatusMessage) authStatusMessage.textContent = '';
    };

    tabAuthGuest.onclick = () => {
      currentAuthMode = 'guest';
      tabAuthGuest.classList.add('active');
      tabAuthLogin.classList.remove('active');
      tabAuthRegister.classList.remove('active');

      authFormSection.classList.add('hidden');
      guestModeSection.classList.remove('hidden');
      if (authStatusMessage) authStatusMessage.textContent = '';
    };
  }

  const authRegisterEmojiPicker = document.getElementById('authRegisterEmojiPicker');
  if (authRegisterEmojiPicker) {
    authRegisterEmojiPicker.querySelectorAll('.emoji-picker-item').forEach(item => {
      item.onclick = () => {
        authRegisterEmojiPicker.querySelectorAll('.emoji-picker-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        selectedRegisterEmoji = item.getAttribute('data-emoji');
      };
    });
  }

  if (btnContinueAsGuest) {
    btnContinueAsGuest.onclick = () => {
      appState.activeProfileId = 'prof_guest';
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, 'prof_guest');
      loadActiveProfileData();
      refreshCurrentProfileUI();
      profileModal.classList.add('hidden');
    };
  }

  if (btnSubmitAuth) {
    btnSubmitAuth.onclick = async () => {
      const email = authEmail.value.trim();
      const password = authPassword.value.trim();
      const name = authName.value.trim();
      const isRegister = (currentAuthMode === 'register');

      if (!email || !password) {
        alert('Por favor ingresa tu correo y contraseña.');
        return;
      }

      if (isRegister && !name) {
        alert('Por favor ingresa tu nombre completo.');
        return;
      }

      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const bodyPayload = isRegister
        ? { email, password, name, avatar: selectedRegisterEmoji }
        : { email, password };

      try {
        btnSubmitAuth.disabled = true;
        btnSubmitAuth.textContent = 'Procesando...';

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        });

        const data = await res.json();
        btnSubmitAuth.disabled = false;
        btnSubmitAuth.textContent = isRegister ? '✨ Registrar Cuenta en Supabase' : '🔑 Iniciar Sesión con JWT';

        if (!res.ok) {
          alert(data.detail || 'Error en la autenticación.');
          return;
        }

        if (data.token) {
          localStorage.setItem(STORAGE_KEYS.JWT_TOKEN, data.token);
          if (data.user) {
            localStorage.setItem(STORAGE_KEYS.USER_ACCOUNT, JSON.stringify(data.user));
            const userProfile = {
              id: data.user.id,
              name: data.user.name,
              avatar: data.user.avatar || selectedRegisterEmoji
            };

            if (!appState.profiles.some(p => p.id === userProfile.id)) {
              appState.profiles.push(userProfile);
            }
            saveProfiles();
            switchProfile(userProfile.id);
          }

          authStatusMessage.style.color = '#00e676';
          authStatusMessage.textContent = isRegister ? '¡Cuenta creada en Supabase! Sincronizando...' : '¡Sesión JWT iniciada! Sincronizando...';
          setTimeout(() => {
            profileModal.classList.add('hidden');
            authStatusMessage.textContent = '';
            renderProfilesModal();
          }, 1000);
        }
      } catch (err) {
        btnSubmitAuth.disabled = false;
        btnSubmitAuth.textContent = isRegister ? '✨ Registrar Cuenta en Supabase' : '🔑 Iniciar Sesión con JWT';
        alert('Error conectando con el servidor de autenticación.');
      }
    };
  }
}

function updateHeaderProfilePill() {
  const activeProfile = appState.profiles.find(p => p.id === appState.activeProfileId) || appState.profiles[0];
  activeProfileAvatar.textContent = activeProfile.avatar;
  activeProfileName.textContent = activeProfile.name;
}

function renderProfilesModal() {
  const loggedInDashboard = document.getElementById('loggedInDashboard');
  const authGatewayContainer = document.getElementById('authGatewayContainer');

  const savedUserJson = localStorage.getItem('gym_user_account');
  const jwtToken = localStorage.getItem('gym_jwt_token');

  if (savedUserJson && jwtToken) {
    // STATE 1: LOGGED IN USER
    if (loggedInDashboard) loggedInDashboard.classList.remove('hidden');
    if (authGatewayContainer) authGatewayContainer.classList.add('hidden');

    const user = JSON.parse(savedUserJson);
    const activeProfile = appState.profiles.find(p => p.id === appState.activeProfileId) || { avatar: '👤', name: user.name };

    const profileHeroAvatar = document.getElementById('profileHeroAvatar');
    const editProfileNameInput = document.getElementById('editProfileNameInput');
    const userEmailDisplay = document.getElementById('userEmailDisplay');
    const profileWorkoutCount = document.getElementById('profileWorkoutCount');

    if (profileHeroAvatar) profileHeroAvatar.textContent = activeProfile.avatar || '👤';
    if (editProfileNameInput) editProfileNameInput.value = activeProfile.name || user.name;
    if (userEmailDisplay) userEmailDisplay.textContent = user.email || '';
    if (profileWorkoutCount) profileWorkoutCount.textContent = appState.workoutHistory ? appState.workoutHistory.length : 0;
  } else {
    // STATE 2: AUTH GATEWAY (LOGIN / REGISTER / GUEST)
    if (loggedInDashboard) loggedInDashboard.classList.add('hidden');
    if (authGatewayContainer) authGatewayContainer.classList.remove('hidden');
  }
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

      if (targetTab === 'tab-analytics' && typeof initAnalytics === 'function') {
        setTimeout(() => {
          initAnalytics();
        }, 60);
      }
    });
  });
}

// --- Routine Selectors Setup ---
function setupRoutineDropdowns() {
  routineSelect.innerHTML = '';
  if (!appState.routines || appState.routines.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '(Sin rutinas creadas)';
    routineSelect.appendChild(option);
    appState.activeRoutineId = null;
  } else {
    appState.routines.forEach(routine => {
      const option = document.createElement('option');
      option.value = routine.id;
      option.textContent = routine.name;
      if (routine.id === appState.activeRoutineId) option.selected = true;
      routineSelect.appendChild(option);
    });

    if (!appState.activeRoutineId && appState.routines.length > 0) {
      appState.activeRoutineId = appState.routines[0].id;
    }
  }

  updateDayDropdown();

  routineSelect.addEventListener('change', (e) => {
    appState.activeRoutineId = e.target.value;
    const pId = appState.activeProfileId;
    if (pId) localStorage.setItem(STORAGE_KEYS.activeRoutineId(pId), appState.activeRoutineId);
    updateDayDropdown();
  });

  daySelect.addEventListener('change', (e) => {
    appState.activeDayIndex = parseInt(e.target.value, 10) || 0;
    renderTodayExercisesPreview();
  });

  btnStartWorkout.addEventListener('click', startNewWorkoutSession);
}

function updateDayDropdown() {
  const activeRoutine = appState.routines ? appState.routines.find(r => r.id === appState.activeRoutineId) : null;
  daySelect.innerHTML = '';

  if (activeRoutine && activeRoutine.days && activeRoutine.days.length > 0) {
    activeRoutine.days.forEach((day, idx) => {
      const option = document.createElement('option');
      option.value = idx;
      option.textContent = day.dayName;
      daySelect.appendChild(option);
    });
  } else {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '(Sin días asignados)';
    daySelect.appendChild(option);
  }

  appState.activeDayIndex = 0;
  renderTodayExercisesPreview();
}

function renderTodayExercisesPreview() {
  const activeRoutine = appState.routines ? appState.routines.find(r => r.id === appState.activeRoutineId) : null;
  if (!activeRoutine || !activeRoutine.days || !activeRoutine.days[appState.activeDayIndex]) {
    todayExercisesList.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 16px;">Aún no tienes rutinas creadas.<br><br><button class="btn btn-outline btn-sm" onclick="document.querySelector(\'[data-tab=tab-routines]\').click();" style="margin-top: 6px;">➕ Crear mi primera rutina</button></div>';
    todayExerciseCount.textContent = '0 ejercicios';
    return;
  }

  const currentDay = activeRoutine.days[appState.activeDayIndex];
  const exercises = (currentDay.exerciseIds || [])
    .map(id => DEFAULT_EXERCISES_CATALOG.find(ex => ex.id === id))
    .filter(Boolean);

  todayExerciseCount.textContent = `${exercises.length} ejercicios`;
  todayExercisesList.innerHTML = '';

  if (exercises.length === 0) {
    todayExercisesList.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 12px;">Sin ejercicios asignados a este día</div>';
    return;
  }

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
  const activeRoutine = appState.routines ? appState.routines.find(r => r.id === appState.activeRoutineId) : null;
  const currentDay = (activeRoutine && activeRoutine.days) ? activeRoutine.days[appState.activeDayIndex] : null;

  if (!currentDay || !currentDay.exerciseIds || currentDay.exerciseIds.length === 0) {
    alert('No tienes ejercicios programados para este día. Por favor crea una rutina en la pestaña Rutinas.');
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
  if (!appState.activeSession || !appState.activeSession.exercises || appState.activeSession.exercises.length === 0) {
    appState.activeSession = null;
    saveActiveSession();
    workoutActiveScreen.classList.add('hidden');
    workoutStartScreen.classList.remove('hidden');
    headerStatus.style.borderColor = 'rgba(0, 242, 254, 0.2)';
    statusText.textContent = 'Listo';
    return;
  }

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

  const btnFinishBottom = document.getElementById('btnFinishWorkoutBottom');
  const btnDiscard = document.getElementById('btnDiscardWorkout');

  if (btnFinishBottom) btnFinishBottom.onclick = confirmEndWorkout;
  if (btnDiscard) btnDiscard.onclick = confirmDiscardWorkout;
}

function startSessionTimer() {
  clearInterval(appState.sessionTimerInterval);
  appState.sessionTimerInterval = setInterval(() => {
    if (!appState.activeSession || appState.activeSession.isPaused) return;
    updateSessionTimerDisplay();
    saveActiveSession();
  }, 1000);
  updateSessionTimerDisplay();
}

function updateSessionTimerDisplay() {
  if (!appState.activeSession || !appState.activeSession.startTimeIso) return;
  const startMs = new Date(appState.activeSession.startTimeIso).getTime();
  const secs = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  appState.activeSession.elapsedSeconds = secs;

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

// Background-proof visibility listeners for mobile screen lock catch-up
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (appState.activeSession) updateSessionTimerDisplay();
    if (appState.restTimer && appState.restTimer.endTimeMs) updateRestTimerUI();
  }
});
window.addEventListener('pageshow', () => {
  if (appState.activeSession) updateSessionTimerDisplay();
  if (appState.restTimer && appState.restTimer.endTimeMs) updateRestTimerUI();
});

function renderLiveExercisesCards() {
  liveExercisesContainer.innerHTML = '';

  if (!appState.activeSession || !appState.activeSession.exercises) return;

  appState.activeSession.exercises.forEach(ex => {
    const sets = appState.activeSession.setsData[ex.id] || [];
    const allDone = sets.length > 0 && sets.every(s => s.completed);
    const lastHistory = appState.weightsHistory[ex.id];
    const unit = ex.weightUnit || 'kg';
    const lastWeightStr = lastHistory ? `(Último: ${lastHistory.weight} ${lastHistory.unit || 'kg'})` : '';

    const card = document.createElement('div');
    card.className = `exercise-live-card ${allDone ? 'completed' : ''}`;
    card.innerHTML = createLiveExerciseHeaderHTML(ex, lastWeightStr, unit);

    // Swap Exercise handler (🔄 Cambiar)
    const btnSwap = card.querySelector('.btn-swap-ex');
    if (btnSwap) {
      btnSwap.onclick = (e) => {
        e.stopPropagation();
        openSwapExerciseModal(ex.id);
      };
    }

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

    // Completed Exercise Accordion Summary Badge
    if (allDone) {
      const summaryBadge = document.createElement('div');
      summaryBadge.className = 'completed-exercise-summary-badge';
      summaryBadge.style.cssText = 'background: rgba(0, 230, 118, 0.08); border: 1px solid var(--accent-green); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 12px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; color: #fff; margin-bottom: 8px;';
      summaryBadge.innerHTML = `
        <span>✅ <strong>${ex.name}</strong> • ${sets.length}/${sets.length} series completadas</span>
        <span class="toggle-summary-icon" style="color: var(--accent-green); font-weight: 700; font-size: 11px;">Ver Series ▾</span>
      `;

      setsContainer.style.display = 'none';

      summaryBadge.onclick = () => {
        const isHidden = setsContainer.style.display === 'none';
        setsContainer.style.display = isHidden ? 'block' : 'none';
        summaryBadge.querySelector('.toggle-summary-icon').textContent = isHidden ? 'Ocultar ▲' : 'Ver Series ▾';
      };

      card.insertBefore(summaryBadge, setsContainer);
    }

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

      const isTimeBased = ['segundos', 'minutos', 'seg', 'min', 'tiempo'].includes((ex.unit || '').toLowerCase());

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
            <input type="number" step="${unit === 'lb' ? '5' : '0.5'}" inputmode="decimal" pattern="[0-9.]*" class="set-input weight-input" value="${set.weight}" ${set.completed ? 'disabled' : ''}>
            <button class="btn-step btn-weight-plus" ${set.completed ? 'disabled' : ''}>+</button>
          </div>
        </div>

        <!-- Reps / Time Input + Stepper + Timer Button -->
        <div class="set-input-group">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
            <label class="set-input-label">Reps (${ex.unit || 'reps'})</label>
            ${isTimeBased ? `<button class="btn-ex-timer-start" style="font-size: 10px; background: rgba(0, 242, 254, 0.15); border: 1px solid var(--accent-cyan); color: var(--accent-cyan); border-radius: 4px; padding: 0 4px; cursor: pointer;">⏱️ Timer</button>` : ''}
          </div>
          <div class="stepper-group">
            <button class="btn-step btn-reps-minus" ${set.completed ? 'disabled' : ''}>-</button>
            <input type="number" inputmode="numeric" pattern="[0-9]*" class="set-input reps-input" value="${set.actualReps}" ${set.completed ? 'disabled' : ''}>
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
      const btnExTimerStart = row.querySelector('.btn-ex-timer-start');

      if (btnExTimerStart) {
        btnExTimerStart.onclick = () => openExerciseTimerModal(ex.name, set.actualReps || 45);
      }

      // Input Overwrite on Focus & Click (Fixes 025 issue)
      weightInput.addEventListener('focus', (e) => e.target.select());
      weightInput.addEventListener('click', (e) => e.target.select());
      repsInput.addEventListener('focus', (e) => e.target.select());
      repsInput.addEventListener('click', (e) => e.target.select());

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

  updateWorkoutCompletionBanner();
}

function updateWorkoutCompletionBanner() {
  const bannerTitle = document.getElementById('workoutCompletionTitle');
  const bannerSubtitle = document.getElementById('workoutCompletionSubtitle');
  if (!bannerTitle || !bannerSubtitle || !appState.activeSession) return;

  const totalExercises = appState.activeSession.exercises ? appState.activeSession.exercises.length : 0;
  let completedExercises = 0;
  let totalSets = 0;
  let completedSets = 0;

  (appState.activeSession.exercises || []).forEach(ex => {
    const sets = appState.activeSession.setsData[ex.id] || [];
    totalSets += sets.length;
    const doneCount = sets.filter(s => s.completed).length;
    completedSets += doneCount;
    if (sets.length > 0 && doneCount === sets.length) {
      completedExercises += 1;
    }
  });

  // Real-time counter header update
  const headerDay = document.getElementById('activeRoutineDayName');
  if (headerDay) {
    headerDay.textContent = `${appState.activeSession.dayName} • (${completedExercises}/${totalExercises} Ejercicios)`;
  }

  if (totalExercises > 0 && completedExercises === totalExercises) {
    bannerTitle.textContent = '🎉 ¡Todas las series y ejercicios completados!';
    bannerSubtitle.textContent = `Has finalizado los ${completedExercises} ejercicios (${completedSets} series). Presiona "Finalizar y Guardar" para guardar tu sesión.`;
  } else {
    bannerTitle.textContent = `Progreso: ${completedExercises} de ${totalExercises} ejercicios completados (${completedSets}/${totalSets} series)`;
    bannerSubtitle.textContent = 'Presiona "Finalizar y Guardar" al terminar para registrar la sesión en tu historial.';
  }
}

// --- Swap Exercise Modal Handler ---
function openSwapExerciseModal(targetExId) {
  const modal = document.getElementById('swapExerciseModal');
  const searchInput = document.getElementById('swapSearchInput');
  const container = document.getElementById('swapExerciseListContainer');

  modal.classList.remove('hidden');
  searchInput.value = '';

  const renderList = (filterText = '') => {
    container.innerHTML = '';
    const filtered = DEFAULT_EXERCISES_CATALOG.filter(ex =>
      ex.name.toLowerCase().includes(filterText.toLowerCase()) ||
      ex.category.toLowerCase().includes(filterText.toLowerCase())
    );

    filtered.forEach(newEx => {
      const item = document.createElement('div');
      item.className = 'card';
      item.style.cssText = 'padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border-color: rgba(255,255,255,0.08);';
      item.innerHTML = `
        <div>
          <strong style="color: #fff; font-size: 14px;">${newEx.name}</strong>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
            ${newEx.category} • ${newEx.equipment || 'General'}
          </div>
        </div>
        <button class="btn btn-primary btn-sm" style="font-size: 11px;">Sustituir ➔</button>
      `;

      item.onclick = () => {
        const exIdx = appState.activeSession.exercises.findIndex(e => e.id === targetExId);
        if (exIdx !== -1) {
          const oldExId = targetExId;
          appState.activeSession.exercises[exIdx] = { ...newEx, weightUnit: 'kg' };

          if (!appState.activeSession.setsData[newEx.id]) {
            const lastHistory = appState.weightsHistory[newEx.id];
            const initW = lastHistory ? lastHistory.weight : 0;
            const newSets = [];
            for (let i = 1; i <= newEx.defaultSets; i++) {
              newSets.push({ setNum: i, targetReps: newEx.defaultReps, actualReps: newEx.defaultReps, weight: initW, completed: false });
            }
            appState.activeSession.setsData[newEx.id] = newSets;
          }
          if (oldExId !== newEx.id) {
            delete appState.activeSession.setsData[oldExId];
          }

          saveActiveSession();
          renderLiveExercisesCards();
        }
        modal.classList.add('hidden');
      };

      container.appendChild(item);
    });
  };

  renderList();
  searchInput.oninput = (e) => renderList(e.target.value);
  document.getElementById('btnCloseSwapModal').onclick = () => modal.classList.add('hidden');
}

// --- Time-Based Exercise Timer Modal Handler ---
let currentExTimerInterval = null;
let currentExTimerSeconds = 45;

function openExerciseTimerModal(exName, targetSeconds) {
  const modal = document.getElementById('exerciseTimerModal');
  const title = document.getElementById('exTimerModalTitle');
  const display = document.getElementById('exTimerDisplay');
  const btnToggle = document.getElementById('btnExTimerToggle');

  title.textContent = `⏱️ ${exName}`;
  currentExTimerSeconds = targetSeconds || 45;

  const updateDisplay = () => {
    const m = String(Math.floor(currentExTimerSeconds / 60)).padStart(2, '0');
    const s = String(currentExTimerSeconds % 60).padStart(2, '0');
    display.textContent = `${m}:${s}`;
  };

  updateDisplay();
  modal.classList.remove('hidden');

  document.getElementById('btnExTimerSub10').onclick = () => {
    currentExTimerSeconds = Math.max(5, currentExTimerSeconds - 10);
    updateDisplay();
  };
  document.getElementById('btnExTimerAdd10').onclick = () => {
    currentExTimerSeconds += 10;
    updateDisplay();
  };

  let isRunning = false;
  btnToggle.textContent = '▶ Iniciar';

  btnToggle.onclick = () => {
    if (isRunning) {
      clearInterval(currentExTimerInterval);
      isRunning = false;
      btnToggle.textContent = '▶ Iniciar';
    } else {
      isRunning = true;
      btnToggle.textContent = '⏸ Pausar';
      const endMs = Date.now() + (currentExTimerSeconds * 1000);
      currentExTimerInterval = setInterval(() => {
        const remMs = endMs - Date.now();
        const remSecs = Math.max(0, Math.ceil(remMs / 1000));
        currentExTimerSeconds = remSecs;
        updateDisplay();

        if (remSecs <= 0) {
          clearInterval(currentExTimerInterval);
          isRunning = false;
          btnToggle.textContent = '▶ Iniciar';
          playTimerBeep();
        }
      }, 500);
    }
  };

  document.getElementById('btnExTimerClose').onclick = () => {
    clearInterval(currentExTimerInterval);
    modal.classList.add('hidden');
  };
}

// --- History Editing Modal Handler ---
function openEditHistoryModal(record) {
  const modal = document.getElementById('editHistoryModal');
  const container = document.getElementById('editHistoryFormContent');
  modal.classList.remove('hidden');

  let editedRecord = JSON.parse(JSON.stringify(record));

  const renderForm = () => {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Nombre del Día / Rutina:</label>
        <input type="text" id="editHistDayName" class="form-control" value="${editedRecord.dayName}">
      </div>
      <div style="display: flex; gap: 10px;">
        <div class="form-group" style="flex: 1;">
          <label class="form-label">Fecha:</label>
          <input type="text" id="editHistDate" class="form-control" value="${editedRecord.dateFormatted}">
        </div>
        <div class="form-group" style="flex: 1;">
          <label class="form-label">Duración (minutos):</label>
          <input type="number" id="editHistDurationMins" class="form-control" value="${Math.floor(editedRecord.durationSeconds / 60)}">
        </div>
      </div>
      <h5 style="color: var(--accent-cyan); margin: 10px 0 6px 0; font-size: 13px;">Ejercicios Registrados:</h5>
      <div id="editHistExercisesList" style="display: flex; flex-direction: column; gap: 10px;"></div>
    `;

    const exListContainer = container.querySelector('#editHistExercisesList');
    (editedRecord.detailedExercises || []).forEach((ex, exIdx) => {
      const exCard = document.createElement('div');
      exCard.className = 'card';
      exCard.style.cssText = 'padding: 10px; background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.08);';

      let setsRowsHtml = (ex.sets || []).map((s, sIdx) => `
        <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">
          <span style="font-size: 12px; font-weight: 700; min-width: 24px; color: var(--accent-cyan);">S${s.setNum}</span>
          <label style="font-size: 11px; color: var(--text-muted);">Peso:</label>
          <input type="number" step="0.5" class="form-control set-edit-w" data-exidx="${exIdx}" data-sidx="${sIdx}" value="${s.weight}" style="width: 70px; padding: 4px 6px; font-size: 12px;">
          <label style="font-size: 11px; color: var(--text-muted);">Reps:</label>
          <input type="number" class="form-control set-edit-r" data-exidx="${exIdx}" data-sidx="${sIdx}" value="${s.actualReps}" style="width: 60px; padding: 4px 6px; font-size: 12px;">
        </div>
      `).join('');

      exCard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong style="color: #fff; font-size: 13px;">${ex.name}</strong>
          <span class="badge badge-${ex.category ? ex.category.toLowerCase() : 'pierna'}">${ex.category || ''}</span>
        </div>
        <div>${setsRowsHtml}</div>
      `;
      exListContainer.appendChild(exCard);
    });

    container.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('focus', (e) => e.target.select());
      inp.addEventListener('click', (e) => e.target.select());
    });
  };

  renderForm();

  document.getElementById('btnCloseEditHistoryModal').onclick = () => modal.classList.add('hidden');

  document.getElementById('btnSaveEditHistory').onclick = async () => {
    editedRecord.dayName = document.getElementById('editHistDayName').value.trim() || editedRecord.dayName;
    editedRecord.dateFormatted = document.getElementById('editHistDate').value.trim() || editedRecord.dateFormatted;
    const durationMins = parseInt(document.getElementById('editHistDurationMins').value, 10) || 1;
    editedRecord.durationSeconds = durationMins * 60;

    let totalSets = 0;
    let totalVol = 0;

    (editedRecord.detailedExercises || []).forEach((ex, exIdx) => {
      (ex.sets || []).forEach((s, sIdx) => {
        const wInp = container.querySelector(`.set-edit-w[data-exidx="${exIdx}"][data-sidx="${sIdx}"]`);
        const rInp = container.querySelector(`.set-edit-r[data-exidx="${exIdx}"][data-sidx="${sIdx}"]`);
        if (wInp) s.weight = parseFloat(wInp.value) || 0;
        if (rInp) s.actualReps = parseInt(rInp.value, 10) || 0;

        totalSets += 1;
        const u = s.weightUnit || 'kg';
        const wKg = (u === 'lb') ? (s.weight * 0.453592) : s.weight;
        s.weightKg = parseFloat(wKg.toFixed(1));
        totalVol += (wKg * s.actualReps);
      });
    });

    editedRecord.totalSets = totalSets;
    editedRecord.totalVolumeKg = Math.round(totalVol);

    const idx = appState.workoutHistory.findIndex(h => h.id === editedRecord.id);
    if (idx !== -1) {
      appState.workoutHistory[idx] = editedRecord;
    }

    saveWorkoutHistory();
    renderHistory();
    modal.classList.add('hidden');

    const pId = appState.activeProfileId;
    if (pId && pId !== 'prof_guest' && !pId.startsWith('prof_guest')) {
      fetch(`/api/history/${pId}/${editedRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedRecord)
      }).catch(() => {});
    }
  };
}

function confirmDiscardWorkout() {
  if (!confirm('¿Deseas descartar este entrenamiento sin guardar en tu historial?')) return;

  clearInterval(appState.sessionTimerInterval);
  clearInterval(appState.restTimer.intervalId);
  restTimerBanner.classList.add('hidden');

  appState.activeSession = null;
  saveActiveSession();

  workoutActiveScreen.classList.add('hidden');
  workoutStartScreen.classList.remove('hidden');
  headerStatus.style.borderColor = 'rgba(0, 242, 254, 0.2)';
  statusText.textContent = 'Listo';
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
  alert(`¡Entrenamiento Guardado! 💪\nDuración: ${Math.floor(workoutRecord.durationSeconds / 60)} mins\nSeries Completadas: ${totalSetsCompleted}`);
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
  if (!catalogList) return;
  catalogList.innerHTML = '';

  const filtered = DEFAULT_EXERCISES_CATALOG.filter(ex => {
    const matchesCat = (category === 'ALL') || (ex.category.toLowerCase() === category.toLowerCase());
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  if (filtered.length === 0) {
    catalogList.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">No se encontraron ejercicios en esta categoría.</div>';
    return;
  }

  const categoryIcons = {
    'Pierna': '🦵', 'Pectoral': '🛡️', 'Espalda': '📐', 'Hombro': '⚡',
    'Bíceps': '🦾', 'Tríceps': '💥', 'Abdomen': '🎯'
  };

  filtered.forEach(ex => {
    const icon = categoryIcons[ex.category] || '🏋️';
    const lastHistory = appState.weightsHistory ? appState.weightsHistory[ex.id] : null;
    const lastWeightStr = (lastHistory && lastHistory.weight !== undefined) ? `${lastHistory.weight} ${lastHistory.unit || 'kg'}` : 'Sin registro de peso';
    const equipment = ex.equipment || 'General';

    const card = document.createElement('div');
    card.className = 'card exercise-catalog-card';
    card.style.cssText = 'margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; padding: 14px 16px;';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
        <div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 18px;">${icon}</span>
            <strong style="font-size: 15px; color: #fff;">${ex.name}</strong>
          </div>
          <div style="display: flex; gap: 6px; margin-top: 6px;">
            <span class="badge badge-${ex.category.toLowerCase()}">${ex.category}</span>
            <span class="badge" style="background: rgba(255, 255, 255, 0.08); color: var(--text-muted); border: 1px solid var(--border-color);">${equipment}</span>
          </div>
        </div>
      </div>
      <div style="font-size: 11px; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.25); padding: 6px 10px; border-radius: var(--radius-sm); border: 1px solid rgba(255, 255, 255, 0.05);">
        <span>📊 Carga sugerida: <strong style="color: #fff;">${lastWeightStr}</strong></span>
        <span>⚡ Serie base: ${ex.defaultSets || 1} x ${ex.defaultReps || 12} ${ex.unit || 'reps'}</span>
      </div>
    `;
    catalogList.appendChild(card);
  });
}

// --- History View ---
function renderHistory() {
  const historyLogsContainer = document.getElementById('historyLogsContainer');
  if (!historyLogsContainer) return;
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

    item.innerHTML = createHistoryCardHTML(record, mins);

    // Edit Log Button Handler
    const editLogBtn = item.querySelector('.edit-log-btn');
    if (editLogBtn) {
      editLogBtn.onclick = (e) => {
        e.stopPropagation();
        openEditHistoryModal(record);
      };
    }

    // Delete Log Button Handler
    const delLogBtn = item.querySelector('.del-log-btn');
    delLogBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm('¿Borrar este registro del historial?')) {
        const deletedId = record.id;
        appState.workoutHistory = appState.workoutHistory.filter(h => h.id !== deletedId);
        saveWorkoutHistory();
        renderHistory();

        // Explicit cloud deletion endpoint call
        const pId = appState.activeProfileId;
        if (pId && pId !== 'prof_guest' && !pId.startsWith('prof_guest')) {
          fetch(`/api/history/${pId}/${deletedId}`, { method: 'DELETE' }).catch(() => {});
        }
      }
    };

    // Toggle Drawer Handler
    const drawer = item.querySelector('.history-detail-drawer');
    const toggleLabel = item.querySelector('.toggle-detail-label');
    const detailList = item.querySelector('.detail-exercises-list');

    item.onclick = (e) => {
      if (e.target.closest('.del-log-btn') || e.target.closest('.edit-log-btn')) return;

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
  const routinesListContainer = document.getElementById('routinesListContainer');
  if (!routinesListContainer) return;
  routinesListContainer.innerHTML = '';
  if (!appState.routines || appState.routines.length === 0) {
    routinesListContainer.innerHTML = `
      <div class="empty-routines-card">
        <div class="empty-icon">🏋️‍♂️</div>
        <h3>¡Tu Gimnasio, Tu Regla! 💪</h3>
        <p>Todos los usuarios empiezan desde 0. Crea tu primera rutina personalizada agregando tus días y ejercicios a tu gusto.</p>
        <button id="btnCreateFirstRoutine" class="btn btn-primary btn-lg mt-2" style="width: 100%;">
          ⚡ Crear mi Primera Rutina
        </button>
      </div>
    `;
    const btn = document.getElementById('btnCreateFirstRoutine');
    if (btn) {
      btn.onclick = () => {
        openRoutineEditor({
          id: 'routine_' + Date.now(),
          name: 'Mi Rutina Personalizada',
          days: [{ dayName: 'Día 1: Mi primer día', exerciseIds: [] }]
        });
      };
    }
    return;
  }

  appState.routines.forEach(r => {
    const item = document.createElement('div');
    item.className = 'card';
    item.style.marginBottom = '10px';

    item.innerHTML = createRoutineItemHTML(r);

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

let routineAccordionStateMap = {};

function openRoutineEditor(routine) {
  editingRoutine = JSON.parse(JSON.stringify(routine));
  routineNameInput.value = editingRoutine.name;
  routineEditorCard.classList.remove('hidden');
  routineAccordionStateMap = {};
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

      const categoryKey = `${dIdx}_${cat}`;
      if (routineAccordionStateMap[categoryKey] === undefined) {
        routineAccordionStateMap[categoryKey] = (selectedInCat.length > 0);
      }
      const isExpanded = routineAccordionStateMap[categoryKey] === true;

      const groupWrapper = document.createElement('div');
      groupWrapper.style.marginBottom = '6px';

      const icon = categoryIcons[cat] || '💪';
      groupWrapper.innerHTML = `
        <div class="category-group-header">
          <div>
            <span>${icon} ${cat}</span>
            <span class="badge badge-${cat.toLowerCase()}" style="margin-left: 6px;">${selectedInCat.length} / ${categoryExercises.length}</span>
          </div>
          <span class="accordion-arrow" style="font-size: 10px; color: var(--text-muted);">${isExpanded ? '▲' : '▼'}</span>
        </div>
        <div class="category-group-body ${isExpanded ? '' : 'collapsed'}"></div>
      `;

      const groupHeader = groupWrapper.querySelector('.category-group-header');
      const groupBody = groupWrapper.querySelector('.category-group-body');
      const arrow = groupWrapper.querySelector('.accordion-arrow');

      groupHeader.onclick = () => {
        const isNowCollapsed = groupBody.classList.toggle('collapsed');
        arrow.textContent = isNowCollapsed ? '▼' : '▲';
        routineAccordionStateMap[categoryKey] = !isNowCollapsed;
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

// --- UI Component Template Generators (Clean Code / Pure Functions) ---
function createLiveExerciseHeaderHTML(ex, lastWeightStr, unit) {
  return `
    <div class="exercise-live-title">
      <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
        <span>${ex.name}</span>
        <span class="badge badge-${ex.category.toLowerCase()}">${ex.category}</span>
        <button class="btn btn-secondary btn-sm btn-swap-ex" data-exid="${ex.id}" style="font-size: 10px; padding: 2px 6px; border-color: var(--accent-cyan); color: var(--accent-cyan);">🔄 Cambiar</button>
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
}

function createHistoryCardHTML(record, mins) {
  const summaryStr = record.exercisesSummary ? record.exercisesSummary.map(e => e.name).join(', ') : '';
  return `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
      <strong style="font-size: 16px; color: #fff;">${record.dayName}</strong>
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="font-size: 11px; color: var(--accent-cyan);">${record.dateFormatted} • ${record.timeFormatted}</span>
        <button class="btn btn-secondary btn-sm edit-log-btn" style="padding: 2px 8px; font-size: 11px; border-color: var(--accent-cyan); color: var(--accent-cyan);">✏️ Editar</button>
        <button class="btn btn-danger btn-sm del-log-btn" style="padding: 2px 6px; font-size: 11px;">🗑️</button>
      </div>
    </div>

    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">
      ⏱️ Duración: <strong>${mins} min</strong> • 🏋️ Series: <strong>${record.totalSets}</strong> • 📊 Vol: <strong>${record.totalVolumeKg} kg</strong>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div style="font-size: 11px; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
        ${summaryStr}
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
}

function createRoutineItemHTML(routine) {
  const daysCount = routine.days ? routine.days.length : 0;
  return `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <strong style="font-size: 16px; color: #fff;">${routine.name}</strong>
        <div style="font-size: 12px; color: var(--text-muted);">${daysCount} Días de entrenamiento</div>
      </div>
      <div style="display: flex; gap: 6px;">
        <button class="btn btn-secondary btn-sm edit-r-btn">Editar</button>
        <button class="btn btn-danger btn-sm del-r-btn">🗑️</button>
      </div>
    </div>
  `;
}
