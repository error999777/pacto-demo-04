/* CRM workspace proposal. All edits are local demonstration data. */
sourceMarks.Bitrix24 = 'Б';
function crmTaskNumber(task) {
  return task.crmNumber || 4100 + task.id;
}

function crmComments(task) {
  return `<details class="crm-discussion"><summary>Обсуждение задачи · ${(task.crmComments || []).length}</summary>
    <div class="crm-discussion-content">
      <div class="crm-comments">${(task.crmComments || []).map(comment => `<article><div class="row spread"><strong>${esc(comment.author)}</strong><time>${new Date(comment.time).toLocaleString('ru-RU')}</time></div><p>${esc(comment.text)}</p></article>`).join('') || '<p class="muted">Здесь можно уточнить детали с коллегами.</p>'}</div>
      <form id="crm-comment-form"><label>Комментарий<textarea name="comment" required maxlength="2000" placeholder="Например, клиент подтвердил объём поставки"></textarea></label><button type="submit">Добавить комментарий</button><p class="muted">Комментарии сохраняются в макете.</p></form>
    </div></details>`;
}

function crmEditor(task) {
  return `<form id="crm-task-form" class="crm-task-form" hidden>
    <h3>Изменить задачу</h3>
    <label>Название задачи<input name="title" required maxlength="200" value="${esc(task.title)}"></label>
    <label>Ответственный<select name="person">${[...new Set([...members, task.person])].map(person => `<option ${person === task.person ? 'selected' : ''}>${esc(person)}</option>`).join('')}</select></label>
    <label>Крайний срок<input name="deadline" type="datetime-local" value="${esc(task.deadline || '')}"></label>
    ${zoneField(task.timezone || 'Europe/Moscow')}
    <div class="crm-edit-actions"><button type="submit" class="primary">Сохранить задачу</button><button type="button" data-crm-action="cancel">Отмена</button></div>
  </form>`;
}

function enhanceCrmWorkspace() {
  if (page === 'Аналитика') {
    const sourcePanel = [...document.querySelectorAll('#app section.panel')].find(panel => panel.querySelector('h2')?.textContent === 'Источники');
    const importedCount = scoped().filter(task => task.source === 'Bitrix24').length;
    if (sourcePanel && importedCount) sourcePanel.insertAdjacentHTML('beforeend', `<p class="row spread"><span>Битрикс24</span><strong>${importedCount}</strong></p>`);
  }
  if (page === 'Работа') {
    $('#app > h1 + p').textContent = 'Договорённости и задачи Битрикс24. Ответственный, срок и результат — в одном месте.';
    document.querySelectorAll('.compact-card').forEach(card => {
      const task = tasks.find(item => item.id === Number(card.dataset.taskId));
      if (task.crm) card.querySelector('.source-line').insertAdjacentHTML('beforeend', `<span class="crm-task-link">Битрикс24 · #${crmTaskNumber(task)}</span>`);
    });
    const sourceSelect = $('#work-source');
    sourceSelect.add(new Option('Битрикс24', 'Bitrix24'));
    sourceSelect.value = workSource;
    enhanceChoices();
  }
  if (page !== 'Карточка') return;
  const task = tasks.find(item => item.id === selected);
  if (!task.crm) return;
  const editButton = $('.execution-actions [data-action="edit"]');
  editButton.removeAttribute('data-action');
  editButton.dataset.crmAction = 'edit';
  editButton.textContent = 'Изменить задачу';
  editButton.setAttribute('aria-expanded', 'false');
  editButton.setAttribute('aria-controls', 'crm-task-form');
  $('.execution-actions [data-action="crm"]')?.remove();
  const crmFact = [...$('.execution-facts').children].find(item => item.querySelector('dt').textContent === 'Задача в CRM');
  crmFact.querySelector('dd').innerHTML = `Битрикс24 · #${crmTaskNumber(task)}<span class="fact-secondary">${task.crmOrigin ? 'Создана в Битрикс24' : 'Создана из договорённости'}</span>`;
  $('.execution-facts').insertAdjacentHTML('afterend', crmEditor(task));
  $('.execution-actions').insertAdjacentHTML('afterend', '<p class="crm-demo-note muted">Демонстрация работы с Битрикс24. Изменения сохраняются в этой вкладке.</p>');
  $('.conversation-panel').insertAdjacentHTML('beforeend', crmComments(task));
  if (task.crmOrigin) {
    $('.evidence-block').innerHTML = `<h2>Описание задачи</h2><p class="crm-description">${esc(task.quote)}</p>`;
    $('.conversation-panel > details').remove();
    $('.history-items').innerHTML = '<p>Задача создана в Битрикс24 и показана в Pacto.</p><p class="muted">Вымышленный пример для обсуждения единого списка.</p>';
    $('.source-banner strong').textContent = 'Источник: Битрикс24';
  }
  enhanceChoices();
}

const renderBeforeCrmWorkspace = render;
render = function () {
  renderBeforeCrmWorkspace();
  enhanceCrmWorkspace();
};

document.addEventListener('click', event => {
  const target = event.target.closest('[data-crm-action]');
  if (!target) return;
  event.preventDefault();
  const action = target.dataset.crmAction;
  if (action === 'edit') {
    const form = $('#crm-task-form');
    form.hidden = false;
    target.setAttribute('aria-expanded', 'true');
    form.querySelector('[name="title"]').focus();
  }
  if (action === 'cancel') {
    const form = $('#crm-task-form');
    form.reset(); form.hidden = true; enhanceChoices();
    const editButton = $('[data-crm-action="edit"]');
    editButton.setAttribute('aria-expanded', 'false'); editButton.focus();
  }
});

document.addEventListener('submit', event => {
  if (!['crm-task-form', 'crm-comment-form'].includes(event.target.id)) return;
  event.preventDefault(); event.stopImmediatePropagation();
  const task = tasks.find(item => item.id === selected);
  if (!task?.crm) return;
  const values = new FormData(event.target);
  if (event.target.id === 'crm-task-form') {
    const title = String(values.get('title')).trim();
    if (!title) {
      const input = event.target.querySelector('[name="title"]');
      input.setCustomValidity('Введите название задачи.'); input.reportValidity(); return;
    }
    task.title = title;
    const person = String(values.get('person'));
    const previousPerson = task.person;
    const colleague = tasks.find(item => item.id !== task.id && item.person === person);
    const profile = typeof getTeamMember === 'function' ? getTeamMember(person) : undefined;
    task.person = person;
    task.dept = profile?.department || colleague?.dept || (previousPerson === person ? task.dept : '');
    task.deadline = String(values.get('deadline'));
    task.timezone = String(values.get('timezone'));
    if (task.state !== 'done') {
      const deadlineTime = task.deadline ? Date.parse(task.deadline + 'Z') - offsets[task.timezone] * 3600000 : Infinity;
      task.state = deadlineTime < Date.now() ? 'overdue' : 'active';
    }
    save();
    if (role === 'Менеджер' && task.person !== 'Мария Волкова') go('Работа');
    else render();
    toast('Изменения задачи сохранены в макете.');
  } else {
    const text = String(values.get('comment')).trim();
    if (!text) {
      const input = event.target.querySelector('[name="comment"]');
      input.setCustomValidity('Введите комментарий.'); input.reportValidity(); return;
    }
    task.crmComments ||= [];
    task.crmComments.push({ author: role === 'Руководитель' ? 'Павел Нуклон' : 'Мария Волкова', text, time: new Date().toISOString() });
    save(); render();
    $('.crm-discussion').open = true;
    $('#crm-comment-form textarea').focus();
    toast('Комментарий сохранён в макете.');
  }
}, true);
document.addEventListener('input', event => {
  if (event.target.closest('#crm-task-form, #crm-comment-form')) event.target.setCustomValidity?.('');
});
render();
