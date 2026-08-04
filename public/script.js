/**
 * ============================================================
 *  CONVITE DE CASAMENTO PREMIUM — script.js
 *
 *  Módulos:
 *   1. Inicialização de conteúdo dinâmico (config.js)
 *   2. Pétalas caindo (Canvas API)
 *   3. Partículas douradas (Particles.js)
 *   4. Sequência de abertura do envelope (GSAP + Anime.js)
 *   5. Contador regressivo
 *   6. Controle de música
 *   7. Galeria e Lightbox
 *   8. Google Calendar link builder
 *   9. Parallax sutil
 * ============================================================
 */

'use strict';

/* ============================================================
   ESTADO GLOBAL
   ============================================================ */
let envelopeOpened  = false;
let musicPlaying    = false;
let currentPhoto    = 0;
let petalsAnimId    = null;

/* ============================================================
   1. PONTO DE ENTRADA
   ============================================================ */
window.initOldConvite = () => {
  fillContent();
  initPetals();
  initParticles();
  initCountdown();
  // initEnvelope();
  initMusicButton();
  initLightbox();
  initPixModal();
    startMusic(); // added for react
};

/* ============================================================
   2. PREENCHIMENTO DINÂMICO COM config.js
   ============================================================ */
function fillContent() {
  /* Nomes */
  document.getElementById('bride-name').textContent  = wedding.bride;
  document.getElementById('groom-name').textContent  = wedding.groom;
  document.getElementById('footer-bride').textContent = wedding.bride;
  document.getElementById('footer-groom').textContent = wedding.groom;
  document.getElementById('footer-date').textContent  = wedding.dateShort;

  /* Versículo */
  document.getElementById('verse-text').innerHTML =
    wedding.verse.text.replace(/\n/g, '<br>');
  document.getElementById('verse-ref').textContent = wedding.verse.reference;

  /* Cards de informação */
  document.getElementById('info-date').innerHTML =
    `${wedding.date}<br><em>${wedding.day}</em>`;
  document.getElementById('info-time').innerHTML =
    `Cerimônia às ${wedding.time}`;
  document.getElementById('info-ceremony').innerHTML =
    `${wedding.ceremony.name}<br><em>${wedding.ceremony.address}</em>`;
  document.getElementById('info-reception').innerHTML =
    wedding.reception.description.replace(/\n/g, '<br>');
  document.getElementById('info-dress').textContent   = wedding.dresscode;
  document.getElementById('info-parking').textContent = wedding.parking;

  /* Links dos botões */
  document.getElementById('btn-rsvp').href     = wedding.rsvp;
  document.getElementById('btn-maps').href     = wedding.maps;
  document.getElementById('gifts-list-link').href = wedding.gifts;
  document.getElementById('btn-calendar').href = buildCalendarUrl();

  /* Foto do casal */
  const photo = document.getElementById('couple-photo');
  photo.src = wedding.couplePhoto.src;
  photo.alt = wedding.couplePhoto.alt;

  /* Timeline */
  buildTimeline();

  /* Galeria */
  buildGallery();

  /* Pix */
  document.getElementById('pix-key-text').textContent = wedding.pix.key;
  document.getElementById('pix-name-text').textContent = wedding.pix.name;
  document.getElementById('pix-qr-img').src = wedding.pix.qrCode;
}

/* ============================================================
   3. TIMELINE
   ============================================================ */
function buildTimeline() {
  const container = document.getElementById('timeline');

  wedding.timeline.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'timeline-item';
    el.setAttribute('data-aos', 'fade-up');
    el.setAttribute('data-aos-delay', i * 90);

    el.innerHTML = `
      <div class="tl-content">
        ${item.time ? `<div class="tl-time">${item.time}</div>` : ""}
        <div class="tl-event">${item.event}</div>
      </div>
      <div class="tl-dot">
        <div class="tl-dot-outer">
          <div class="tl-dot-inner">
            <i class="fas ${item.icon}" aria-hidden="true"></i>
          </div>
        </div>
      </div>
      <div class="tl-spacer"></div>
    `;
    container.appendChild(el);
  });
}

/* ============================================================
   4. GALERIA
   ============================================================ */
function buildGallery() {
  const grid = document.getElementById('gallery-grid');

  wedding.photos.forEach((photo, i) => {
    const item = document.createElement('div');
    
    // Define a classe de layout com base no índice para criar o álbum editorial
    let layoutClass = 'gallery-item-side';
    if (i === 0) layoutClass = 'gallery-item-hero';
    if (i === 3) layoutClass = 'gallery-item-detail';

    item.className = `gallery-item ${layoutClass}`;
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', `Ver foto: ${photo.alt}`);
    item.setAttribute('data-aos', 'fade-up');
    item.setAttribute('data-aos-delay', i * 110);
    item.dataset.index = i;

    // Container da foto (para animação de zoom discreta)
    const photoBox = document.createElement('div');
    photoBox.className = 'gallery-photo-box';

    const img = document.createElement('img');
    img.src     = photo.src;
    img.alt     = photo.alt;
    img.loading = 'lazy';
    photoBox.appendChild(img);
    item.appendChild(photoBox);

    // Legenda estruturada (Linha do Tempo / Anotações de Álbum)
    if (photo.caption) {
      const captionWrapper = document.createElement('div');
      captionWrapper.className = 'gallery-caption-wrapper';

      const mainCaption = document.createElement('span');
      mainCaption.className = 'gallery-date-caption';
      mainCaption.textContent = photo.caption;
      captionWrapper.appendChild(mainCaption);

      if (photo.sub) {
        const subCaption = document.createElement('span');
        subCaption.className = 'gallery-sub-caption';
        subCaption.textContent = photo.sub;
        captionWrapper.appendChild(subCaption);
      }

      item.appendChild(captionWrapper);
    }

    grid.appendChild(item);

    const open = () => openLightbox(i);
    item.addEventListener('click', open);
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });
}

/* ============================================================
   5. GOOGLE CALENDAR URL
   ============================================================ */
function buildCalendarUrl() {
  const { calendar, dateISO, time } = wedding;

  /* Converte "16h30" → "163000" */
  const clean    = time.replace('h', '').replace(':', '');
  const hh       = clean.slice(0, 2).padStart(2, '0');
  const mm       = (clean.slice(2) || '00').padStart(2, '0');
  const dateStr  = dateISO.replace(/-/g, '');
  const startDT  = `${dateStr}T${hh}${mm}00`;

  /* Evento termina 5 horas depois */
  const endHour  = String(parseInt(hh, 10) + 5).padStart(2, '0');
  const endDT    = `${dateStr}T${endHour}${mm}00`;

  const params = new URLSearchParams({
    action:   'TEMPLATE',
    text:     calendar.title,
    dates:    `${startDT}/${endDT}`,
    details:  calendar.details,
    location: calendar.location,
  });

  return `https://www.google.com/calendar/render?${params}`;
}

/* ============================================================
   6. CONTADOR REGRESSIVO
   ============================================================ */
function initCountdown() {
  const ids = ['cd-days', 'cd-hours', 'cd-minutes', 'cd-seconds'];

  const update = () => {
    const diff = wedding.dateObj - new Date();

    if (diff <= 0) {
      ids.forEach(id => setNum(id, 0));
      clearInterval(handle);
      return;
    }

    const days    = Math.floor(diff / 86400000);
    const hours   = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000)  / 60000);
    const seconds = Math.floor((diff % 60000)    / 1000);

    setNum('cd-days',    days);
    setNum('cd-hours',   hours);
    setNum('cd-minutes', minutes);
    setNum('cd-seconds', seconds);
  };

  function setNum(id, val) {
    const el  = document.getElementById(id);
    if (!el) return;
    const str = String(val).padStart(2, '0');
    if (el.textContent !== str) {
      el.classList.remove('flipping');
      /* força reflow para reiniciar animação */
      void el.offsetWidth;
      el.classList.add('flipping');
      el.textContent = str;
    }
  }

  update();
  const handle = setInterval(update, 1000);
}

/* ============================================================
   7. PÉTALAS CAINDO — Canvas
   ============================================================ */
function initPetals() {
  const canvas = document.getElementById('petals-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const COLORS = ['#F2D4D7', '#F7E7CE', '#FAF0E6', '#E8C0C5', '#FBF1E2', '#EDD8B5'];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  class Petal {
    constructor(init = false) { this.reset(init); }

    reset(init = false) {
      this.x        = Math.random() * canvas.width;
      this.y        = init ? Math.random() * canvas.height : -20;
      this.size     = Math.random() * 8 + 4;
      this.speedY   = Math.random() * 0.75 + 0.28;
      this.drift    = Math.random() * 0.5 - 0.25;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpd   = (Math.random() - 0.5) * 0.022;
      this.opacity  = Math.random() * 0.32 + 0.08;
      this.phase    = Math.random() * Math.PI * 2;
      this.phSpd    = Math.random() * 0.014 + 0.007;
      this.color    = COLORS[Math.floor(Math.random() * COLORS.length)];
    }

    update() {
      this.phase    += this.phSpd;
      this.x        += Math.sin(this.phase) * 0.65 + this.drift;
      this.y        += this.speedY;
      this.rotation += this.rotSpd;
      if (this.y > canvas.height + 22) this.reset();
    }

    draw() {
      const s = this.size;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      /* Forma de pétala com curvas de Bézier */
      ctx.moveTo(0, -s);
      ctx.bezierCurveTo( s * 0.72, -s * 0.55,  s * 0.82, s * 0.28, 0,  s * 0.88);
      ctx.bezierCurveTo(-s * 0.82,  s * 0.28, -s * 0.72, -s * 0.55, 0, -s);
      ctx.fill();
      ctx.restore();
    }
  }

  /* 22 pétalas para boa performance */
  const petals = Array.from({ length: 22 }, () => new Petal(true));

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    petals.forEach(p => { p.update(); p.draw(); });
    petalsAnimId = requestAnimationFrame(loop);
  }
  loop();
}

/* ============================================================
   8. PARTÍCULAS — Particles.js
   ============================================================ */
function initParticles() {
  if (typeof particlesJS === 'undefined') return;

  particlesJS('particles-js', {
    particles: {
      number: { value: 35, density: { enable: true, value_area: 1000 } },
      color: { value: '#D9C49B' },
      shape: { type: 'circle' },
      opacity: {
        value: 0.18,
        random: true,
        anim: { enable: true, speed: 0.2, opacity_min: 0.02, sync: false }
      },
      size: {
        value: 1.8,
        random: true,
        anim: { enable: true, speed: 0.4, size_min: 0.2, sync: false }
      },
      line_linked: { enable: false },
      move: {
        enable: true,
        speed: 0.18,
        direction: 'none',
        random: true,
        straight: false,
        out_mode: 'out',
        bounce: false
      }
    },
    interactivity: {
      detect_on: 'canvas',
      events: { onhover: { enable: false }, onclick: { enable: false }, resize: true }
    },
    retina_detect: true
  });
}

function initInvParticles() {
  if (typeof particlesJS === 'undefined') return;

  particlesJS('inv-particles', {
    particles: {
      number: { value: 28, density: { enable: true, value_area: 1200 } },
      color: { value: ['#C9A84C', '#F2D4D7', '#FAF7F2'] },
      shape: { type: 'circle' },
      opacity: {
        value: 0.12,
        random: true,
        anim: { enable: true, speed: 0.25, opacity_min: 0.02, sync: false }
      },
      size: {
        value: 2.8,
        random: true,
        anim: { enable: false }
      },
      line_linked: { enable: false },
      move: {
        enable: true,
        speed: 0.28,
        direction: 'top',
        random: true,
        straight: false,
        out_mode: 'out',
        bounce: false
      }
    },
    interactivity: {
      events: { onhover: { enable: false }, onclick: { enable: false }, resize: true }
    },
    retina_detect: true
  });
}

/* ============================================================
   9. INTERAÇÃO COM O ENVELOPE
   ============================================================ */
function initEnvelope() {
  const envelope    = document.getElementById('envelope');
  const sealWrapper = document.getElementById('seal-wrapper');

  const trigger = () => {
    if (envelopeOpened) return;
    envelopeOpened = true;
    runOpeningSequence();
  };

  sealWrapper.addEventListener('click', (e) => { e.stopPropagation(); trigger(); });
  envelope.addEventListener('click', trigger);
  envelope.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trigger(); }
  });
}

/* ============================================================
   9.1 SEQUÊNCIA DE ABERTURA — GSAP + Anime.js
   ============================================================ */
function runOpeningSequence() {
  const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' } });

  /* Fase 0 — Para animação de flutuação e esconde a dica */
  gsap.set('#envelope', { animation: 'none' });
  tl.to('#open-hint', { opacity: 0, y: 8, duration: 0.35, ease: 'power2.out' }, 0);

  /* Fase 0.5 — Compressão da cera (toque físico do carimbo/clique) */
  tl.to('#seal-wrapper', { scale: 0.94, duration: 0.15, ease: 'power2.inOut' }, 0.1);

  /* Fase 1 — Tremor do selo (anticipação) */
  tl.to('#seal-wrapper', { x: -5, duration: 0.07, ease: 'power1.inOut' });
  tl.to('#seal-wrapper', { x:  5, duration: 0.07, ease: 'power1.inOut' });
  tl.to('#seal-wrapper', { x: -3, duration: 0.07, ease: 'power1.inOut' });
  tl.to('#seal-wrapper', { x:  3, duration: 0.07, ease: 'power1.inOut' });
  tl.to('#seal-wrapper', { x:  0, duration: 0.06, ease: 'power1.inOut' });

  /* Fase 2 — Rachaduras na cera via Anime.js */
  tl.call(() => animateCracks());

  /* Fase 3 — Fragmentos voam para fora */
  tl.call(() => shatterSeal(), null, '+=0.45');

  tl.to('#seal-wrapper', {
    scale: 1.18,
    opacity: 0,
    duration: 0.38,
    ease: 'back.in(2)'
  }, '-=0.05');

  /* Fase 4 — Aba do envelope abre */
  tl.to('#env-card-preview', {
    opacity: 1, duration: 0.5, ease: 'power2.out'
  }, '-=0.15');

  tl.to('#env-flap', {
    rotateX: -172,
    duration: 1.65,
    ease: 'power2.inOut',
    transformOrigin: '50% 0%'
  }, '-=0.1');

  /* Fase 5 — Cartão desliza para cima */
  tl.to('#env-card-preview', {
    y: '-200%',
    duration: 1.0,
    ease: 'expo.out'
  }, '-=0.4');

  /* Fase 6 — Zoom da câmera (cena inteira) */
  tl.to('#envelope-scene', {
    scale: 3.2,
    opacity: 0,
    duration: 1.1,
    ease: 'power3.in',
    transformOrigin: 'center center'
  }, '-=0.15');

  /* Fase 7 — Exibe tela do convite */
  tl.call(() => {
    const inv = document.getElementById('invitation-screen');
    inv.style.display = 'block';
    startMusic();

    /* Init AOS */
    AOS.init({
      once: true,
      offset: 70,
      duration: 850,
      easing: 'ease-out-cubic',
      delay: 0
    });

    /* Partículas sutis no convite */
    initInvParticles();
  }, null, '-=0.45');

  tl.to('#invitation-screen', {
    opacity: 1,
    duration: 0.85,
    ease: 'power2.out'
  }, '-=0.3');

  /* Fase 8 — Fecha tela do envelope */
  tl.to('#envelope-screen', {
    opacity: 0,
    duration: 0.5,
    onComplete: () => {
      document.getElementById('envelope-screen').style.display = 'none';
      if (petalsAnimId) cancelAnimationFrame(petalsAnimId);
    }
  }, '-=0.5');
}

/* ============================================================
   9.2 RACHADURAS NA CERA — Anime.js
   ============================================================ */
function animateCracks() {
  const crackSvg = document.getElementById('crack-svg');
  crackSvg.style.opacity = '1';

  const paths = crackSvg.querySelectorAll('path');
  paths.forEach(p => {
    const len = p.getTotalLength ? p.getTotalLength() : 70;
    p.style.strokeDasharray  = `0 ${len}`;
    p.style.strokeDashoffset = '0';
  });

  anime({
    targets: paths,
    strokeDasharray: (el) => {
      const len = el.getTotalLength ? el.getTotalLength() : 70;
      return [`0 ${len}`, `${len} 0`];
    },
    duration: 380,
    easing:   'easeOutExpo',
    delay:    anime.stagger(42)
  });
}

/* ============================================================
   9.3 FRAGMENTAÇÃO DO SELO
   ============================================================ */
function shatterSeal() {
  const wrapper = document.getElementById('seal-wrapper');
  const rect    = wrapper.getBoundingClientRect();
  const cx      = rect.left + rect.width  / 2;
  const cy      = rect.top  + rect.height / 2;

  const colors = ['#9A3A52', '#B76E79', '#6B2D3E', '#CE8A9C', '#3D1525', '#A85060'];
  const PIECES  = 12;

  for (let i = 0; i < PIECES; i++) {
    const angle  = (Math.PI * 2 / PIECES) * i + (Math.random() - 0.5) * 0.5;
    const size   = 6 + Math.random() * 18;
    const radius = [' 50%', ' 20% 80% 20% 80%', ' 30% 70% 70% 30%'];
    const br     = radius[Math.floor(Math.random() * radius.length)];

    const frag = document.createElement('div');
    Object.assign(frag.style, {
      position:     'fixed',
      width:        `${size}px`,
      height:       `${size}px`,
      left:         `${cx - size / 2}px`,
      top:          `${cy - size / 2}px`,
      background:   colors[Math.floor(Math.random() * colors.length)],
      borderRadius: br,
      zIndex:       '99999',
      pointerEvents:'none',
      boxShadow:    '0 2px 8px rgba(0,0,0,0.35)'
    });
    document.body.appendChild(frag);

    const dist = 65 + Math.random() * 85;
    gsap.to(frag, {
      x:        Math.cos(angle) * dist,
      y:        Math.sin(angle) * dist,
      rotation: Math.random() * 720 - 360,
      scale:    Math.random() * 0.4 + 0.1,
      opacity:  0,
      duration: 0.55 + Math.random() * 0.3,
      ease:     'power2.out',
      onComplete: () => frag.remove()
    });
  }
}

/* ============================================================
   10. MÚSICA
   ============================================================ */
function initMusicButton() {
  document.getElementById('music-btn').addEventListener('click', () => {
    musicPlaying ? pauseMusic() : startMusic();
  });
}

function startMusic() {
  const audio = document.getElementById('bg-music');
  if (!audio.src || audio.src === window.location.href) return;
  audio.play()
    .then(() => { musicPlaying = true; syncMusicIcon(); })
    .catch(() => { /* autoplay bloqueado */ });
}

function pauseMusic() {
  const audio = document.getElementById('bg-music');
  audio.pause();
  musicPlaying = false;
  syncMusicIcon();
}

function syncMusicIcon() {
  const icon = document.getElementById('music-icon');
  const btn  = document.getElementById('music-btn');
  icon.className = musicPlaying ? 'fas fa-volume-high' : 'fas fa-volume-xmark';
  btn.setAttribute('aria-pressed', musicPlaying ? 'true' : 'false');
}

/* ============================================================
   11. LIGHTBOX
   ============================================================ */
function initLightbox() {
  document.getElementById('lb-close')   .addEventListener('click', closeLightbox);
  document.getElementById('lightbox-backdrop').addEventListener('click', closeLightbox);
  document.getElementById('lb-prev')    .addEventListener('click', prevPhoto);
  document.getElementById('lb-next')    .addEventListener('click', nextPhoto);

  document.addEventListener('keydown', (e) => {
    const lb = document.getElementById('lightbox');
    if (lb.hasAttribute('hidden')) return;
    if (e.key === 'Escape')      closeLightbox();
    if (e.key === 'ArrowLeft')   prevPhoto();
    if (e.key === 'ArrowRight')  nextPhoto();
  });

  /* Swipe touch */
  let touchX = 0;
  const lb = document.getElementById('lightbox');
  lb.addEventListener('touchstart', e => { touchX = e.changedTouches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    const delta = e.changedTouches[0].clientX - touchX;
    if (Math.abs(delta) > 50) delta < 0 ? nextPhoto() : prevPhoto();
  }, { passive: true });
}

function openLightbox(index) {
  currentPhoto = index;
  const lb = document.getElementById('lightbox');
  showLbPhoto(index);
  lb.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
  gsap.fromTo('#lightbox-inner',
    { scale: 0.88, opacity: 0 },
    { scale: 1,    opacity: 1, duration: 0.38, ease: 'back.out(1.3)' }
  );
}

function closeLightbox() {
  gsap.to('#lightbox-inner', {
    scale: 0.88, opacity: 0, duration: 0.24, ease: 'power2.in',
    onComplete: () => {
      document.getElementById('lightbox').setAttribute('hidden', '');
      document.body.style.overflow = '';
    }
  });
}

function prevPhoto() {
  currentPhoto = (currentPhoto - 1 + wedding.photos.length) % wedding.photos.length;
  showLbPhoto(currentPhoto);
}

function nextPhoto() {
  currentPhoto = (currentPhoto + 1) % wedding.photos.length;
  showLbPhoto(currentPhoto);
}

function showLbPhoto(i) {
  const img = document.getElementById('lb-img');
  gsap.to(img, {
    opacity: 0, duration: 0.18,
    onComplete: () => {
      const p = wedding.photos[i];
      img.src = p.src;
      img.alt = p.alt;
      gsap.to(img, { opacity: 1, duration: 0.28 });
    }
  });
}

/* ============================================================
   12. PARALLAX SUTIL NO SCROLL
   ============================================================ */
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  const img = document.getElementById('couple-photo');
  if (img) img.style.transform = `translateY(${y * 0.045}px)`;
}, { passive: true });

/* ============================================================
   13. MODAL PIX
   ============================================================ */
function initPixModal() {
  const btnGifts     = document.getElementById('btn-gifts');
  const btnClose     = document.getElementById('pix-modal-close');
  const backdrop     = document.getElementById('pix-modal-backdrop');
  const btnCopy      = document.getElementById('btn-copy-pix');

  if (!btnGifts) return;

  btnGifts.addEventListener('click', openPixModal);
  btnClose.addEventListener('click', closePixModal);
  backdrop.addEventListener('click', closePixModal);

  btnCopy.addEventListener('click', () => {
    const keyText = wedding.pix.key;
    navigator.clipboard.writeText(keyText)
      .then(() => {
        showCopyToast();
      })
      .catch(err => {
        console.error('Erro ao copiar chave: ', err);
      });
  });
}

function openPixModal() {
  const modal = document.getElementById('pix-modal');
  modal.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';

  gsap.fromTo('#pix-modal-wrapper',
    { scale: 0.88, opacity: 0 },
    { scale: 1,    opacity: 1, duration: 0.38, ease: 'back.out(1.3)' }
  );
}

function closePixModal() {
  gsap.to('#pix-modal-wrapper', {
    scale: 0.88, opacity: 0, duration: 0.24, ease: 'power2.in',
    onComplete: () => {
      document.getElementById('pix-modal').setAttribute('hidden', '');
      document.body.style.overflow = '';
    }
  });
}

function showCopyToast() {
  const toast = document.getElementById('copy-toast');
  const icon = document.querySelector('#btn-copy-pix i');
  
  // Feedback visual temporário no botão
  icon.className = 'fas fa-check';
  setTimeout(() => { icon.className = 'far fa-copy'; }, 2000);

  // Exibe o Toast animado
  toast.style.display = 'flex';
  gsap.fromTo(toast, 
    { y: 20, opacity: 0 },
    { y: 0,  opacity: 1, duration: 0.3, ease: 'power2.out' }
  );

  setTimeout(() => {
    gsap.to(toast, {
      opacity: 0,
      y: -10,
      duration: 0.3,
      onComplete: () => { toast.style.display = 'none'; }
    });
  }, 2000);
}
