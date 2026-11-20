/* Personal reminder scheduling in the isolated prototype session. */
const reminderStorageKey = 'pacto-personal-reminders';
let personalReminders = JSON.parse(sessionStorage.getItem(reminderStorageKey) || '{}');
const reminderUser = () => role === 'Руководитель' ? 'leader' : 'maria';
const taskReminder = id => personalReminders[reminderUser()]?.[id];

function reminderDate(value, timezone) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: timezone
  }).format(new Date(value));
}

function reminderWallTime(instant, timezone) {
  return new Date(instant + offsets[timezone] * 3600000).toISOString().slice(0, 16);
}

function reminderStatus(id) {
  const reminder = taskReminder(id);
  return reminder ? `Напомнить мне ${reminderDate(reminder.at, reminder.timezone)} · ${zoneNames[zones.indexOf(reminder.timezone)]}` : '';
}

function reminderTasks() {
  return mine().filter(task => task.state !== 'done');
}

function refreshReminderCount() {
  const navigation = $('#nav [data-action="nav:Напоминания"]');
  if (!navigation) return;
  const count = reminderTasks().length;
  navigation.classList.add('reminder-nav');
  navigation.setAttribute('aria-label', 'Напоминания');
  navigation.setAttribute('aria-description', 'Задач в списке напоминаний — ' + count + '.');
  navigation.insertAdjacentHTML('beforeend', `<span class="reminder-nav-count" aria-hidden="true">${count}</span>`);
}

function remindersView() {
  const list = reminderTasks();
  return heading('Напоминания', 'Уведомления получают ответственный и руководитель. Время напоминания вы настраиваете для себя.') +
    `<div class="reminder-list">${list.map(task => `<article class="card reminder-card ${colors[task.state]}" data-task-id="${task.id}">
      <div class="reminder-copy"><h2>${esc(task.title)}</h2><p class="reminder-owner">${esc(task.person)} · ${esc(task.source)}</p></div>
      <div class="reminder-controls">
        <div class="reminder-facts"><span class="badge">${labels[task.state]}</span><strong>${task.deadline ? 'До ' + date(task.deadline) : 'Срок не указан'}</strong></div>
        <div class="reminder-actions">
          ${button('Открыть', 'open:' + task.id)}
          <button type="button" data-action="snooze:${task.id}" aria-label="Напомнить через час">Через час</button>
          <button type="button" data-reminder-task="${task.id}">Выбрать время…</button>
        </div>
      </div>
    </article>`).join('') || '<div class="empty-list">Все задачи завершены. Новые напоминания появятся вместе с задачами.</div>'}</div>`;
}

function refreshReminderLabels() {
  document.querySelectorAll('.reminder-status').forEach(element => element.remove());
  if (page === 'Карточка') {
    const text = reminderStatus(selected);
    if (text) $('.execution-actions').insertAdjacentHTML('beforeend', `<p class="reminder-status" role="status">${esc(text)}</p>`);
  }
  if (page === 'Напоминания') {
    document.querySelectorAll('.reminder-card').forEach(card => {
      const id = Number(card.dataset.taskId);
      const text = reminderStatus(id);
      if (text) card.querySelector('.reminder-copy').insertAdjacentHTML('beforeend', `<p class="reminder-status" role="status">${esc(text)}</p>`);
    });
  }
}

function persistReminder(id, at, timezone) {
  const user = reminderUser();
  personalReminders[user] ||= {};
  if (at) personalReminders[user][id] = { at: new Date(at).toISOString(), timezone };
  else delete personalReminders[user][id];
  sessionStorage.setItem(reminderStorageKey, JSON.stringify(personalReminders));
  refreshReminderLabels();
}

function openReminder(id, trigger) {
  const task = mine().find(item => item.id === id);
  if (!task) return;
  closeChoice();
  const existing = taskReminder(id);
  const timezone = existing?.timezone || (zones.includes(task.timezone) ? task.timezone : 'Europe/Moscow');
  const dialog = document.createElement('dialog');
  dialog.className = 'reminder-dialog';
  dialog.setAttribute('aria-labelledby', 'reminder-title');
  dialog.innerHTML = `<form id="reminder-form">
    <div class="row spread"><h2 id="reminder-title">Напомнить о задаче</h2><button type="button" data-reminder-close aria-label="Закрыть окно">×</button></div>
    <p class="reminder-task">${esc(task.title)}</p>
    <div class="reminder-presets" aria-label="Быстрый выбор">
      <button type="button" data-reminder-minutes="15">Через 15 минут</button>
      <button type="button" data-reminder-minutes="60">Через час</button>
      <button type="button" data-reminder-tomorrow>Завтра в 09:00</button>
    </div>
    <fieldset class="reminder-mode"><legend class="hidden">Когда напомнить</legend>
      <label><input type="radio" name="mode" value="delay" ${existing ? '' : 'checked'}>Через интервал</label>
      <label><input type="radio" name="mode" value="date" ${existing ? 'checked' : ''}>В дату и время</label>
    </fieldset>
    <div data-reminder-delay class="reminder-time-row">
      <label>Через сколько<input name="amount" type="number" min="1" max="525600" step="1" value="60" required></label>
      <label>Единица времени<select name="unit"><option value="1">Минут</option><option value="60">Часов</option><option value="1440">Дней</option></select></label>
    </div>
    <div data-reminder-date>
      <label>Дата и время<input name="at" type="datetime-local" required value="${reminderWallTime(existing ? Date.parse(existing.at) : Date.now() + 3600000, timezone)}"></label>
    </div>
    <label>Часовой пояс<select name="timezone">${zones.map((zone, index) => `<option value="${zone}" ${zone === timezone ? 'selected' : ''}>${zoneNames[index]}</option>`).join('')}</select></label>
    <p class="reminder-preview" aria-live="polite"></p>
    <p class="form-error hidden" role="alert"></p>
    <p class="muted">Личное напоминание для ${role === 'Руководитель' ? 'Павла Нуклона' : 'Марии Волковой'}. Срок задачи задаётся в карточке.</p>
    <p class="muted">В макете время сохраняется в этой вкладке. Доставка уведомлений появится при подключении сервиса.</p>
    <div class="reminder-footer">${existing ? '<button type="button" data-reminder-remove>Удалить</button>' : '<button type="button" data-reminder-close>Отмена</button>'}<button class="primary" type="submit">Сохранить</button></div>
  </form>`;
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const field = name => form.elements.namedItem(name);
  function scheduledTime() {
    if (field('mode').value === 'delay') return Date.now() + Number(field('amount').value) * Number(field('unit').value) * 60000;
    return Date.parse(field('at').value + 'Z') - offsets[field('timezone').value] * 3600000;
  }
  function updatePreview() {
    const delayed = field('mode').value === 'delay';
    dialog.querySelector('[data-reminder-delay]').hidden = !delayed;
    dialog.querySelector('[data-reminder-date]').hidden = delayed;
    field('amount').disabled = !delayed;
    field('unit').disabled = !delayed;
    field('at').disabled = delayed;
    const at = scheduledTime();
    dialog.querySelector('.reminder-preview').textContent = Number.isFinite(at) ? 'Напомнить ' + reminderDate(at, field('timezone').value) : 'Выберите дату и время';
    dialog.querySelector('[role=alert]').classList.add('hidden');
  }
  form.addEventListener('input', updatePreview);
  form.addEventListener('change', updatePreview);
  dialog.addEventListener('click', event => {
    const target = event.target.closest('button');
    if (target?.hasAttribute('data-reminder-close')) dialog.close();
    if (target?.hasAttribute('data-reminder-remove')) {
      persistReminder(id, null);
      dialog.close();
      toast('Личное напоминание удалено');
    }
    if (target?.dataset.reminderMinutes) {
      field('mode').value = 'delay';
      field('amount').value = target.dataset.reminderMinutes;
      field('unit').value = '1';
      updatePreview();
    }
    if (target?.hasAttribute('data-reminder-tomorrow')) {
      field('mode').value = 'date';
      const tomorrow = reminderWallTime(Date.now() + 86400000, field('timezone').value).slice(0, 10);
      field('at').value = tomorrow + 'T09:00';
      updatePreview();
    }
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    event.stopPropagation();
    const at = scheduledTime();
    if (!Number.isFinite(at) || at <= Date.now()) {
      const error = dialog.querySelector('[role=alert]');
      error.textContent = 'Выберите время в будущем.';
      error.classList.remove('hidden');
      field('at').focus();
      return;
    }
    persistReminder(id, at, field('timezone').value);
    dialog.close();
    toast('Личное напоминание сохранено в макете');
  });
  dialog.addEventListener('close', () => {
    dialog.remove();
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  });
  updatePreview();
  dialog.showModal();
  dialog.querySelector('[data-reminder-minutes]').focus({ preventScroll: true });
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-action="remind"], [data-action^="snooze:"], [data-reminder-task]');
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (button.dataset.action?.startsWith('snooze:')) {
    const id = Number(button.dataset.action.split(':')[1]);
    if (!mine().some(task => task.id === id)) return;
    persistReminder(id, Date.now() + 3600000, 'Europe/Moscow');
    toast('Личное напоминание через час сохранено в макете');
  } else openReminder(button.dataset.reminderTask ? Number(button.dataset.reminderTask) : selected, button);
}, true);

const renderBeforeReminders = render;
render = function () {
  renderBeforeReminders();
  if (page === 'Напоминания') $('#app').innerHTML = remindersView();
  refreshReminderLabels();
  refreshReminderCount();
};
render();
