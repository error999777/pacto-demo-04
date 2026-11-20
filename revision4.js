/* Prototype review: source-specific forms and compact detail groups. */
document.documentElement.dataset.palette='blue';
sessionStorage.removeItem('pacto-prototype-palette');

function recordingForm(){
  const isCall=meetingSource==='Звонок';
  return heading(isCall?'Загрузить звонок':'Добавить текст разговора',isCall?'Добавьте готовую запись или расшифровку завершённого звонка.':'Внесите содержание разговора и контекст для проверки договорённостей.')+`
    <form id="callform" class="panel source-form">
      <div class="split-form">
        <section class="call-materials"><h2>1. Материалы разговора</h2>
          <label>Название<input name="name" required placeholder="Например, условия поставки для Севера"></label>
          ${isCall?'<label>Запись звонка<input name="recording" type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac"></label><p class="muted">Выберите аудиофайл с компьютера или вставьте текст ниже.</p>':''}
          <label>${isCall?'Или текст разговора':'Текст разговора'}<textarea name="text" placeholder="Менеджер: пришлю предложение до понедельника…"></textarea></label>
          <p class="form-error hidden" role="alert"></p>
        </section>
        <section class="field-section"><h2>2. Контекст</h2>
          <label>${isCall?'Дата и время звонка':'Дата и время разговора'}<input type="datetime-local" name="time"></label>
          ${zoneField()}
          <label>Заметка к разговору<textarea name="note" placeholder="Что важно учесть при проверке"></textarea></label>
        </section>
      </div>
      <p class="muted">Макет: файл никуда не отправляется, распознавание не запускается. Следующий экран показывает пример результата.</p>
      <div class="actions">${button('Отмена','nav:Новый источник')}<button class="primary" type="submit">Показать пример анализа</button></div>
    </form>`;
}

function groupDetail(){
  const t=tasks.find(task=>task.id===selected),left=$('.detail>section:first-child'),right=$('.detail>section:last-child');
  left.classList.add('conversation-panel');right.classList.add('execution-panel');
  left.querySelector(':scope>.badge')?.remove();
  const evidence=document.createElement('section');evidence.className='evidence-block';
  // Move existing nodes so the audio player and its time-bound playback keep their handlers.
  while(left.firstElementChild&&left.firstElementChild.tagName!=='DETAILS')evidence.append(left.firstElementChild);
  left.prepend(evidence);evidence.querySelector('h2').textContent='Договорённость из разговора';
  const dialogue=left.querySelector('details');
  if(t.recordingName){
    const play=evidence.querySelector('button');play.disabled=true;play.textContent='Фрагменты появятся после анализа';
    play.parentElement.nextElementSibling.textContent='Выбран файл: '+t.recordingName+'. В макете он не распознаётся.';
    dialogue.innerHTML=`<summary>Запись звонка</summary><p>Файл: ${esc(t.recordingName)}</p><p class="muted">В этом макете сохраняется только название выбранного файла. Загрузка и распознавание будут подключены после утверждения.</p>`;
  }
  const history=document.createElement('details');history.className='history-block';
  history.innerHTML='<summary>История обработки</summary><div class="history-items"></div>';
  const historyContent=history.querySelector('div');
  while(dialogue.nextElementSibling){const next=dialogue.nextElementSibling;if(next.tagName==='H2')next.remove();else historyContent.append(next);}
  left.append(history);
  if(t.note)left.insertAdjacentHTML('beforeend',`<section class="field-section"><h3>Заметка к разговору</h3><p>${esc(t.note)}</p></section>`);
  const fields=[
    ['Ответственный',`${esc(t.person)}<span class="fact-secondary">${esc(t.dept)}</span>`],
    ['Срок',`${date(t.deadline)}<span class="fact-secondary">${esc(t.timezone||'Europe/Moscow')}</span>`],
    ['Клиент / кому написать',esc(t.client)],
    ['Задача в CRM',t.crm?'Bitrix24 · задача #'+(4100+t.id):'Ещё не создана · нужна проверка']
  ];
  right.innerHTML=`<div class="execution-heading"><h2>Исполнение</h2><span class="badge ${colors[t.state]}">${labels[t.state]}</span></div>
    <dl class="execution-facts">${fields.map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>
    <div class="execution-actions" aria-label="Действия с задачей">${button('Проверить и исправить','edit','primary')}
    ${t.state==='review'?'':button(t.state==='done'?'Имитировать возврат в CRM':'Имитировать завершение в CRM',t.state==='done'?'resume':'done')}
    ${button('Настроить напоминание','remind')}${t.crm?button('Посмотреть задачу в CRM','crm'):''}</div>
    <section class="notification-block"><h3>Кто получает уведомления</h3><p>${esc(t.person)} — ответственный<br>Павел Нуклон — руководитель</p><p class="muted">Создание, изменение срока и просрочка — обоим.</p></section>`;
  if(t.sourceTime)$('.source-banner .row>div').insertAdjacentHTML('beforeend',`<p>Дата разговора: ${date(t.sourceTime)} · ${esc(t.timezone||'Europe/Moscow')}</p>`);
}
const revisionThreeRender=render;
render=function(){
  revisionThreeRender();
  if(page==='Добавление'&&!['Zoom','Google Meet'].includes(meetingSource))$('#app').innerHTML=recordingForm();
  if(page==='Карточка')groupDetail();
  if(page==='Добавление'&&['Zoom','Google Meet'].includes(meetingSource)){
    $('#app').insertAdjacentHTML('afterbegin','<button type="button" data-v2="meeting-cancel">← К встречам</button>');
  }
  enhanceChoices();
};
document.addEventListener('submit',e=>{
  if(e.target.id!=='callform')return;
  e.preventDefault();e.stopImmediatePropagation();
  const form=e.target,values=new FormData(form),text=String(values.get('text')||'').trim();
  const file=form.querySelector('[name=recording]')?.files[0];
  if(!String(values.get('name')||'').trim()){const input=form.querySelector('[name=name]');input.setCustomValidity('Введите название разговора.');input.reportValidity();return;}
  if(!text&&!file){const error=form.querySelector('[role=alert]');error.textContent='Добавьте запись звонка или текст разговора.';error.classList.remove('hidden');form.querySelector('[name=text]').focus();return;}
  const task={...structuredClone(initial[0]),id:Date.now(),title:String(values.get('name')).trim(),source:meetingSource,
    quote:text||'Пример договорённости: отправить предложение клиенту. Аудиофайл в макете не распознавался.',
    note:String(values.get('note')||'').trim(),sourceTime:String(values.get('time')||''),recordingName:file?.name||'',
    timezone:String(values.get('timezone')),time:'Только что',deadline:'',client:'Нужно уточнить клиента',crm:false,state:'review'};
  tasks.unshift(task);save();selected=task.id;filter='Все';query='';workSource='';workEmployee='';go('Карточка');
  toast('Показан пример карточки. Анализ и отправка в CRM не запускались.');
},true);
document.addEventListener('input',e=>{
  if(!e.target.closest('#callform'))return;
  if(e.target.name==='name')e.target.setCustomValidity('');
  if(['text','recording'].includes(e.target.name))$('#callform [role=alert]').classList.add('hidden');
});
render();
