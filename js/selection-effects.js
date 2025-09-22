const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function bindChoiceCardEffects(){
  if (prefersReduced) return;
  const cards = document.querySelectorAll('.choice-card');
  cards.forEach((card) => {
    const handleMove = (event) => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      card.style.setProperty('--mx', `${x}px`);
      card.style.setProperty('--my', `${y}px`);
    };
    const reset = () => {
      card.style.removeProperty('--mx');
      card.style.removeProperty('--my');
    };
    card.addEventListener('pointermove', handleMove, { passive: true });
    card.addEventListener('pointerleave', reset);
    card.addEventListener('blur', reset);
    card.addEventListener('focus', () => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${rect.width / 2}px`);
      card.style.setProperty('--my', `${rect.height / 2}px`);
    });
  });
}

function bindTitleTilt(){
  if (prefersReduced) return;
  const stage = document.querySelector('.selection-stage');
  const tiltTarget = stage ? stage.querySelector('[data-tilt]') : null;
  if (!stage || !tiltTarget) return;
  const maxTilt = 8;
  const handle = (event) => {
    const rect = stage.getBoundingClientRect();
    const relX = (event.clientX - rect.left) / rect.width;
    const relY = (event.clientY - rect.top) / rect.height;
    const rotateX = (0.5 - relY) * maxTilt;
    const rotateY = (relX - 0.5) * maxTilt;
    tiltTarget.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
  };
  const reset = () => {
    tiltTarget.style.transform = '';
  };
  stage.addEventListener('pointermove', handle, { passive: true });
  stage.addEventListener('pointerleave', reset);
}

bindChoiceCardEffects();
bindTitleTilt();
