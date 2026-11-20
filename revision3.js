/* Presentation-only revision. Original forms remain the source of their values. */
const defaultWorkSize = 4;
let workPage=1, evidencePage=1, workSize=defaultWorkSize, evidenceSize=8, workEmployee='', workSource='';
let workScope='', evidenceScope='';
const fifthExample={...structuredClone(initial[0]), id:5, title:'Согласовать дату демонстрации',
  client:'Алексей · Орион', source:'Telegram', time:'14 ноября, 12:10', quote:'Согласуем дату демонстрации завтра.',
  deadline:'2026-11-16T12:00',state:'active',crm:true};
initial.push(fifthExample);
const originalExamples = initial.slice();
const queuedExamples = makeWorkExamples();
initial.push(...queuedExamples);

// Keep edits made in tabs that used the previous, optionally loaded fixtures.
function updateSavedExamples(saved) {
  const fixtures = new Map(queuedExamples.map(example => [example.id, example]));
  const legacyTitles = ['Отправить расчёт стоимости', 'Уточнить требования к запуску', 'Подготовить условия договора',
    'Согласовать время демонстрации', 'Проверить документы клиента', 'Подтвердить сроки поставки'];
  const migrated = saved.map(task => {
    const fixture = fixtures.get(task.id);
    if (fixture?.demoExample !== 2 || task.demoExample === 2) return task;
    const i = task.id - 3000;
    const legacy = {
      ...originalExamples[i % originalExamples.length], id: task.id,
      title: legacyTitles[i % legacyTitles.length] + ' · пример ' + (i + 1),
      client: 'Клиент ' + (i + 1) + ' · Демо-компания',
      time: '14 ноября, ' + String(8 + i % 10).padStart(2, '0') + ':' + String(i % 60).padStart(2, '0'),
    };
    const edits = Object.entries(task).filter(([field, value]) => value !== legacy[field]);
    return { ...fixture, ...Object.fromEntries(edits), demoExample: 2 };
  });
  const ids = new Set(migrated.map(task => task.id));
  return [...migrated, ...initial.filter(task => !ids.has(task.id)).map(task => structuredClone(task))];
}
tasks = updateSavedExamples(tasks);
save();
const sourceMarks={'Звонок':'☎','Zoom':'Z','Google Meet':'M','Почта':'@','Telegram':'T','Ручной ввод':'✎'};
function sourceCaption(task){return `<span class="source-icon" aria-hidden="true">${sourceMarks[task.source]||'•'}</span><span>${esc(task.source)}</span><span class="source-date">Создано: ${esc(task.createdAt||task.time)}</span>`;}
function pageButtons(current,last){
  const numbers=new Set([1,last]);
  if(last<=7)for(let i=1;i<=last;i++)numbers.add(i);
  else if(current<=4)for(let i=1;i<=5;i++)numbers.add(i);
  else if(current>=last-3)for(let i=last-4;i<=last;i++)numbers.add(i);
  else for(let i=current-1;i<=current+1;i++)numbers.add(i);
  const result=[];let previous=0;
  for(const n of [...numbers].sort((a,b)=>a-b)){
    if(n-previous>1)result.push('…');result.push(n);previous=n;
  }
  return result;
}
function pager(kind,count,current,size){
  const last=Math.max(1,Math.ceil(count/size));
  const pageButton=(n,label,disabled=false)=>`<button type="button" data-page="${kind}:${n}" ${disabled?'disabled':''} ${n===current&&typeof label==='number'?'aria-current="page"':''} aria-label="${typeof label==='number'?'Страница '+n:label}">${label}</button>`;
  return `<nav class="pager" aria-label="${kind==='work'?'Страницы работы':'Страницы договорённостей'}"><span class="pager-count" role="status">${count?(current-1)*size+1:0}–${Math.min(current*size,count)} из ${count}</span><div class="page-numbers">${pageButton(current-1,'← Назад',current===1)}${pageButtons(current,last).map(n=>n==='…'?'<span class="page-gap" aria-hidden="true">…</span>':pageButton(n,n)).join('')}${pageButton(current+1,'Далее →',current===last)}</div><label class="page-size">На странице<select name="${kind}-size" data-page-size="${kind}">${[4,8,16].map(n=>`<option value="${n}" ${n===size?'selected':''}>${n}</option>`).join('')}</select></label></nav>`;
}
function workView(){
  const key=JSON.stringify([role,filter,query,workEmployee,workSource]);
  if(workScope!==key){workPage=1;workScope=key;}
  const list=mine().filter(t=>(!workEmployee||t.person===workEmployee)&&(!workSource||t.source===workSource)
    &&(filter==='Все'||({review:'Нужна проверка',active:'В работе',overdue:'Просрочено',done:'Готово'})[t.state]===filter)
    &&(`${t.title} ${t.client}`).toLowerCase().includes(query.toLowerCase()));
  workPage=Math.min(workPage,Math.max(1,Math.ceil(list.length/workSize)));
  return heading(role==='Руководитель'?'Работа команды':'Моя работа','Договорённости из всех источников. Срок и следующий шаг — на виду.')+
    `<div class="work-toolbar"><div class="work-tabs" role="group" aria-label="Статус задачи">${['Все','Нужна проверка','В работе','Просрочено','Готово'].map(n=>`<button type="button" data-action="filter:${n}" class="${filter===n?'primary':''}" aria-pressed="${filter===n}">${n}</button>`).join('')}</div>${button('+ Добавить','nav:Новый источник','primary')}</div>
    <div class="work-tools"><label class="searchbox"><span class="hidden">Поиск по задаче или клиенту</span><input id="search" value="${esc(query)}" aria-label="Поиск по задаче или клиенту" placeholder="Поиск по задаче или клиенту"></label><label class="source-filter"><span>Источник</span><select id="work-source" aria-label="Источник">${[['','Все источники'],...['Звонок','Zoom','Google Meet','Почта','Telegram','Ручной ввод'].map(s=>[s,s])].map(([value,label])=>`<option value="${value}" ${workSource===value?'selected':''}>${label}</option>`).join('')}</select></label></div>
    <div class="queue-meta"><span>${workEmployee?esc(workEmployee)+' · ':''}Найдено: ${list.length} ${workEmployee?'<button data-v3="clear-employee">Вся команда ×</button>':''}</span></div>
    <div class="work-list">${list.slice((workPage-1)*workSize,workPage*workSize).map(t=>`
      <article class="card compact-card ${colors[t.state]}" data-task-id="${t.id}">
        <div class="card-main">
          <div class="source-line">${sourceCaption(t)}</div>
          <h2>${esc(t.title)}</h2>
          <p>${esc(t.client)} · ${esc(t.person)} · ${esc(t.dept)}</p>
        </div>
        <div class="card-side"><div class="card-side-bottom">
          <span class="badge">${t.state==='review'?'Нужна проверка':labels[t.state]}</span>
          <strong class="card-deadline">${t.deadline?'До '+date(t.deadline):'Срок не указан'}</strong>
          ${button('Открыть карточку','open:'+t.id)}
        </div></div>
      </article>`).join('')||'<div class="empty-list">По этим условиям задач нет. Измените поиск или статус.</div>'}</div>${pager('work',list.length,workPage,workSize)}`;
}
function evidenceView(){
  const key=JSON.stringify([analyticsTab,employee]);if(evidenceScope!==key){evidencePage=1;evidenceScope=key;}
  const list=scoped();evidencePage=Math.min(evidencePage,Math.max(1,Math.ceil(list.length/evidenceSize)));
  return `<h2>Договорённости — основание статистики</h2><p class="muted">Можно открыть любую карточку и проверить источник.</p><div class="evidence-list">${list.slice((evidencePage-1)*evidenceSize,evidencePage*evidenceSize).map(t=>`<div class="evidence-row" data-task-id="${t.id}"><div><strong>${esc(t.title)}</strong><p>${esc(t.person)} · ${esc(t.source)} · ${labels[t.state]}</p></div>${button('Открыть карточку','open:'+t.id)}</div>`).join('')||'<p>У сотрудника пока нет задач.</p>'}</div>${pager('evidence',list.length,evidencePage,evidenceSize)}`;
}

// A single popup implementation for role, staff, time zones, calendars and paging.
// Hidden selects still participate in FormData; their change handlers are preserved.
let openChoice=null, choiceMenu=null, typeBuffer='', typeTimer;
function closeChoice(returnFocus=false){
  const trigger=openChoice?.trigger;
  if(trigger)trigger.setAttribute('aria-expanded','false');
  choiceMenu?.remove();choiceMenu=null;openChoice=null;
  if(returnFocus&&trigger?.isConnected)trigger.focus();
}
function updateChoice(select,trigger){trigger.querySelector('.choice-text').textContent=select.selectedOptions[0]?.textContent||'Выберите';}
function openChoiceFor(select,trigger){
  closeChoice();openChoice={select,trigger};trigger.setAttribute('aria-expanded','true');
  choiceMenu=document.createElement('div');choiceMenu.id=trigger.getAttribute('aria-controls');
  choiceMenu.className='choice-menu';choiceMenu.setAttribute('role','listbox');choiceMenu.setAttribute('aria-label',trigger.getAttribute('aria-label'));
  for(const option of select.options){
    const item=document.createElement('button');item.type='button';item.className='choice-option';item.tabIndex=-1;
    item.setAttribute('role','option');item.setAttribute('aria-selected',String(option.selected));item.disabled=option.disabled;
    item.append(document.createTextNode(option.textContent));
    if(option.selected){const check=document.createElement('span');check.textContent='✓';check.setAttribute('aria-hidden','true');item.append(check);}
    item.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();const focusId=trigger.id;
      select.value=option.value;updateChoice(select,trigger);closeChoice();
      select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));
      document.getElementById(focusId)?.focus();
    });choiceMenu.append(item);
  }
  document.body.append(choiceMenu);
  positionChoice();
  (choiceMenu.querySelector('[aria-selected=true]')||choiceMenu.querySelector('button'))?.focus({preventScroll:true});
}
function positionChoice(){
  if(!openChoice||!choiceMenu)return;
  const rect=openChoice.trigger.getBoundingClientRect(),width=Math.min(Math.max(rect.width,200),innerWidth-24);
  if(rect.bottom<0||rect.top>innerHeight){closeChoice();return;}
  const below=innerHeight-rect.bottom-12,above=rect.top-12;
  const height=Math.min(300,Math.max(below,above));
  Object.assign(choiceMenu.style,{width:width+'px',maxHeight:height+'px',left:Math.max(12,Math.min(rect.left,innerWidth-width-12))+'px'});
  choiceMenu.style.top='auto';choiceMenu.style.bottom='auto';
  if(below>=Math.min(240,choiceMenu.scrollHeight))choiceMenu.style.top=(rect.bottom+6)+'px';
  else choiceMenu.style.bottom=(innerHeight-rect.top+6)+'px';
}
function enhanceChoices(){
  document.querySelectorAll('select').forEach((select,index)=>{
    if(select.closest('.choice')){updateChoice(select,select.closest('.choice').querySelector('.choice-trigger'));return;}
    const label=select.getAttribute('aria-label')||[...(select.closest('label')?.childNodes||[])].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ')||'Выбор';
    const wrapper=document.createElement('span');wrapper.className='choice'+(select.id==='role'?' role':'');
    select.before(wrapper);wrapper.append(select);select.tabIndex=-1;select.setAttribute('aria-hidden','true');
    const trigger=document.createElement('button');trigger.type='button';trigger.className='choice-trigger';
    trigger.id='choice-'+(select.id||select.name||index);trigger.setAttribute('role','combobox');trigger.setAttribute('aria-label',label);
    trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',trigger.id+'-options');
    trigger.innerHTML='<span class="choice-text"></span><span class="chevron" aria-hidden="true">⌄</span>';
    wrapper.append(trigger);updateChoice(select,trigger);
    trigger.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(openChoice?.trigger===trigger)closeChoice(true);else openChoiceFor(select,trigger);});
    trigger.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();openChoiceFor(select,trigger);const options=[...choiceMenu.querySelectorAll('button:not(:disabled)')];if(e.key==='Home')options[0]?.focus();if(e.key==='End')options.at(-1)?.focus();}});
  });
}
document.addEventListener('keydown',e=>{
  if(!choiceMenu)return;
  const options=[...choiceMenu.querySelectorAll('button:not(:disabled)')],current=options.indexOf(document.activeElement);
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeChoice(true);return;}
  if(e.key==='Tab'){closeChoice(true);return;}
  const moves={ArrowDown:Math.min(current+1,options.length-1),ArrowUp:Math.max(current-1,0),Home:0,End:options.length-1};
  if(e.key in moves){e.preventDefault();options[moves[e.key]]?.focus();return;}
  if(e.key.length===1&&e.key!==' '){typeBuffer+=e.key.toLocaleLowerCase();clearTimeout(typeTimer);typeTimer=setTimeout(()=>typeBuffer='',650);options.find(o=>o.textContent.toLocaleLowerCase().startsWith(typeBuffer))?.focus();}
});
document.addEventListener('pointerdown',e=>{if(openChoice&&!choiceMenu?.contains(e.target)&&!openChoice.trigger.contains(e.target))closeChoice();});
window.addEventListener('resize',()=>closeChoice());
window.addEventListener('scroll',e=>{if(openChoice&&!choiceMenu?.contains(e.target))positionChoice();},true);

const revisionTwoRender=render;
render=function(){
  closeChoice();revisionTwoRender();$('main').dataset.screen=page;
  if(page==='Работа')$('#app').innerHTML=workView();
  if(page==='Аналитика'){
    const panel=$('#app>section.panel:last-child');panel.id='analytics-evidence';panel.innerHTML=evidenceView();
  }
  if(page==='Карточка'){
    const task=tasks.find(t=>t.id===selected);
    $('.detail').insertAdjacentHTML('beforebegin',`<section class="source-banner" aria-label="Источник карточки"><div class="row"><span class="source-icon" aria-hidden="true">${sourceMarks[task.source]||'•'}</span><div><strong>Источник: ${esc(task.source)}</strong><p>Карточка создана: ${esc(task.createdAt||task.time)}</p></div></div><span class="badge">${esc(task.client)}</span></section>`);
  }
  enhanceChoices();
};
document.addEventListener('click',e=>{
  const target=e.target.closest('[data-page],[data-v3]');if(!target)return;e.preventDefault();
  if(target.dataset.page){
    const [kind,n]=target.dataset.page.split(':');const next=Number(n);if(next<1)return;
    if(kind==='work')workPage=next;else evidencePage=next;
    const previousY=window.scrollY;render();
    if(kind==='work'){window.scrollTo(0,0);$('.work-list button')?.focus({preventScroll:true});}
    else{window.scrollTo(0,previousY);$('#analytics-evidence .page-numbers [aria-current=page]')?.focus({preventScroll:true});}
  }
  if(target.dataset.v3==='clear-employee'){workEmployee='';render();}
});
document.addEventListener('change',e=>{
  if(e.target.id==='work-source'){workSource=e.target.value;workPage=1;render();}
  if(e.target.id==='role'){workEmployee='';workPage=1;render();}
  const kind=e.target.dataset.pageSize;if(!kind)return;
  if(kind==='work'){workSize=+e.target.value;workPage=1;}else{evidenceSize=+e.target.value;evidencePage=1;}
  render();
});
$('#reset').addEventListener('click',()=>{workPage=1;workSize=defaultWorkSize;evidencePage=1;workEmployee='';workSource='';render();});
render();
