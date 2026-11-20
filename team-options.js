/* Team names, custom roles and departments belong to this prototype session. */
const teamStorageKey = 'pacto-team-v5';
const savedTeam = JSON.parse(sessionStorage.getItem(teamStorageKey) || 'null');
let teamProfiles = savedTeam?.profiles || members.map(name => ({
  name,
  department: name === 'Денис Орлов' ? 'Сопровождение' : 'Продажи',
  role: 'Менеджер',
  scope: accessScopes[name] || 'Свои задачи'
}));
const teamDepartments = new Set(['Продажи', 'Сопровождение', ...(savedTeam?.departments || []), ...teamProfiles.map(person => person.department)]);
const teamRoles = new Set(['Менеджер', 'Руководитель', ...(savedTeam?.roles || []), ...teamProfiles.map(person => person.role)]);
const teamScopes = ['Свои задачи', 'Задачи отдела', 'Все задачи команды'];

function syncTeamMembers() {
  members = teamProfiles.map(person => person.name);
  accessScopes = Object.fromEntries(teamProfiles.map(person => [person.name, person.scope]));
}

function persistTeam() {
  syncTeamMembers();
  sessionStorage.setItem(teamStorageKey, JSON.stringify({ profiles: teamProfiles, departments: [...teamDepartments], roles: [...teamRoles] }));
}
syncTeamMembers();

function getTeamMember(name) {
  return teamProfiles.find(person => person.name === name);
}

function teamChoice(name, label, values, current) {
  return `<div class="team-choice-field">
    <label>${label}<select name="${name}" aria-label="${label}">
      ${[...values].map(value => `<option value="${esc(value)}" ${current === value ? 'selected' : ''}>${esc(value)}</option>`).join('')}
      <option value="__custom__">Свой вариант…</option>
    </select></label>
    <label class="team-custom-field hidden">${name === 'dept' ? 'Название отдела' : 'Название роли'}
      <input name="${name}Custom" maxlength="80" disabled placeholder="${name === 'dept' ? 'Например, внедрение' : 'Например, аналитик'}">
    </label>
  </div>`;
}

function teamFields(person) {
  return `<div class="team-fields">
    ${teamChoice('dept', 'Отдел', teamDepartments, person.department)}
    ${teamChoice('teamRole', 'Роль сотрудника', teamRoles, person.role)}
    <label>Область доступа<select name="scope" aria-label="Область доступа">${teamScopes.map(scope => `<option ${person.scope === scope ? 'selected' : ''}>${scope}</option>`).join('')}</select></label>
  </div><p class="muted team-access-hint">Область доступа определяет, какие задачи видит сотрудник.</p>`;
}

function teamPage() {
  return heading('Команда и доступ', 'Добавляйте сотрудников, выбирайте отдел, роль и доступ к задачам.') +
    `<form id="memberform" class="panel team-form">
      <label>Имя<input name="name" required maxlength="100" placeholder="Имя сотрудника"></label>
      ${teamFields({ department: 'Продажи', role: 'Менеджер', scope: 'Свои задачи' })}
      <button class="primary" type="submit">Создать приглашение</button>
      <p class="muted">В макете приглашения сохраняются в этой вкладке. Отправка приглашений будет доступна после подключения команды.</p>
    </form>` + teamProfiles.map(person => `<section class="panel row spread team-person">
      <div><h3>${esc(person.name)}</h3><p>${esc(person.department)} · ${esc(person.role)}</p><span class="muted">${esc(person.scope)}</span></div>
      <button data-action="access:${esc(person.name)}">Изменить доступ</button>
    </section>`).join('');
}

function teamAccessPage() {
  const person = teamProfiles.find(item => item.name === accessName);
  if (!person) return teamPage();
  return button('← К команде', 'nav:Команда') + heading('Доступ сотрудника', person.name) +
    `<form id="accessform" class="panel team-form">
      ${teamFields(person)}
      <div class="actions"><button type="button" data-action="nav:Команда">Отмена</button><button class="primary" type="submit">Сохранить доступ</button></div>
      <p class="muted">Настройки сохраняются в этой вкладке макета.</p>
    </form>`;
}

const renderBeforeTeamOptions = render;
render = function() {
  renderBeforeTeamOptions();
  if (page === 'Команда') $('#app').innerHTML = teamPage();
  if (page === 'Доступ') $('#app').innerHTML = teamAccessPage();
  if (page === 'Команда' || page === 'Доступ') enhanceChoices();
};

document.addEventListener('change', event => {
  const select = event.target;
  const container = select.closest('.team-choice-field');
  if (!container || select.tagName !== 'SELECT') return;
  const label = container.querySelector('.team-custom-field');
  const input = label.querySelector('input');
  const custom = select.value === '__custom__';
  label.classList.toggle('hidden', !custom);
  input.disabled = !custom;
  input.required = custom;
  input.setCustomValidity('');
  if (custom) requestAnimationFrame(() => input.focus());
});

document.addEventListener('input', event => {
  if (event.target.closest('.team-form') && event.target.setCustomValidity) event.target.setCustomValidity('');
});

document.addEventListener('submit', event => {
  const form = event.target;
  if (!form.classList.contains('team-form')) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const data = new FormData(form);
  const fieldValue = name => String(data.get(data.get(name) === '__custom__' ? name + 'Custom' : name) || '').trim();
  const department = fieldValue('dept');
  const teamRole = fieldValue('teamRole');
  const name = form.id === 'memberform' ? String(data.get('name') || '').trim() : accessName;
  const invalid = [
    [form.querySelector('[name=name]'), !name, 'Введите имя сотрудника.'],
    [form.querySelector('[name=deptCustom]'), !department, 'Введите название отдела.'],
    [form.querySelector('[name=teamRoleCustom]'), !teamRole, 'Введите название роли.'],
    [form.querySelector('[name=name]'), form.id === 'memberform' && teamProfiles.some(person => person.name.toLocaleLowerCase() === name.toLocaleLowerCase()), 'Сотрудник с таким именем уже есть в команде.']
  ].find(([input, failed]) => input && failed);
  if (invalid) {
    invalid[0].setCustomValidity(invalid[2]);
    invalid[0].reportValidity();
    return;
  }
  const profile = { name, department, role: teamRole, scope: String(data.get('scope')) };
  teamDepartments.add(department);
  teamRoles.add(teamRole);
  if (form.id === 'memberform') teamProfiles.push(profile);
  else teamProfiles[teamProfiles.findIndex(person => person.name === accessName)] = profile;
  persistTeam();
  go('Команда');
  toast(form.id === 'memberform' ? 'Приглашение сохранено в макете.' : 'Отдел, роль и доступ сохранены в макете.');
}, true);

render();
