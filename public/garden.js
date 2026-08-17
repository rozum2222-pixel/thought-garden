(() => {
  const canvas = document.querySelector('#garden');
  const ctx = canvas.getContext('2d');
  const composer = document.querySelector('#composer');
  const form = document.querySelector('#thoughtForm');
  const textarea = document.querySelector('#thought');
  const countEl = document.querySelector('#plantCount');
  const card = document.querySelector('#thoughtCard');
  const cardText = document.querySelector('#cardText');
  const cardDate = document.querySelector('#cardDate');
  const toast = document.querySelector('#toast');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const palettes = {
    warm: ['#ff8f70', '#ffc08c', '#e75452'],
    cool: ['#70d6c1', '#8ae8d5', '#318f83'],
    bright: ['#d7f66c', '#f3ffb1', '#91b83e'],
    quiet: ['#a995d8', '#d1c2f2', '#705fa0']
  };

  let width = 0;
  let height = 0;
  let dpr = 1;
  let audio = null;
  let soundOn = false;
  let mouse = { x: -1000, y: -1000 };
  let plants = loadPlants();
  let motes = [];
  let hovered = null;

  function loadPlants() {
    try { return JSON.parse(localStorage.getItem('thought-garden') || '[]'); }
    catch { return []; }
  }

  function savePlants() {
    localStorage.setItem('thought-garden', JSON.stringify(plants));
    updateCount();
  }

  function updateCount() {
    countEl.textContent = String(plants.length).padStart(2, '0');
  }

  function hash(text) {
    let h = 2166136261;
    for (const ch of text) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    return Math.abs(h);
  }

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    width = innerWidth;
    height = innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    motes = Array.from({ length: Math.max(24, Math.floor(width / 30)) }, (_, i) => ({
      x: (i * 97.3) % width,
      y: (i * 53.7) % height,
      r: .3 + (i % 4) * .25,
      phase: i * .8
    }));
  }

  function plantPosition(plant, index) {
    const seed = plant.seed || hash(plant.text);
    const lane = seed % 1000 / 1000;
    const x = width < 720
      ? 28 + lane * (width - 56)
      : width * .48 + lane * width * .48;
    const baseY = height * (.63 + ((seed >> 4) % 260) / 1000);
    const crowdOffset = (index % 4) * 12;
    return { x, y: Math.min(height - 36, baseY + crowdOffset) };
  }

  function drawPlant(plant, index, time) {
    const seed = plant.seed || hash(plant.text);
    const palette = palettes[plant.mood] || palettes.warm;
    const pos = plantPosition(plant, index);
    const age = Math.min(1, (Date.now() - plant.created) / 1600);
    const stemH = (58 + seed % 118) * (1 - Math.pow(1 - age, 3));
    const segments = 16;
    const sway = reducedMotion ? 0 : Math.sin(time * .00065 + seed) * 4;
    const near = Math.hypot(mouse.x - pos.x, mouse.y - (pos.y - stemH)) < 55;
    const lean = near ? (mouse.x - pos.x) * .035 : 0;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = near ? palette[1] : 'rgba(119, 151, 105, .72)';
    ctx.lineWidth = near ? 1.7 : 1.15;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    for (let s = 1; s <= segments; s++) {
      const p = s / segments;
      const x = pos.x + Math.sin(p * 3.2 + seed) * 2.2 * p + (sway + lean) * p * p;
      ctx.lineTo(x, pos.y - stemH * p);
    }
    ctx.stroke();

    for (let j = 3; j < segments - 2; j += 4) {
      const p = j / segments;
      const side = ((seed + j) % 2) ? 1 : -1;
      const sx = pos.x + Math.sin(p * 3.2 + seed) * 2.2 * p + (sway + lean) * p * p;
      const sy = pos.y - stemH * p;
      ctx.fillStyle = `${palette[2]}aa`;
      ctx.beginPath();
      ctx.ellipse(sx + side * 7, sy - 4, 8 * age, 2.8 * age, side * -.48, 0, Math.PI * 2);
      ctx.fill();
    }

    const bloomX = pos.x + Math.sin(3.2 + seed) * 2.2 + sway + lean;
    const bloomY = pos.y - stemH;
    const petals = 4 + seed % 6;
    const pulse = 1 + (reducedMotion ? 0 : Math.sin(time * .0013 + seed) * .08);
    ctx.shadowBlur = near ? 28 : 14;
    ctx.shadowColor = palette[0];
    for (let p = 0; p < petals; p++) {
      const angle = p / petals * Math.PI * 2 + time * (reducedMotion ? 0 : .00004) * ((seed % 2) ? 1 : -1);
      ctx.fillStyle = p % 2 ? palette[0] : palette[1];
      ctx.beginPath();
      ctx.ellipse(
        bloomX + Math.cos(angle) * 7 * age,
        bloomY + Math.sin(angle) * 7 * age,
        (5 + seed % 4) * age * pulse,
        2.1 * age,
        angle,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#f4ffd0';
    ctx.beginPath();
    ctx.arc(bloomX, bloomY, 2.4 * age, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    return { plant, x: bloomX, y: bloomY, radius: 34 };
  }

  function draw(time = 0) {
    ctx.clearRect(0, 0, width, height);
    const glow = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 260);
    glow.addColorStop(0, 'rgba(100, 152, 112, .075)');
    glow.addColorStop(1, 'rgba(7, 18, 15, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    for (const mote of motes) {
      const drift = reducedMotion ? 0 : Math.sin(time * .00025 + mote.phase) * 10;
      ctx.fillStyle = `rgba(215, 246, 108, ${.08 + mote.r * .035})`;
      ctx.beginPath();
      ctx.arc(mote.x + drift, mote.y + Math.cos(time * .00018 + mote.phase) * 7, mote.r, 0, Math.PI * 2);
      ctx.fill();
    }

    hovered = null;
    plants.forEach((plant, i) => {
      const hit = drawPlant(plant, i, time);
      if (Math.hypot(mouse.x - hit.x, mouse.y - hit.y) < hit.radius) hovered = hit;
    });
    canvas.style.cursor = hovered ? 'pointer' : 'crosshair';
    requestAnimationFrame(draw);
  }

  function showThought(plant) {
    cardText.textContent = plant.text;
    cardDate.textContent = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }).format(plant.created);
    card.classList.add('visible');
    tone(420 + (plant.seed % 220), .8);
  }

  function tone(frequency, duration = .35) {
    if (!soundOn || !audio) return;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.045, audio.currentTime + .04);
    gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + duration);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration);
  }

  document.querySelector('#openComposer').addEventListener('click', () => {
    composer.showModal();
    setTimeout(() => textarea.focus(), 100);
  });

  textarea.addEventListener('input', () => document.querySelector('#charCount').textContent = textarea.value.length);

  form.addEventListener('submit', event => {
    const submitter = event.submitter;
    if (submitter?.value === 'cancel') return;
    event.preventDefault();
    const text = textarea.value.trim();
    if (!text) return;
    const mood = new FormData(form).get('mood');
    const plant = { text, mood, created: Date.now(), seed: hash(text + Date.now()) };
    plants.push(plant);
    savePlants();
    textarea.value = '';
    document.querySelector('#charCount').textContent = '0';
    composer.close();
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 1800);
    tone(330 + plant.seed % 180, 1.1);
  });

  canvas.addEventListener('pointermove', event => { mouse = { x: event.clientX, y: event.clientY }; });
  canvas.addEventListener('pointerleave', () => { mouse = { x: -1000, y: -1000 }; });
  canvas.addEventListener('click', () => { if (hovered) showThought(hovered.plant); });
  document.querySelector('#closeCard').addEventListener('click', () => card.classList.remove('visible'));

  document.querySelector('#soundToggle').addEventListener('click', async event => {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    await audio.resume();
    soundOn = !soundOn;
    event.currentTarget.setAttribute('aria-pressed', soundOn);
    event.currentTarget.setAttribute('aria-label', soundOn ? 'Вимкнути тихий звук' : 'Увімкнути тихий звук');
    document.querySelector('#soundLabel').textContent = soundOn ? 'тиша звучить' : 'увімкнути тишу';
    document.querySelector('.sound-icon').textContent = soundOn ? '∿' : '♪';
    if (soundOn) tone(392, .9);
  });

  document.querySelector('#clearGarden').addEventListener('click', () => {
    if (!plants.length) return;
    if (confirm('Справді прибрати всі думки з цього саду?')) {
      plants = [];
      savePlants();
      card.classList.remove('visible');
    }
  });

  addEventListener('resize', resize);
  resize();
  updateCount();
  requestAnimationFrame(draw);
})();
