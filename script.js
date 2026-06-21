(function () {
  'use strict';

  const CYCLE_MIN = 90;
  const MIN_CYCLES = 3;
  const MAX_CYCLES = 6;
  const RECOMMENDED_CYCLES = 5;

  let mode = 'bedtime'; // 'bedtime' = me acuesto ahora -> calcular despertar; 'wake' = despertar a -> calcular acostarse

  const el = (id) => document.getElementById(id);

  const themeToggle = el('themeToggle');
  const iconMoon = el('iconMoon');
  const iconSun = el('iconSun');
  const modeButtons = document.querySelectorAll('.mode-btn');
  const timeInput = el('timeInput');
  const timeInputLabel = el('timeInputLabel');
  const nowBtn = el('nowBtn');
  const fallAsleep = el('fallAsleep');
  const fallAsleepValue = el('fallAsleepValue');
  const calcBtn = el('calcBtn');
  const resultsSection = el('resultsSection');
  const resultsList = el('resultsList');
  const orbitSvg = el('orbitSvg');
  const orbitCenterLabel = el('orbitCenterLabel');
  const orbitCenterTime = el('orbitCenterTime');
  const exportImgBtn = el('exportImgBtn');
  const exportPdfBtn = el('exportPdfBtn');

  let lastResults = null;

  // ---------- theme ----------
  function initTheme() {
    const saved = localStorage.getItem('cronos-theme');
    const theme = saved || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    setTheme(theme);
  }

  function setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('cronos-theme', theme);
    iconMoon.style.display = theme === 'dark' ? 'block' : 'none';
    iconSun.style.display = theme === 'light' ? 'block' : 'none';
  }

  themeToggle.addEventListener('click', () => {
    const current = document.body.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  });

  // ---------- mode switch ----------
  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      modeButtons.forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      mode = btn.dataset.mode;
      timeInputLabel.textContent = mode === 'bedtime' ? 'Hora en que te acuestas' : 'Hora a la que necesitas despertar';
      resultsSection.hidden = true;
    });
  });

  // ---------- fall asleep slider ----------
  fallAsleep.addEventListener('input', () => {
    fallAsleepValue.textContent = `${fallAsleep.value} min`;
  });

  // ---------- now button ----------
  nowBtn.addEventListener('click', () => {
    const now = new Date();
    timeInput.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  // ---------- time helpers ----------
  function parseTime(str) {
    const [h, m] = str.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }

  function formatTime(date) {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
  }

  function durationLabel(cycles) {
    const totalMin = cycles * CYCLE_MIN;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  }

  // ---------- calculation ----------
  function calculate() {
    if (!timeInput.value) {
      timeInput.focus();
      return;
    }

    const baseTime = parseTime(timeInput.value);
    const buffer = Number(fallAsleep.value);
    const results = [];

    for (let cycles = MIN_CYCLES; cycles <= MAX_CYCLES; cycles++) {
      let target;
      if (mode === 'bedtime') {
        target = addMinutes(baseTime, buffer + cycles * CYCLE_MIN);
      } else {
        target = addMinutes(baseTime, -(buffer + cycles * CYCLE_MIN));
      }
      results.push({ cycles, time: target, recommended: cycles === RECOMMENDED_CYCLES });
    }

    lastResults = { mode, baseTime, results, buffer };
    renderResults(lastResults);
    resultsSection.hidden = false;
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  calcBtn.addEventListener('click', calculate);

  // ---------- render results list ----------
  function renderResults(data) {
    resultsList.innerHTML = '';

    orbitCenterLabel.textContent = data.mode === 'bedtime' ? 'Te acuestas' : 'Despiertas';
    orbitCenterTime.textContent = formatTime(data.baseTime);

    data.results.forEach((r) => {
      const row = document.createElement('div');
      row.className = 'result-row' + (r.recommended ? ' recommended' : '');
      row.innerHTML = `
        <div class="result-left">
          <span class="result-cycles">${r.cycles} ciclos</span>
          <span class="result-duration">${durationLabel(r.cycles)} de sueño</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="result-time">${formatTime(r.time)}</span>
          ${r.recommended ? '<span class="result-tag">Óptimo</span>' : ''}
        </div>
      `;
      resultsList.appendChild(row);
    });

    renderOrbit(data);
  }

  // ---------- orbit visualization ----------
  function renderOrbit(data) {
    const svgNS = 'http://www.w3.org/2000/svg';
    orbitSvg.innerHTML = '';

    const cx = 240, cy = 240;
    const baseRadius = 70;
    const step = 28;
    const total = data.results.length;

    const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim();
    const border = getComputedStyle(document.body).getPropertyValue('--border').trim();
    const textSecondary = getComputedStyle(document.body).getPropertyValue('--text-secondary').trim();

    data.results.forEach((r, i) => {
      const radius = baseRadius + i * step;
      const circle = document.createElementNS(svgNS, 'circle');
      circle.setAttribute('cx', cx);
      circle.setAttribute('cy', cy);
      circle.setAttribute('r', radius);
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', r.recommended ? accent : border);
      circle.setAttribute('stroke-width', r.recommended ? 2 : 1);
      if (r.recommended) circle.setAttribute('stroke-dasharray', '4 5');
      orbitSvg.appendChild(circle);

      // angle: distribute around circle, offset by index for variety
      const angle = (-90 + i * (360 / total)) * (Math.PI / 180);
      const px = cx + radius * Math.cos(angle);
      const py = cy + radius * Math.sin(angle);

      const dot = document.createElementNS(svgNS, 'circle');
      dot.setAttribute('cx', px);
      dot.setAttribute('cy', py);
      dot.setAttribute('r', r.recommended ? 6 : 4);
      dot.setAttribute('fill', r.recommended ? accent : textSecondary);
      orbitSvg.appendChild(dot);

      if (r.recommended) {
        const glow = document.createElementNS(svgNS, 'circle');
        glow.setAttribute('cx', px);
        glow.setAttribute('cy', py);
        glow.setAttribute('r', 11);
        glow.setAttribute('fill', accent);
        glow.setAttribute('opacity', '0.25');
        orbitSvg.insertBefore(glow, dot);
      }
    });
  }

  // ---------- export ----------
  function buildExportCanvas(data) {
    const exportMainLabel = el('exportMainLabel');
    const exportMainValue = el('exportMainValue');
    const exportOptions = el('exportOptions');

    const recommended = data.results.find((r) => r.recommended);

    exportMainLabel.textContent = data.mode === 'bedtime'
      ? 'Despierta a las (recomendado)'
      : 'Acuéstate a las (recomendado)';
    exportMainValue.textContent = formatTime(recommended.time);

    exportOptions.innerHTML = '';
    data.results.forEach((r) => {
      const row = document.createElement('div');
      row.className = 'export-row' + (r.recommended ? ' recommended' : '');
      row.innerHTML = `
        <span style="font-size:0.85rem; color: var(--text-secondary);">${r.cycles} ciclos · ${durationLabel(r.cycles)}</span>
        <span style="font-family: var(--font-display); font-size:1.1rem; font-weight:600;">${formatTime(r.time)}</span>
      `;
      exportOptions.appendChild(row);
    });
  }

  async function exportAsImage() {
    if (!lastResults) return;
    buildExportCanvas(lastResults);
    const node = el('exportCanvas');
    node.style.top = '0';
    node.style.left = '0';
    node.style.zIndex = '-1';

    const canvas = await html2canvas(node, { scale: 2, backgroundColor: getComputedStyle(document.body).getPropertyValue('--bg').trim() });
    node.style.top = '-9999px';
    node.style.left = '-9999px';

    const link = document.createElement('a');
    link.download = 'cronos-plan-sueno.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  async function exportAsPdf() {
    if (!lastResults) return;
    buildExportCanvas(lastResults);
    const node = el('exportCanvas');
    node.style.top = '0';
    node.style.left = '0';
    node.style.zIndex = '-1';

    const canvas = await html2canvas(node, { scale: 2, backgroundColor: getComputedStyle(document.body).getPropertyValue('--bg').trim() });
    node.style.top = '-9999px';
    node.style.left = '-9999px';

    const { jsPDF } = window.jspdf;
    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = 210;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
    pdf.save('cronos-plan-sueno.pdf');
  }

  exportImgBtn.addEventListener('click', exportAsImage);
  exportPdfBtn.addEventListener('click', exportAsPdf);

  // ---------- init ----------
  initTheme();
})();
