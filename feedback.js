/* Feedback and original image attachments stay in this browser. */
const feedbackStorageKey = 'pacto-prototype-feedback';
const feedbackCategories = ['Предложить изменение', 'Что-то сломалось', 'Работает плохо', 'Другое'];
const feedbackImageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'];
const feedbackImageLimit = 6;
let feedbackDatabase;

function openFeedbackDatabase() {
  if (!feedbackDatabase) {
    feedbackDatabase = new Promise((resolve, reject) => {
      const request = indexedDB.open('pacto-feedback-images', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('messages', { keyPath: 'id' });
      request.onsuccess = () => {
        request.result.onversionchange = () => { request.result.close(); feedbackDatabase = null; };
        resolve(request.result);
      };
      request.onerror = () => { feedbackDatabase = null; reject(request.error); };
    });
  }
  return feedbackDatabase;
}

async function readFeedback() {
  const legacy = JSON.parse(localStorage.getItem(feedbackStorageKey) || '[]');
  const database = await openFeedbackDatabase();
  const stored = await new Promise((resolve, reject) => {
    const transaction = database.transaction('messages', 'readonly');
    const request = transaction.objectStore('messages').getAll();
    transaction.oncomplete = () => resolve(request.result);
    transaction.onabort = () => reject(transaction.error);
  });
  const messages = new Map((Array.isArray(legacy) ? legacy : []).map(item => [item.id, item]));
  stored.forEach(item => messages.set(item.id, item));
  return [...messages.values()].sort((first, second) => first.createdAt.localeCompare(second.createdAt));
}

async function saveFeedback(item) {
  const database = await openFeedbackDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction('messages', 'readwrite');
    transaction.objectStore('messages').add(item);
    transaction.oncomplete = resolve;
    transaction.onabort = () => reject(transaction.error);
  });
}

function feedbackContext() {
  const task = ['Карточка', 'Проверка', 'CRM'].includes(page) ? tasks.find(item => item.id === selected) : null;
  return { section: page, taskId: task?.id || null, taskTitle: task?.title || '' };
}

function feedbackText(item) {
  return `${item.category}\n${item.message}\n\nРаздел: ${item.context.section}${item.context.taskTitle ? '\nЗадача: ' + item.context.taskTitle : ''}${item.attachments?.length ? '\nВложения: ' + item.attachments.map(attachment => attachment.name).join(', ') : ''}\n${new Date(item.createdAt).toLocaleString('ru-RU')}`;
}

async function openFeedback(trigger) {
  if (document.querySelector('.feedback-dialog')) return;
  closeChoice();
  const context = feedbackContext();
  const dialog = document.createElement('dialog');
  const previousOverflow = document.body.style.overflow;
  const objectUrls = new Map();
  const attachments = [];
  let busy = false;
  dialog.className = 'feedback-dialog';
  dialog.setAttribute('aria-labelledby', 'feedback-title');
  document.body.append(dialog);
  let saved = [];
  let storageError = '';
  try { saved = await readFeedback(); }
  catch { storageError = 'Не удалось прочитать сохранённые отзывы. Попробуйте открыть окно ещё раз.'; }

  function imageUrl(attachment) {
    if (!objectUrls.has(attachment.id)) objectUrls.set(attachment.id, URL.createObjectURL(attachment.blob));
    return objectUrls.get(attachment.id);
  }
  function imageList(items, removable = false) {
    return `<div class="feedback-images">${items.map(attachment => `<figure><a href="${imageUrl(attachment)}" target="_blank" rel="noopener" aria-label="Открыть изображение ${esc(attachment.name)}"><img src="${imageUrl(attachment)}" alt="${esc(attachment.name)}"></a><figcaption title="${esc(attachment.name)}">${esc(attachment.name)}</figcaption>${removable ? `<button type="button" data-feedback-remove="${attachment.id}" aria-label="Удалить ${esc(attachment.name)}">×</button>` : ''}</figure>`).join('')}</div>`;
  }

  const header = '<div class="feedback-header"><h2 id="feedback-title">Обратная связь</h2><button type="button" data-feedback-close aria-label="Закрыть обратную связь">×</button></div>';
  dialog.innerHTML = `${header}<form id="feedback-form">
    <label>Тема отзыва<select name="category" required><option value="" disabled selected>Выберите тему</option>${feedbackCategories.map(category => `<option>${category}</option>`).join('')}</select></label>
    <label>Что произошло или что изменить<textarea name="message" required maxlength="3000" placeholder="Опишите ситуацию и какой результат вы ожидали"></textarea></label>
    <section class="feedback-attachments" aria-label="Изображения к отзыву">
      <div class="feedback-attachment-actions"><button type="button" data-feedback-attach>Прикрепить изображения</button><button type="button" data-feedback-capture>Отметить на экране</button></div>
      <input type="file" name="images" aria-label="Прикрепить изображения" accept="${feedbackImageTypes.join(',')}" multiple hidden>
      <p class="muted feedback-image-hint">До 6 изображений по 8 МБ. PNG, JPG, WebP, GIF или AVIF.</p>
      <div class="feedback-draft-images"></div>
      <p class="feedback-attachment-status muted" aria-live="polite"></p>
    </section>
    <p class="feedback-context"><strong>Раздел</strong> ${esc(context.section)}${context.taskTitle ? `<span>${esc(context.taskTitle)}</span>` : ''}</p>
    <p class="muted feedback-local-note">В макете отзыв и изображения сохраняются в этом браузере. Отправка команде появится при подключении сервиса.</p>
    <p class="form-error ${storageError ? '' : 'hidden'}" role="alert">${storageError}</p>
    <div class="feedback-footer"><button type="button" data-feedback-close>Отмена</button><button type="submit" class="primary">Сохранить отзыв</button></div>
  </form>
  ${saved.length ? `<details class="feedback-history"><summary>Сохранённые отзывы · ${saved.length}</summary><div>${[...saved].reverse().map(item => `<article><div class="row spread"><strong>${esc(item.category)}</strong><time>${new Date(item.createdAt).toLocaleString('ru-RU')}</time></div><p>${esc(item.message)}</p>${imageList(item.attachments || [])}<small>${esc(item.context.section)}${item.context.taskTitle ? ' · ' + esc(item.context.taskTitle) : ''}</small><button type="button" data-feedback-copy="${esc(item.id)}">Скопировать текст</button></article>`).join('')}</div></details>` : ''}
  <p class="feedback-copy-status muted" aria-live="polite"></p>`;
  const form = dialog.querySelector('form');
  const imageInput = form.elements.namedItem('images');
  const attachmentStatus = dialog.querySelector('.feedback-attachment-status');

  function showError(message) {
    const error = dialog.querySelector('[role="alert"]');
    error.textContent = message; error.classList.remove('hidden');
  }
  function updateControls() {
    dialog.querySelectorAll('[data-feedback-attach], [data-feedback-capture]').forEach(button => {
      button.disabled = busy || attachments.length >= feedbackImageLimit;
    });
    imageInput.disabled = busy;
    form.querySelector('[type="submit"]').disabled = busy;
    dialog.querySelectorAll('[data-feedback-remove]').forEach(button => { button.disabled = busy; });
  }
  function renderImages() {
    dialog.querySelector('.feedback-draft-images').innerHTML = imageList(attachments, true);
    attachmentStatus.textContent = attachments.length ? `Прикреплено ${attachments.length} из ${feedbackImageLimit}` : '';
    updateControls();
  }
  async function addImages(files) {
    if (attachments.length + files.length > feedbackImageLimit) {
      showError(`Можно прикрепить ещё ${feedbackImageLimit - attachments.length} изображений.`); return;
    }
    busy = true; updateControls();
    const failures = [];
    for (const file of files) {
      if (!feedbackImageTypes.includes(file.type)) { failures.push(`${file.name} — выберите PNG, JPG, WebP, GIF или AVIF.`); continue; }
      if (file.size > 8 * 1024 * 1024) { failures.push(`${file.name} — размер больше 8 МБ.`); continue; }
      const attachment = { id: crypto.randomUUID(), name: file.name, blob: file };
      const preview = new Image();
      preview.src = imageUrl(attachment);
      try { await preview.decode(); attachments.push(attachment); }
      catch {
        URL.revokeObjectURL(objectUrls.get(attachment.id)); objectUrls.delete(attachment.id);
        failures.push(`${file.name} — не удалось открыть изображение.`);
      }
    }
    busy = false; renderImages();
    if (failures.length) showError(failures.join('\n'));
  }

  imageInput.addEventListener('change', async () => {
    const files = [...imageInput.files]; imageInput.value = '';
    await addImages(files);
  });
  form.addEventListener('input', event => {
    event.target.setCustomValidity?.('');
    dialog.querySelector('[role="alert"]').classList.add('hidden');
  });
  form.addEventListener('submit', async event => {
    event.preventDefault(); event.stopPropagation();
    if (busy) return;
    const messageField = form.elements.namedItem('message');
    const message = messageField.value.trim();
    if (!message) {
      messageField.setCustomValidity('Опишите, что произошло или что хотите изменить.');
      messageField.reportValidity(); return;
    }
    busy = true; updateControls();
    const item = { id: crypto.randomUUID(), category: form.elements.namedItem('category').value,
      message, context, attachments: [...attachments], createdAt: new Date().toISOString() };
    try { await saveFeedback(item); saved.push(item); }
    catch {
      busy = false; updateControls();
      showError('Не удалось сохранить отзыв и изображения в браузере. Освободите место и попробуйте ещё раз.');
      return;
    }
    if (!dialog.isConnected) return;
    dialog.innerHTML = `${header}<section class="feedback-success" role="status"><h3>Сохранено в этом браузере</h3><p>Отзыв и изображения доступны в разделе «Сохранённые отзывы» при следующем открытии этого окна.</p></section><article class="feedback-saved-message"><strong>${esc(item.category)}</strong><p>${esc(item.message)}</p></article>${imageList(item.attachments)}<p class="muted feedback-local-note">Отправка команде появится при подключении сервиса.</p><div class="feedback-footer"><button type="button" data-feedback-copy="${item.id}">Скопировать текст</button><button type="button" class="primary" data-feedback-close>Готово</button></div><p class="feedback-copy-status muted" aria-live="polite"></p>`;
    dialog.querySelector('.feedback-footer [data-feedback-close]').focus();
  });
  dialog.addEventListener('click', async event => {
    const target = event.target.closest('button');
    if (target?.hasAttribute('data-feedback-close')) dialog.close();
    if (target?.hasAttribute('data-feedback-attach')) imageInput.click();
    if (target?.dataset.feedbackRemove) {
      const id = target.dataset.feedbackRemove;
      attachments.splice(attachments.findIndex(attachment => attachment.id === id), 1);
      URL.revokeObjectURL(objectUrls.get(id)); objectUrls.delete(id); renderImages();
      dialog.querySelector('[data-feedback-attach]').focus();
    }
    if (target?.hasAttribute('data-feedback-capture')) {
      busy = true; updateControls();
      dialog.classList.add('feedback-capturing');
      try {
        const file = await captureFeedbackRegion();
        dialog.classList.remove('feedback-capturing');
        if (file) await addImages([file]);
      } catch { showError('Не удалось получить фрагмент экрана. Попробуйте ещё раз или прикрепите изображение файлом.'); }
      finally {
        dialog.classList.remove('feedback-capturing');
        busy = false; updateControls();
        target.focus({ preventScroll: true });
      }
    }
    if (target?.dataset.feedbackCopy) {
      const item = saved.find(entry => entry.id === target.dataset.feedbackCopy);
      const status = dialog.querySelector('.feedback-copy-status');
      try { await navigator.clipboard.writeText(feedbackText(item)); status.textContent = 'Текст отзыва скопирован.'; }
      catch { status.textContent = 'Копирование недоступно. Выделите текст отзыва и скопируйте его вручную.'; }
    }
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    }
  });
  dialog.addEventListener('close', () => {
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    document.body.style.overflow = previousOverflow;
    dialog.remove();
    if (trigger?.isConnected) {
      const returnTarget = trigger.getClientRects().length ? trigger : $('#sections-toggle');
      returnTarget?.focus({ preventScroll: true });
    }
  });
  document.body.style.overflow = 'hidden';
  dialog.showModal();
  form.elements.namedItem('category').focus({ preventScroll: true });
}

document.addEventListener('click', event => {
  const trigger = event.target.closest('#feedback-toggle');
  if (!trigger) return;
  event.preventDefault(); openFeedback(trigger);
});
