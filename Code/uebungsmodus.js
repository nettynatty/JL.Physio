let mergedPlan = [];
let currentIndex = 0;

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function preloadImages(plan) {
  plan.forEach(ex => {
    [ex.bildStart, ex.bildAusfuehrung].forEach(src => {
      if (src) {
        const preload = new Image();
        preload.src = src;
      }
    });
  });
}

async function initTraining() {
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

  // Start-Index
  const savedIndex = sessionStorage.getItem('jl_start_index');

  if (savedIndex !== null) {
    currentIndex = Number(savedIndex);
    sessionStorage.removeItem('jl_start_index');
  } else {
    const firstOpen = mergedPlan.findIndex(ex => !ex.erledigtHeute);
    if (firstOpen !== -1) {
      currentIndex = firstOpen;
    } else {
      currentIndex = 0;
    }
  }

  preloadImages(mergedPlan);
  renderCurrentExercise();
  document.getElementById('training-view').style.display = 'block';
}

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

  // Bilder anzeigen ohne Visibility
  function setExerciseImage(imgId, src, altText) {
    const imgEl = document.getElementById(imgId);
    if (!imgEl) return;
    const mediaBox = imgEl.parentElement;

    if (src) {
      mediaBox.style.display = 'none';
      imgEl.onload = () => {
        mediaBox.style.display = 'flex';
      };
      imgEl.alt = altText;
      imgEl.src = src;

      if (imgEl.complete && imgEl.naturalWidth > 0) {
        mediaBox.style.display = 'flex';
      }
    } else {
      imgEl.onload = null;
      imgEl.removeAttribute('src');
      mediaBox.style.display = 'none';
    }
  }

  setExerciseImage('ex-image-start', ex.bildStart, `${ex.name} – Startposition`);
  setExerciseImage('ex-image-exec', ex.bildAusfuehrung, `${ex.name} – Ausführung`);

  // Listen füllen
  fillList('ex-start-list', ex.startposition);
  fillList('ex-exec-list', ex.ausfuehrung);
  fillList('ex-cues-list', ex.zuBeachten);

  // Gut zu wissen
  const infoBox = document.getElementById('ex-info-box');
  infoBox.removeAttribute('open');
  if (ex.gutZuWissen && ex.gutZuWissen.length > 0) {
    infoBox.style.display = 'block';
    fillList('ex-info-list', ex.gutZuWissen);
  } else {
    infoBox.style.display = 'none';
  }

  // Fortschrittsleiste
  const currentStep = currentIndex + 1;
  document.getElementById('progress-text').textContent = `Übung ${currentStep} von ${total}`;
  const progressBar = document.getElementById('progress-bar');
  progressBar.max = total;
  progressBar.value = currentStep;

  // Buttons
  const prevBtn = document.getElementById('prev-exercise-btn');
  const nextBtn = document.getElementById('next-exercise-btn');
  const topExitBtn = document.getElementById('exit-training-btn');

  if (isFirst) {
    prevBtn.style.visibility = 'hidden';
  } else {
    prevBtn.style.visibility = 'visible';
  }

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

function handlePrevExercise() {
  if (currentIndex > 0) {
    currentIndex--;
    renderCurrentExercise();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function handleNextExercise() {
  mergedPlan[currentIndex].erledigtHeute = true;
  saveProgress();

  if (currentIndex < mergedPlan.length - 1) {
    currentIndex++;
    renderCurrentExercise();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    window.location.href = 'index.html';
  }
}

function saveProgress() {
  const progressMap = {};
  mergedPlan.forEach(ex => {
    progressMap[ex.uebungId] = ex.erledigtHeute;
  });
  localStorage.setItem('jl_beta_progress', JSON.stringify(progressMap));
  localStorage.setItem('jl_beta_progress_date', getTodayKey());
}

// Lightbox
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

if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
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

document.getElementById('prev-exercise-btn').addEventListener('click', handlePrevExercise);
document.getElementById('next-exercise-btn').addEventListener('click', handleNextExercise);
document.getElementById('exit-training-btn').addEventListener('click', () => {
  window.location.href = 'index.html';
});

initTraining();