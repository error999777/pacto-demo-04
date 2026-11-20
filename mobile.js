const compactSections = matchMedia('(max-width: 800px)');
const sectionsTrigger = $('#sections-toggle');
const sectionsPanel = $('#sections-panel');
const nativeSections = typeof sectionsPanel.showPopover === 'function';

function syncSections() {
  if (compactSections.matches && nativeSections) sectionsPanel.setAttribute('popover', 'auto');
  else sectionsPanel.removeAttribute('popover');
  sectionsPanel.hidden = compactSections.matches && !nativeSections;
  sectionsTrigger.setAttribute('aria-expanded', 'false');
}

function closeSections() {
  if (nativeSections) {
    if (sectionsPanel.matches(':popover-open')) sectionsPanel.hidePopover();
  } else {
    sectionsPanel.hidden = true;
    sectionsTrigger.setAttribute('aria-expanded', 'false');
  }
}

sectionsPanel.addEventListener('toggle', event => {
  if (compactSections.matches) sectionsTrigger.setAttribute('aria-expanded', String(event.newState === 'open'));
});
sectionsTrigger.addEventListener('click', () => {
  if (nativeSections) return;
  sectionsPanel.hidden = !sectionsPanel.hidden;
  sectionsTrigger.setAttribute('aria-expanded', String(!sectionsPanel.hidden));
});
sectionsPanel.addEventListener('click', event => {
  if (!compactSections.matches) return;
  const section = event.target.closest('#nav button');
  const feedback = event.target.closest('#feedback-toggle');
  if (!section && !feedback) return;
  closeSections();
  if (section) {
    requestAnimationFrame(() => {
      const heading = $('#app > h1');
      if (!heading) return;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    });
  }
}, true);
sectionsPanel.addEventListener('keydown', event => {
  if (nativeSections || !compactSections.matches || event.key !== 'Escape') return;
  closeSections();
  sectionsTrigger.focus();
});
compactSections.addEventListener('change', syncSections);
syncSections();
