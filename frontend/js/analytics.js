// ==========================================================================
// GymTracker Analytics & Progress Module (Chart.js Integration)
// ==========================================================================

let overloadChart = null;
let weeklyVolumeChart = null;
let muscleDistributionChart = null;

// Formula for Estimated 1RM (Epley Formula): 1RM = Weight * (1 + Reps / 30)
function calculate1RM(weight, reps) {
  if (!weight || weight <= 0) return 0;
  if (!reps || reps <= 0) return weight;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

function initAnalytics() {
  const analyticsExSelect = document.getElementById('analyticsExSelect');
  if (!analyticsExSelect) return;

  // Populate exercise selector for progressive overload chart
  analyticsExSelect.innerHTML = '';
  DEFAULT_EXERCISES_CATALOG.forEach(ex => {
    const option = document.createElement('option');
    option.value = ex.id;
    option.textContent = `${ex.name} (${ex.category})`;
    analyticsExSelect.appendChild(option);
  });

  analyticsExSelect.onchange = (e) => {
    renderOverloadChart(e.target.value);
  };

  renderAnalyticsDashboard();
}

function renderAnalyticsDashboard() {
  renderPRsSummary();
  
  const analyticsExSelect = document.getElementById('analyticsExSelect');
  const selectedExId = analyticsExSelect ? analyticsExSelect.value : DEFAULT_EXERCISES_CATALOG[0].id;
  renderOverloadChart(selectedExId);
  
  renderWeeklyVolumeChart();
  renderMuscleDistributionChart();
}

// 1. Personal Records (PRs) Cards
function renderPRsSummary() {
  const prsContainer = document.getElementById('prsContainer');
  if (!prsContainer) return;
  prsContainer.innerHTML = '';

  const prsMap = {};

  // Traversal of completed workout history
  if (appState.workoutHistory && appState.workoutHistory.length > 0) {
    appState.workoutHistory.forEach(record => {
      if (record.detailedExercises) {
        record.detailedExercises.forEach(ex => {
          if (!prsMap[ex.name]) {
            prsMap[ex.name] = { maxWeight: 0, max1RM: 0, category: ex.category };
          }
          ex.sets.forEach(set => {
            if (set.weight > prsMap[ex.name].maxWeight) {
              prsMap[ex.name].maxWeight = set.weight;
            }
            const e1RM = calculate1RM(set.weight, set.actualReps);
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
    .slice(0, 4);

  if (topPRs.length === 0) {
    prsContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 12px; text-align: center; width: 100%;">Registra tus entrenamientos en vivo para desbloquear tus Récords Personales (PRs).</div>';
    return;
  }

  topPRs.forEach(pr => {
    const card = document.createElement('div');
    card.style.cssText = 'background: var(--bg-input); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); padding: 10px 12px; flex: 1; min-width: 130px; text-align: center;';
    card.innerHTML = `
      <div style="font-size: 11px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${pr.name}</div>
      <div style="font-family: var(--font-heading); font-size: 20px; font-weight: 800; color: var(--accent-cyan); margin: 2px 0;">
        ${pr.maxWeight} <span style="font-size: 12px; font-weight: 600; color: #fff;">kg</span>
      </div>
      <div style="font-size: 10px; color: var(--accent-green);">1RM Est: ${pr.max1RM} kg</div>
    `;
    prsContainer.appendChild(card);
  });
}

// 2. Progressive Overload Chart (1RM & Max Weight vs Date)
function renderOverloadChart(exerciseId) {
  const canvas = document.getElementById('overloadChartCanvas');
  if (!canvas) return;

  const targetEx = DEFAULT_EXERCISES_CATALOG.find(ex => ex.id === exerciseId);
  const exName = targetEx ? targetEx.name : '';

  const labels = [];
  const maxWeights = [];
  const est1RMs = [];

  if (appState.workoutHistory && appState.workoutHistory.length > 0) {
    // Traverse from oldest to newest for chronological chart line
    [...appState.workoutHistory].reverse().forEach(record => {
      if (record.detailedExercises) {
        const foundEx = record.detailedExercises.find(e => e.name.toLowerCase() === exName.toLowerCase());
        if (foundEx && foundEx.sets.length > 0) {
          let dayMaxW = 0;
          let dayMax1RM = 0;

          foundEx.sets.forEach(s => {
            if (s.weight > dayMaxW) dayMaxW = s.weight;
            const e1RM = calculate1RM(s.weight, s.actualReps);
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

  if (appState.workoutHistory && appState.workoutHistory.length > 0) {
    [...appState.workoutHistory].slice(0, 7).reverse().forEach(record => {
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

  if (appState.workoutHistory && appState.workoutHistory.length > 0) {
    appState.workoutHistory.forEach(record => {
      if (record.detailedExercises) {
        record.detailedExercises.forEach(ex => {
          if (muscleCounts[ex.category] !== undefined) {
            muscleCounts[ex.category] += ex.sets.length;
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
