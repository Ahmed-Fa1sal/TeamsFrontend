import gsap from 'gsap';

/**
 * True when the OS/browser has prefers-reduced-motion set.
 * Evaluated once at module load — safe because it never changes at runtime.
 */
export const REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Animates a page's entry using scoped DOM queries so no other page's
 * elements are accidentally targeted.
 *
 * Targeted CSS classes:
 *   .animate-header  — page title / welcome banner
 *   .animate-card    — content cards
 *   .animate-row     — table rows / list items
 *
 * Call AFTER data has loaded (skeletons handle the wait state).
 */
export function animatePageEntrance(scope: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();

  const headers = gsap.utils.toArray<HTMLElement>('.animate-header', scope);
  const cards   = gsap.utils.toArray<HTMLElement>('.animate-card',   scope);
  const rows    = gsap.utils.toArray<HTMLElement>('.animate-row',    scope);

  // In reduced-motion mode snap everything to its final state immediately
  if (REDUCED_MOTION) {
    const all = [...headers, ...cards, ...rows];
    if (all.length) gsap.set(all, { opacity: 1, y: 0, x: 0, scale: 1 });
    return tl;
  }

  // Set initial invisible state synchronously to prevent a FOUC frame
  if (headers.length) gsap.set(headers, { opacity: 0, y: -24 });
  if (cards.length)   gsap.set(cards,   { opacity: 0, y: 32, scale: 0.97 });
  if (rows.length)    gsap.set(rows,    { opacity: 0, x: -16 });

  if (headers.length) {
    tl.to(headers, {
      opacity: 1, y: 0,
      duration: 0.5, ease: 'power3.out'
    });
  }

  if (cards.length) {
    tl.to(cards, {
      opacity: 1, y: 0, scale: 1,
      duration: 0.45, ease: 'power3.out',
      stagger: 0.08
    }, headers.length ? '-=0.25' : undefined);
  }

  if (rows.length) {
    tl.to(rows, {
      opacity: 1, x: 0,
      duration: 0.35, ease: 'power2.out',
      stagger: 0.05
    }, cards.length ? '-=0.3' : undefined);
  }

  return tl;
}

/**
 * Animates stat/count cards with a count-up number effect.
 *
 * Targeted CSS classes:
 *   .stat-card    — the stat card wrapper
 *   .stat-value   — the numeric text element inside each card
 */
export function animateStatCards(scope: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();
  const cards = gsap.utils.toArray<HTMLElement>('.stat-card', scope);

  if (!cards.length) return tl;

  if (REDUCED_MOTION) {
    gsap.set(cards, { opacity: 1, y: 0, scale: 1 });
    return tl;
  }

  gsap.set(cards, { opacity: 0, y: 20, scale: 0.95 });

  tl.to(cards, {
    opacity: 1, y: 0, scale: 1,
    duration: 0.5, ease: 'back.out(1.4)',
    stagger: 0.1,
    delay: 0.2
  });

  // Animate numeric count-up for each .stat-value child
  cards.forEach(card => {
    const valEl = card.querySelector<HTMLElement>('.stat-value');
    if (!valEl) return;
    const finalVal = parseFloat(valEl.textContent ?? '0');
    if (isNaN(finalVal) || finalVal === 0) return;

    valEl.textContent = '0';
    tl.to(valEl, {
      textContent: finalVal,
      duration: 0.8,
      ease: 'power1.out',
      snap: { textContent: 1 }
    }, '<+=0.1');
  });

  return tl;
}

/**
 * Quick fade+slide for rows inserted after a search or filter update.
 * Does NOT kill or overlap the main page-entrance timeline.
 */
export function animateListUpdate(rows: HTMLElement[]): void {
  if (REDUCED_MOTION || !rows.length) return;
  gsap.fromTo(
    rows,
    { opacity: 0, y: 12 },
    { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out', stagger: 0.04 }
  );
}
