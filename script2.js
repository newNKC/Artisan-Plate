const navToggle = document.querySelector('.nav-toggle');
const navList = document.querySelector('.nav-list');
if (navToggle) {
  navToggle.addEventListener('click', () => {
    const open = navList.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}

(function typewriter(){
  const el = document.querySelector('.type');
  if(!el) return;
  const words = JSON.parse(el.getAttribute('data-words') || '[]');
  let i = 0, j = 0, deleting = false;

  function tick(){
    const word = words[i % words.length] || '';
    el.textContent = deleting ? word.slice(0, j--) : word.slice(0, j++);
    if(!deleting && j > word.length + 6){ deleting = true; }
    if(deleting && j < 0){ deleting = false; i++; }
    setTimeout(tick, deleting ? 40 : 80);
  }
  tick();
})();

const observer = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting){ e.target.classList.add('visible'); }
  });
},{ threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

const teaser = document.getElementById('teaserVideo');
const openBtn = document.getElementById('openIntro');
const modal = document.getElementById('videoModal');
const closeBtn = document.getElementById('closeVideo');
const intro = document.getElementById('introVideo');

function openVideoWithSound(){
  
  if (!intro.src) intro.src = 'assets/intro.mp4';

  try { if (teaser?.currentTime) intro.currentTime = teaser.currentTime; } catch(e){}

  intro.muted = false;
  intro.play().catch(()=>{});

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeVideo(){
  intro.pause();
  
  intro.removeAttribute('src'); intro.load();
  modal.classList.remove('open');
  document.body.style.overflow = '';
}
