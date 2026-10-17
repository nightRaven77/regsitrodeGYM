// ==========================================================================
// GymTracker Analytics & Progress Module (Chart.js Integration)
// ==========================================================================

let overloadChart = null;
let weeklyVolumeChart = null;
let muscleDistributionChart = null;
let analyticsFilterDays = 0; // 0 = All time, 30 = 30 days, 7 = 7 days

function escapeAnalyticsHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Formula for Estimated 1RM (Epley Formula): 1RM = Weight * (1 + Reps / 30)
function calculate1RM(weight, reps) {
  if (!weight || weight <= 0) return 0;
  if (!reps || reps <= 0) return weight;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

function getFilteredWorkoutHistory() {
  const history = (typeof appState !== 'undefined' && Array.isArray(appState.workoutHistory))
    ? appState.workoutHistory
    : [];
  if (!analyticsFilterDays || analyticsFilterDays <= 0) {
    return history;
  }
  const cutoffMs = Date.now() - (analyticsFilterDays * 24 * 60 * 60 * 1000);
  return history.filter((record, index) => {
    if (record.completedAtIso) {
      const ts = new Date(record.completedAtIso).getTime();
      if (!isNaN(ts)) return ts >= cutoffMs;
    }
    if (record.id && String(record.id).startsWith('work_')) {
      const idTs = parseInt(String(record.id).replace('work_', ''), 10);
      if (!isNaN(idTs) && idTs > 1600000000000) {
        return idTs >= cutoffMs;
      }
    }
    return index < analyticsFilterDays;
  });
}

function initAnalytics() {
  try {
    const analyticsExSelect = document.getElementById('analyticsExSelect');
    if (!analyticsExSelect) return;

    const periodPills = document.querySelectorAll('#analyticsPeriodFilters .filter-pill');
    periodPills.forEach(pill => {
      pill.onclick = () => {
        periodPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        analyticsFilterDays = parseInt(pill.getAttribute('data-days'), 10) || 0;
        renderAnalyticsDashboard();
      };
    });

    const previousVal = analyticsExSelect.value;
    analyticsExSelect.innerHTML = '';

    const loggedExNames = new Set();
    if (appState.workoutHistory && appState.workoutHistory.length > 0) {
      appState.workoutHistory.forEach(w => {
        if (w.detailedExercises) {
          w.detailedExercises.forEach(ex => loggedExNames.add(ex.name));
        }
      });
    }

    // Add exercises with history first
    loggedExNames.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = `★ ${name} (Con Historial)`;
      analyticsExSelect.appendChild(option);
    });

    // Add catalog exercises
    DEFAULT_EXERCISES_CATALOG.forEach(ex => {
      if (!loggedExNames.has(ex.name)) {
        const option = document.createElement('option');
        option.value = ex.name;
        option.textContent = `${ex.name} (${ex.category})`;
        analyticsExSelect.appendChild(option);
      }
    });

    if (previousVal && Array.from(analyticsExSelect.options).some(o => o.value === previousVal)) {
      analyticsExSelect.value = previousVal;
    }

    analyticsExSelect.onchange = (e) => {
      try {
        renderOverloadChart(e.target.value);
      } catch (err) {
        console.error('Error on overload chart select:', err);
      }
    };

    renderAnalyticsDashboard();
  } catch (err) {
    console.error('Error initializing analytics:', err);
  }
}

function renderAnalyticsDashboard() {
  try {
    renderPRsSummary();

    const analyticsExSelect = document.getElementById('analyticsExSelect');
    let selectedExName = (analyticsExSelect && analyticsExSelect.value) ? analyticsExSelect.value : null;

    const filteredHistory = getFilteredWorkoutHistory();
    if (!selectedExName && filteredHistory.length > 0) {
      const firstRecord = filteredHistory[0];
      if (firstRecord.detailedExercises && firstRecord.detailedExercises.length > 0) {
        selectedExName = firstRecord.detailedExercises[0].name;
      }
    }

    if (!selectedExName && DEFAULT_EXERCISES_CATALOG.length > 0) {
      selectedExName = DEFAULT_EXERCISES_CATALOG[0].name;
    }

    renderOverloadChart(selectedExName);
    renderWeeklyVolumeChart();
    renderMuscleDistributionChart();
  } catch (err) {
    console.error('Error rendering analytics dashboard:', err);
  }
}

// 1. Personal Records (PRs) Cards (excludes Warm-up 'W' sets)
function renderPRsSummary() {
  const prsContainer = document.getElementById('prsContainer');
  if (!prsContainer) return;
  prsContainer.innerHTML = '';

  const prsMap = {};
  const filteredHistory = getFilteredWorkoutHistory();

  if (filteredHistory.length > 0) {
    filteredHistory.forEach(record => {
      if (record.detailedExercises) {
        record.detailedExercises.forEach(ex => {
          if (!prsMap[ex.name]) {
            prsMap[ex.name] = { maxWeight: 0, max1RM: 0, category: ex.category };
          }
          (ex.sets || []).forEach(set => {
            if (set.setType === 'W') return; // Warm-up sets excluded from effective PRs
            const wKg = set.weightKg !== undefined ? set.weightKg : set.weight;
            if (wKg > prsMap[ex.name].maxWeight) {
              prsMap[ex.name].maxWeight = wKg;
            }
            const e1RM = calculate1RM(wKg, set.actualReps);
            if (e1RM > prsMap[ex.name].max1RM) {
              prsMap[ex.name].max1RM = e1RM;
            }
          });
        });
      }
    });
  }

  const topPRs = Object.keys(prsMap)
    .map(name => ({ name, ...prsMap[name] }))
    .filter(pr => pr.maxWeight > 0)
    .sort((a, b) => b.maxWeight - a.maxWeight)
    .slice(0, typeof CONFIG !== 'undefined' ? CONFIG.MAX_PR_CARDS : 4);

  if (topPRs.length === 0) {
    prsContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 12px; text-align: center; width: 100%;">Registra tus entrenamientos en vivo para desbloquear tus Récords Personales (PRs).</div>';
    return;
  }

  topPRs.forEach(pr => {
    const card = document.createElement('div');
    card.style.cssText = 'background: var(--bg-input); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); padding: 10px 12px; flex: 1; min-width: 130px; text-align: center;';
    const safeName = escapeAnalyticsHTML(pr.name);
    card.innerHTML = `
      <div style="font-size: 11px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${safeName}">${safeName}</div>
      <div style="font-family: var(--font-heading); font-size: 20px; font-weight: 800; color: var(--accent-cyan); margin: 2px 0;">
        ${pr.maxWeight} <span style="font-size: 12px; font-weight: 600; color: #fff;">kg</span>
      </div>
      <div style="font-size: 10px; color: var(--accent-green);">1RM Est: ${pr.max1RM} kg</div>
    `;
    prsContainer.appendChild(card);
  });
}

// 2. Progressive Overload Chart (1RM & Max Weight vs Date)
function renderOverloadChart(exerciseName) {
  const canvas = document.getElementById('overloadChartCanvas');
  if (!canvas) return;

  const targetEx = DEFAULT_EXERCISES_CATALOG.find(
    ex => ex.id === exerciseName || ex.name.toLowerCase() === (exerciseName || '').toLowerCase()
  );
  const exName = exerciseName || (targetEx ? targetEx.name : (DEFAULT_EXERCISES_CATALOG[0] ? DEFAULT_EXERCISES_CATALOG[0].name : ''));

  const labels = [];
  const maxWeights = [];
  const est1RMs = [];
  const filteredHistory = getFilteredWorkoutHistory();

  if (filteredHistory.length > 0) {
    [...filteredHistory].reverse().forEach(record => {
      if (record.detailedExercises) {
        const foundEx = record.detailedExercises.find(e => e.name.toLowerCase() === exName.toLowerCase());
        if (foundEx && foundEx.sets && foundEx.sets.length > 0) {
          let dayMaxW = 0;
          let dayMax1RM = 0;

          foundEx.sets.forEach(s => {
            if (s.setType === 'W') return;
            const wKg = s.weightKg !== undefined ? s.weightKg : s.weight;
            if (wKg > dayMaxW) dayMaxW = wKg;
            const e1RM = calculate1RM(wKg, s.actualReps);
            if (e1RM > dayMax1RM) dayMax1RM = e1RM;
          });

          if (dayMaxW > 0) {
            labels.push(record.dateFormatted);
            maxWeights.push(dayMaxW);
            est1RMs.push(dayMax1RM);
          }
        }
      }
    });
  }

  if (typeof Chart === 'undefined') {
    canvas.parentElement.innerHTML = '<div style="color: var(--text-muted); font-size: 12px; text-align: center; padding: 20px;">Chart.js cargando o no disponible sin conexión.</div>';
    return;
  }

  if (overloadChart) overloadChart.destroy();

  const ctx = canvas.getContext('2d');
  overloadChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length > 0 ? labels : ['Sesión 1', 'Sesión 2', 'Sesión 3'],
      datasets: [
        {
          label: 'Peso Máximo (kg)',
          data: maxWeights.length > 0 ? maxWeights : [0, 0, 0],
          borderColor: '#00f2fe',
          backgroundColor: 'rgba(0, 242, 254, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 5
        },
        {
          label: '1RM Estimado (kg)',
          data: est1RMs.length > 0 ? est1RMs : [0, 0, 0],
          borderColor: '#00e676',
          borderDash: [5, 5],
          tension: 0.3,
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#f0f4f8', font: { family: 'Plus Jakarta Sans', size: 11 } } }
      },
      scales: {
        x: { ticks: { color: '#8e9bb0' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
        y: { ticks: { color: '#8e9bb0' }, grid: { color: 'rgba(255, 255, 255, 0.05)' }, beginAtZero: true }
      }
    }
  });
}

// 3. Weekly Volume Chart (Total kg per session/week)
function renderWeeklyVolumeChart() {
  const canvas = document.getElementById('weeklyVolumeCanvas');
  if (!canvas || typeof Chart === 'undefined') return;

  const labels = [];
  const volumes = [];
  const filteredHistory = getFilteredWorkoutHistory();

  if (filteredHistory.length > 0) {
    [...filteredHistory].slice(0, 7).reverse().forEach(record => {
      labels.push(record.dateFormatted);
      volumes.push(record.totalVolumeKg || 0);
    });
  }

  if (weeklyVolumeChart) weeklyVolumeChart.destroy();

  const ctx = canvas.getContext('2d');
  weeklyVolumeChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length > 0 ? labels : ['Sesión 1', 'Sesión 2', 'Sesión 3'],
      datasets: [{
        label: 'Volumen Total (kg)',
        data: volumes.length > 0 ? volumes : [0, 0, 0],
        backgroundColor: 'rgba(79, 172, 254, 0.6)',
        borderColor: '#4facfe',
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#f0f4f8', font: { family: 'Plus Jakarta Sans', size: 11 } } }
      },
      scales: {
        x: { ticks: { color: '#8e9bb0' }, grid: { display: false } },
        y: { ticks: { color: '#8e9bb0' }, grid: { color: 'rgba(255, 255, 255, 0.05)' }, beginAtZero: true }
      }
    }
  });
}

// 4. Muscle Distribution Pie Chart
function renderMuscleDistributionChart() {
  const canvas = document.getElementById('muscleDistributionCanvas');
  if (!canvas || typeof Chart === 'undefined') return;

  const muscleCounts = {
    'Pierna': 0, 'Pectoral': 0, 'Espalda': 0, 'Hombro': 0, 'Bíceps': 0, 'Tríceps': 0, 'Abdomen': 0
  };
  const filteredHistory = getFilteredWorkoutHistory();

  if (filteredHistory.length > 0) {
    filteredHistory.forEach(record => {
      if (record.detailedExercises) {
        record.detailedExercises.forEach(ex => {
          if (muscleCounts[ex.category] !== undefined) {
            const effectiveSets = (ex.sets || []).filter(s => s.setType !== 'W');
            muscleCounts[ex.category] += effectiveSets.length;
          }
        });
      }
    });
  }

  if (muscleDistributionChart) muscleDistributionChart.destroy();

  const ctx = canvas.getContext('2d');
  muscleDistributionChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(muscleCounts),
      datasets: [{
        data: Object.values(muscleCounts),
        backgroundColor: [
          '#ff5252', '#4facfe', '#00e676', '#ff9100', '#e040fb', '#00e5ff', '#ffeb3b'
        ],
        borderWidth: 2,
        borderColor: '#131b2e'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#f0f4f8', font: { family: 'Plus Jakarta Sans', size: 10 } } }
      }
    }
  });
}
