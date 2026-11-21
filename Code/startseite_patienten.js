let mergedPlan = [];

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function initOverview() {
  const [uebungenRes, patientenRes] = await Promise.all([
    fetch('./uebungen.json'),
    fetch('./fiktive_patienten.json')
  ]);

  const uebungen = await uebungenRes.json();
  const patienten = await patientenRes.json();

  const demoPatient = patienten.find(p =>
    (p.uebungsplan || []).some(item => {
      const details = uebungen.find(u => u.id === item.uebungId);
      return details && Array.isArray(details.gutZuWissen) && details.gutZuWissen.length > 0;
    })
  ) || patienten[0];

  const today = getTodayKey();
  const savedDate = localStorage.getItem('jl_beta_progress_date');
  let savedProgress = {};

  if (savedDate === today) {
    savedProgress = JSON.parse(localStorage.getItem('jl_beta_progress')) || {};
  } else {
    localStorage.removeItem('jl_beta_progress');
    localStorage.setItem('jl_beta_progress_date', today);
  }

  mergedPlan = (demoPatient.uebungsplan || []).map(item => {
    const details = uebungen.find(u => u.id === item.uebungId);
    const isDone = savedProgress[item.uebungId] === true;
    return { ...item, ...details, erledigtHeute: isDone };
  });

  renderOverview();
}

function renderOverview() {
  const listEl = document.getElementById('exercise-overview-list');
  listEl.innerHTML = '';

  const totalCount = mergedPlan.length;
  const openCount = mergedPlan.filter(u => !u.erledigtHeute).length;
  const doneCount = totalCount - openCount;

  const statusText = document.getElementById('open-exercises-text');
  const statusSubtext = document.getElementById('status-subtext');
  const startBtn = document.getElementById('start-training-btn');

  if (doneCount === 0) {
    statusText.textContent = `Du hast heute ${totalCount} offene Übungen auf deinem Plan.`;
    if (statusSubtext) statusSubtext.textContent = 'Starte jetzt entspannt in dein heutiges Training.';
    startBtn.innerHTML = '<span>TRAINING STARTEN</span> <i class="fa-solid fa-arrow-right"></i>';
  } else if (openCount > 0) {
    const uebungWort = openCount === 1 ? 'offene Übung' : 'offene Übungen';
    statusText.textContent = `Du hast noch ${openCount} ${uebungWort} in deinem heutigen Tagesplan.`;
    if (statusSubtext) statusSubtext.textContent = 'Mache dort weiter, wo du aufgehört hast.';
    startBtn.innerHTML = '<span>TRAINING FORTSETZEN</span> <i class="fa-solid fa-arrow-right"></i>';
  } else {
    statusText.textContent = 'Super! Du hast heute alle Übungen geschafft.';
    if (statusSubtext) statusSubtext.textContent = 'Wir sehen uns zu deinem morgigen Training wieder.';
    startBtn.innerHTML = '<span>ÜBUNGEN ERNEUT ANSEHEN</span> <i class="fa-solid fa-arrow-right"></i>';
  }

  mergedPlan.forEach((ex, index) => {
    const li = document.createElement('li');
    li.className = ex.erledigtHeute ? 'done' : 'open';
    li.innerHTML = `
      <span><strong>ÜBUNG ${index + 1}:</strong> ${ex.name}</span>
      <span class="status-badge">${ex.erledigtHeute ? 'ERLEDIGT' : 'OFFEN'}</span>
    `;
    li.style.cursor = 'pointer';
    li.addEventListener('click', () => {
      window.location.href = `uebungsmodus.html?index=${index}`;
    });
    listEl.appendChild(li);
  });
}

document.getElementById('start-training-btn').addEventListener('click', () => {
  const firstOpenIndex = mergedPlan.findIndex(ex => !ex.erledigtHeute);
  const targetIndex = firstOpenIndex !== -1 ? firstOpenIndex : 0;
  window.location.href = `uebungsmodus.html?index=${targetIndex}`;
});

initOverview();