/* Render the selected region of the current Pacto page into an attachment. */
function captureFeedbackRegion() {
  if (typeof window.html2canvas !== 'function') {
    return Promise.reject(new Error('Screenshot renderer is unavailable.'));
  }

  const overlay = document.createElement('dialog');
  overlay.className = 'feedback-capture';
  overlay.setAttribute('aria-labelledby', 'feedback-capture-title');
  overlay.innerHTML = `
    <div class="feedback-capture-toolbar">
      <div><strong id="feedback-capture-title">Отметить на экране</strong>
      <p class="muted" role="status">Протяните рамку вокруг нужной области.</p></div>
      <button type="button" data-capture-visible>Вся область</button>
      <button type="button" data-capture-cancel>Отмена</button>
    </div>
    <div class="feedback-capture-selection" hidden></div>`;
  document.body.append(overlay);

  return new Promise((resolve, reject) => {
    const selection = overlay.querySelector('.feedback-capture-selection');
    const status = overlay.querySelector('[role="status"]');
    const toolbar = overlay.querySelector('.feedback-capture-toolbar');
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;
    let start, pointerId, finished = false, rendering = false;

    function finish(file, error) {
      if (finished) return;
      finished = true;
      window.removeEventListener('resize', cancelOnResize);
      overlay.close();
      overlay.remove();
      if (error) reject(error);
      else resolve(file);
    }

    function cancel() { finish(null); }

    function cancelOnResize() {
      if (width !== document.documentElement.clientWidth || height !== document.documentElement.clientHeight) cancel();
    }

    function point(event) {
      return {
        x: Math.max(0, Math.min(width, Math.round(event.clientX))),
        y: Math.max(0, Math.min(height, Math.round(event.clientY)))
      };
    }

    function rectangle(end) {
      return {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width: Math.abs(start.x - end.x),
        height: Math.abs(start.y - end.y)
      };
    }

    async function renderRegion(region) {
      if (rendering) return;
      rendering = true;
      status.textContent = 'Создаём снимок…';
      overlay.querySelector('[data-capture-visible]').disabled = true;
      try {
        const canvas = await window.html2canvas(document.documentElement, {
          x: scrollX + region.x,
          y: scrollY + region.y,
          width: region.width,
          height: region.height,
          scale: Math.min(devicePixelRatio, 2, 2000 / Math.max(region.width, region.height)),
          ignoreElements: element => element.matches('dialog, .toast'),
          logging: false
        });
        const blob = await new Promise(resolveBlob => canvas.toBlob(resolveBlob, 'image/png'));
        if (!blob) throw new Error('Screenshot could not be encoded.');
        finish(new File([blob], 'Фрагмент экрана.png', { type: 'image/png' }));
      } catch (error) {
        finish(null, error);
      }
    }

    overlay.addEventListener('pointerdown', event => {
      if (rendering || event.button !== 0 || pointerId !== undefined || toolbar.contains(event.target)) return;
      start = point(event);
      pointerId = event.pointerId;
      overlay.setPointerCapture(pointerId);
    });
    overlay.addEventListener('pointermove', event => {
      if (event.pointerId !== pointerId) return;
      const region = rectangle(point(event));
      selection.hidden = false;
      Object.assign(selection.style, {
        left: region.x + 'px', top: region.y + 'px',
        width: region.width + 'px', height: region.height + 'px'
      });
    });
    overlay.addEventListener('pointerup', event => {
      if (event.pointerId !== pointerId) return;
      pointerId = undefined;
      const region = rectangle(point(event));
      if (region.width >= 8 && region.height >= 8) void renderRegion(region);
      else selection.hidden = true;
    });
    overlay.addEventListener('pointercancel', event => {
      if (event.pointerId !== pointerId) return;
      pointerId = undefined;
      selection.hidden = true;
    });
    overlay.querySelector('[data-capture-visible]').addEventListener('click', () => {
      void renderRegion({ x: 0, y: 0, width, height });
    });
    overlay.querySelector('[data-capture-cancel]').addEventListener('click', cancel);
    overlay.addEventListener('cancel', event => {
      event.preventDefault();
      cancel();
    });
    window.addEventListener('resize', cancelOnResize);
    overlay.showModal();
  });
}
