let mergedPlan = [];
let currentIndex = 0;

// Hilfsfunktion - Datum Heute
function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Daten einlesen
async function initApp() {
  const [uebungenRes, patientenRes] = await Promise.all([
    fetch('./uebungen.json'),
    fetch('./fiktive_patienten.json')
  ]);

  const uebungen = await uebungenRes.json();
  const patienten = await patientenRes.json();

  // BETA: Test-Patient Auswahl
  const demoPatient = patienten.find(p =>
    (p.uebungsplan || []).some(item => {
      const details = uebungen.find(u => u.id === item.uebungId);
      return details && Array.isArray(details.gutZuWissen) && details.gutZuWissen.length > 0;
    })
  ) || patienten[0];

  // Reset
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

// Tagesplan - Übersicht
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
    li.addEventListener('click', () => startTrainingAt(index));
    listEl.appendChild(li);
  });
}

// Trainingsmodus - Start
function startTraining() {
  const firstOpenIndex = mergedPlan.findIndex(ex => !ex.erledigtHeute);
  startTrainingAt(firstOpenIndex !== -1 ? firstOpenIndex : 0);
}

function startTrainingAt(index) {
  currentIndex = index;
  const heroBanner = document.getElementById('hero-banner');
  if (heroBanner) heroBanner.style.display = 'none';
  document.getElementById('overview-view').style.display = 'none';
  document.getElementById('training-view').style.display = 'block';
  renderCurrentExercise();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// Aktuelle Übung im Trainingsmodus
function renderCurrentExercise() {
  const ex = mergedPlan[currentIndex];
  const total = mergedPlan.length;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === total - 1;

  document.getElementById('step-indicator').textContent = `ÜBUNG ${currentIndex + 1}/${total}`;
  document.getElementById('ex-title').textContent = ex.name;

  // Badges
  const badgeContainer = document.getElementById('ex-dosage-badges');
  badgeContainer.innerHTML = '';

  const badges = [
    { icon: 'fa-solid fa-rotate', label: 'Dosierung', value: `${ex.saetze} × ${ex.wiederholungen} Wiederholungen` },
    { icon: 'fa-solid fa-dumbbell', label: 'Gewicht', value: ex.gewicht },
    { icon: 'fa-solid fa-toolbox', label: 'Hilfsmittel', value: ex.hilfsmittel },
    { icon: 'fa-solid fa-hourglass-half', label: 'Pause', value: ex.pause },
    { icon: 'fa-solid fa-calendar-days', label: 'Häufigkeit', value: ex.haeufigkeit }
  ];

  badges.forEach(b => {
    if (b.value && b.value !== '-') {
      const span = document.createElement('span');
      span.className = 'dosage-pill';
      span.innerHTML = `<i class="${b.icon}" aria-hidden="true"></i> <span><strong>${b.label}:</strong> ${b.value}</span>`;
      badgeContainer.appendChild(span);
    }
  });

// Bilder anzeigen
function setExerciseImage(imgId, src, altText) {
  const imgEl = document.getElementById(imgId);
  if (!imgEl) return;

  if (src) {
    imgEl.src = src;
    imgEl.alt = altText;
    imgEl.parentElement.style.display = 'flex';
  } else {
    imgEl.removeAttribute('src');
    imgEl.parentElement.style.display = 'none';
  }
}

setExerciseImage('ex-image-start', ex.bildStart, `${ex.name} – Startposition`);
setExerciseImage('ex-image-exec', ex.bildAusfuehrung, `${ex.name} – Ausführung`);

  // Listen füllen
  fillList('ex-start-list', ex.startposition);
  fillList('ex-exec-list', ex.ausfuehrung);
  fillList('ex-cues-list', ex.zuBeachten);

  // Gut zu wissen Einblendung
  const infoBox = document.getElementById('ex-info-box');
  infoBox.removeAttribute('open');
  if (ex.gutZuWissen && ex.gutZuWissen.length > 0) {
    infoBox.style.display = 'block';
    fillList('ex-info-list', ex.gutZuWissen);
  } else {
    infoBox.style.display = 'none';
  }

  // Fortschrittleiste
  const currentStep = currentIndex + 1;
  document.getElementById('progress-text').textContent = `Übung ${currentStep} von ${total}`;
  const progressBar = document.getElementById('progress-bar');
  progressBar.max = total;
  progressBar.value = currentStep;

  // Button-Steuerung
  const prevBtn = document.getElementById('prev-exercise-btn');
  const nextBtn = document.getElementById('next-exercise-btn');
  const topExitBtn = document.getElementById('exit-training-btn');

  prevBtn.style.visibility = isFirst ? 'hidden' : 'visible';

  if (isLast) {
    nextBtn.innerHTML = '<span>TRAINING ABSCHLIESSEN</span> <i class="fa-solid fa-check"></i>';
    topExitBtn.style.visibility = 'hidden';
  } else {
    nextBtn.innerHTML = '<span>NÄCHSTE ÜBUNG</span> <i class="fa-solid fa-arrow-right"></i>';
    topExitBtn.style.visibility = 'visible';
  }
}

function fillList(elementId, items) {
  const ul = document.getElementById(elementId);
  ul.innerHTML = '';
  (items || []).forEach(text => {
    const li = document.createElement('li');
    li.textContent = text;
    ul.appendChild(li);
  });
}

// Vorherige Übung
function handlePrevExercise() {
  if (currentIndex > 0) {
    currentIndex--;
    renderCurrentExercise();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Nächste Übung - Abschließen
function handleNextExercise() {
  mergedPlan[currentIndex].erledigtHeute = true;
  saveProgress();

  if (currentIndex < mergedPlan.length - 1) {
    currentIndex++;
    renderCurrentExercise();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    exitTraining();
  }
}

// Training beenden - zurück zur Übersicht
function exitTraining() {
  const accordion = document.querySelector('.guidelines-accordion');
  if (accordion) accordion.removeAttribute('open');

  document.getElementById('training-view').style.display = 'none';
  const heroBanner = document.getElementById('hero-banner');
  if (heroBanner) heroBanner.style.display = 'flex';
  document.getElementById('overview-view').style.display = 'block';
  renderOverview();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function saveProgress() {
  const progressMap = {};
  mergedPlan.forEach(ex => {
    progressMap[ex.uebungId] = ex.erledigtHeute;
  });
  localStorage.setItem('jl_beta_progress', JSON.stringify(progressMap));
  localStorage.setItem('jl_beta_progress_date', getTodayKey());
}

// Großansicht/Lightbox
const lightbox = document.getElementById('image-lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');
const lightboxClose = document.getElementById('lightbox-close');

function openLightbox(src, caption) {
  if (!src) return;
  lightboxImg.src = src;
  lightboxImg.alt = caption;
  lightboxCaption.textContent = caption;
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden', 'false');
}

function closeLightbox() {
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
  lightboxImg.removeAttribute('src');
}

document.querySelectorAll('.instruction-media').forEach(container => {
  container.addEventListener('click', () => {
    const img = container.querySelector('img');
    if (img && img.getAttribute('src')) {
      openLightbox(img.src, img.alt);
    }
  });
});

if (lightboxClose) {
  lightboxClose.addEventListener('click', closeLightbox);
}

if (lightbox) {
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && lightbox.classList.contains('open')) {
    closeLightbox();
  }
});

// Event-Listener verknüpfen
document.getElementById('start-training-btn').addEventListener('click', startTraining);
document.getElementById('prev-exercise-btn').addEventListener('click', handlePrevExercise);
document.getElementById('next-exercise-btn').addEventListener('click', handleNextExercise);
document.getElementById('exit-training-btn').addEventListener('click', exitTraining);

const logoLink = document.getElementById('logo-home-link');
if (logoLink) {
  logoLink.addEventListener('click', (e) => {
    e.preventDefault();
    exitTraining();
  });
}

initApp();