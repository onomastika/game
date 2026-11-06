import {defaults, money, standalone, name, classify, recommend, tradeoffs, firstSound, priceEvidence, compareAdvice, purchaseChecklist} from './engine.js';
const $ = sel => document.querySelector(sel);
const esc = text => String(text ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let products = [];
let preferences = {...defaults};
let duel = [];
let catalogFilter = 'eligible';
let query = '';
let detailId = null;
let detailContext = null;
let toastTimeout;
const storeKey = 'keyboard-choice-lab-v1';
try {
 const s = JSON.parse(localStorage.getItem(storeKey) || '{}');
 if(s.preferences && typeof s.preferences === 'object') preferences = {...preferences,...Object.fromEntries(Object.entries(s.preferences).filter(([k])=>Object.hasOwn(defaults,k)))};
 if (Array.isArray(s.duel)) duel = s.duel.filter(x=>typeof x==='string').slice(0,2);
} catch(e) { /* private browsing is OK */ }
function persist(){ try{localStorage.setItem(storeKey,JSON.stringify({preferences,duel}))}catch(e){} }
function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('show'),2700)}
function typeText(p){return p.type === 'midi_controller' ? 'MIDI-контроллер' : p.type === 'portable_keyboard' ? 'Автономные клавиши' : 'Синтезатор / аранжировщик'}
const routeNames={play:'МОЖНО ИГРАТЬ СРАЗУ',studio:'ДЛЯ REAPER И MIDI',compact:'МИНИ-КЛАВИШИ'};
function tip(p,route){
 if(route==='play')return 'Сам создаёт звук и играет через динамики: нет необходимости запускать Reaper.';
 if(route==='studio')return 'Передаёт исполнение в Reaper. Для звучания нужен VSTi или другой генератор звука.';
 return 'Сохранены 61 клавиша в более узком профиле клавиш; удобство двух рук важно проверить.';
}
function pills(p){return `<div class="spec-pills"><span>${p.keys} клавиш</span><span>${p.key_size==='mini'?'Mini':'Полный размер'}</span><span>${p.velocity===true?'Динамика нажатия':p.velocity===false?'Без динамики':'Динамика — уточнить'}</span><span>${standalone(p)?'Есть встроенный звук':'Нужен источник звука'}</span></div>`}
function priceText(p) {
 const offer=priceEvidence(p);
 return offer ? `${offer.fresh ? 'Ориентир' : 'Старая цена'}: ${money(offer.amount_vnd)} · ${offer.checked_at.slice(8,10)}.${offer.checked_at.slice(5,7)}` : 'Цена: нужно уточнить';
}
function recCard(p,i){return `<article class="rec-card ${i===0?'featured':''}">
 <div class="rec-top"><span class="rec-kicker">${routeNames[p.route]}</span><span class="rec-number">${i===0?'ПЕРВЫМ ПОПРОБОВАТЬ':`АЛЬТЕРНАТИВА ${i}`}</span></div>
 <div class="rec-main"><h3>${esc(name(p))}</h3><span class="rec-price">${esc(priceText(p))}</span></div>
 <p class="rec-desc">${esc(p.editorial?.best_for ?? tip(p,p.route))}</p>
 <p class="rec-caution"><strong>Когда не стоит брать:</strong> ${esc(p.editorial?.not_for ?? tradeoffs(p,preferences)[0] ?? 'Проверь ощущения перед оплатой.')}</p>
 ${pills(p)}
 <div class="rec-bottom"><button type="button" class="link-btn" data-detail="${esc(p.id)}" aria-expanded="${detailId===p.id&&detailContext==='recommendations'}">Проверка и детали →</button><button type="button" class="add-btn ${duel.includes(p.id)?'active':''}" data-compare="${esc(p.id)}" aria-pressed="${duel.includes(p.id)}">${duel.includes(p.id)?'✓ В сравнении':'+ Сравнить'}</button></div></article>`;}
function conflictHtml(result){
 if(result.selected.length)return '';
 let details='В нашей небольшой базе сейчас нет подтверждённого совпадения. Обязательные требования не меняются без твоего участия.';
 const hasConflict=preferences.mini==='required'&&preferences.standalone==='required';
 const actions=[];
 if(hasConflict){actions.push('<button data-change="standalone" data-value="preferred">Автономность → желательно</button>','<button data-change="mini" data-value="preferred">Mini → желательно</button>')}
 if(preferences.hardBudget){actions.push('<button data-change="hardBudget" data-value="false">Сделать бюджет ориентиром</button>')}
 if(preferences.maxWidthMm){actions.push('<button data-change="maxWidthMm" data-value="none">Убрать ограничение ширины</button>')}
 if(preferences.minKeys>49){actions.push('<button data-change="minKeys" data-value="49">Допустить 49 клавиш</button>')}
 return `<div class="warning-panel"><strong>${result.pending.length?'Нужна проверка данных':'Нет совпадений в этом каталоге'}</strong><p>${details} ${result.pending.length?`Есть ${result.pending.length} модель(и) с непроверенными параметрами.`:''}</p><div class="warning-actions">${actions.join('')}</div></div>`;
}
function renderSettings(){
 document.querySelectorAll('[data-setting]').forEach(group=>{
  const key=group.dataset.setting;
  group.querySelectorAll('[data-value]').forEach(b=>{
   const val=b.dataset.value;
   const selected=String(preferences[key]??'none')===val;
   b.classList.toggle('selected',selected);
   b.setAttribute('aria-pressed',String(selected));
  });
 });
 $('#velocity').checked=Boolean(preferences.velocityRequired);
 $('#hardBudget').checked=Boolean(preferences.hardBudget);
 $('#used').checked=Boolean(preferences.includeUsed);
 $('#maxWidth').value=preferences.maxWidthMm!=null?preferences.maxWidthMm/10:'';
}
function renderDetails(){
 document.querySelectorAll('.detail').forEach(el=>el.remove());
 if(!detailId)return;
 const p=products.find(x=>x.id===detailId);
 const anchor=Array.from(document.querySelectorAll(`[data-detail="${CSS.escape(detailId)}"]`)).find(button=>Boolean(button.closest(`#${detailContext}`)));
 if(!p||!anchor)return;
 const target=anchor.closest('.rec-card,.product-row');if(!target)return;
 const d=document.createElement('div');d.className='detail';d.id='activeDetail';
 const verdict=classify(p,preferences);
 const offers=(p.prices??[]).filter(o=>o.amount_vnd);
 const priceList=offers.map(o=>`<li>${money(o.amount_vnd)} · ${esc(o.store)} · ${o.kind==='msrp'?'рекомендованная цена производителя':'публикация магазина'} от ${esc(o.checked_at)}; наличие не подтверждено. <a target="_blank" rel="noopener noreferrer" href="${esc(o.url)}">Проверить сейчас ↗</a></li>`).join('');
 const cons=tradeoffs(p,preferences);const width=Number.isFinite(p.width_mm)?p.width_mm:null;
 const sources=(p.source_refs??[]).filter(s=>s.source_type==='manufacturer');
 const editorial=p.editorial??{};
 d.innerHTML=`<div class="detail-heading"><div><h3>${esc(name(p))}</h3><div class="muted">${esc(typeText(p))} · ${p.keys} клавиш · ${p.key_size==='mini'?'mini':'полный размер'}</div></div><button type="button" class="quiet-btn" data-close-detail aria-label="Закрыть подробности">✕ Закрыть</button></div>
 <div class="detail-intro"><strong>Подойдёт, если</strong><p>${esc(editorial.best_for??'Тебе подходят его подтверждённые характеристики.')}</p><strong>Не выбирай вслепую, если</strong><p>${esc(editorial.not_for??'Нужен другой сценарий игры.')}</p></div>
 <div class="detail-grid"><div class="fact"><span>Звук без компьютера</span><strong>${standalone(p)?'Да, есть динамики':'Нет, нужен звуковой инструмент'}</strong></div><div class="fact"><span>USB MIDI</span><strong>${p.usb_midi===true?'Передаёт ноты':p.usb_midi===false?'Нет':'Неизвестно'}</strong></div><div class="fact"><span>USB audio</span><strong>${p.usb_audio===true?'Есть':p.usb_audio===false?'Нет':'Не проверено'}</strong></div><div class="fact"><span>Размеры корпуса</span><strong>${width?width/10+' × '+(p.depth_mm??'?')/10+' см':'Нужно уточнить'}</strong></div><div class="fact"><span>Чувствительность</span><strong>${p.velocity===true?'Есть':p.velocity===false?'Нет':'Нужно проверить'}</strong></div><div class="fact"><span>Источник звука</span><strong>${standalone(p)?'Встроенный':'VSTi / внешний генератор'}</strong></div></div>
 ${width?`<div class="footprint"><div class="footprint-line"><div class="footprint-bar" style="width:${Math.min(width/11,100)}%"></div></div><div class="footprint-label">Ширина ${width/10} см. Шкала: 110 см = вся полоска. Перед покупкой оставь место для рук и кабелей.</div></div>`:''}
 <div class="detail-question"><span>ВОПРОС ДЛЯ РЕШЕНИЯ</span><p>${esc(editorial.question??'Будешь ли ты садиться за инструмент без дополнительной подготовки?')}</p></div>
 <h4>Где возможен компромисс</h4><ul>${cons.length?cons.map(x=>`<li>${esc(x)}</li>`).join(''):'<li>По имеющимся данным критических ограничений нет; ощущение клавиш всё равно нужно проверить лично.</li>'}</ul>
 ${verdict.reasons.length?`<h4>Почему не попал в основной подбор</h4><ul>${verdict.reasons.map(c=>`<li>${esc(c.label)}: ${esc(c.detail)} (${c.status==='fail'?'не соответствует':'нужна проверка'})</li>`).join('')}</ul>`:''}
 <h4>Проба в магазине</h4><p class="muted">${esc(editorial.try_in_store??'Сыграй одни и те же ноты на разных моделях.')}</p>
 <h4>Первое подключение и 15 минут игры</h4><ol>${firstSound(p).map(x=>`<li>${esc(x)}</li>`).join('')}</ol>
 <details class="detail-check"><summary>Чек-лист перед оплатой</summary><ul>${purchaseChecklist(p).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>
 <h4>Цены и проверяемые сведения</h4>${priceList?`<ul>${priceList}</ul>`:'<p class="muted">Проверенного локального предложения на этот вариант в базе нет; отсутствие цены не означает отсутствие товара.</p>'}
 <div class="source-list">${sources.map(src=>`<a href="${esc(src.url)}" target="_blank" rel="noopener noreferrer">Источник производителя ↗</a>`).join('')}</div>
 <div class="source-warning">Срез данных от 06.11.2026. Источники характеристик — производители; выводы «подойдёт / не подойдёт» — редакционные подсказки, не результаты тестирования инструмента. Цена и наличие требуют проверки у продавца.</div>`;
 target.after(d);
}
function renderRecommendations(result){
 $('#resultCount').textContent=`${result.eligible.length} подходит · ${result.pending.length} проверить`;
 $('#conflict').innerHTML=conflictHtml(result);
 $('#recommendations').innerHTML=result.selected.length?result.selected.map(recCard).join(''):`<div class="empty"><strong>Нет подтверждённых совпадений</strong>Попробуй изменить обязательные условия или загляни в «Проверить».</div>`;
}
function productStatus(p){return p.verdict.status==='eligible'?'<span class="status-text">● Соответствует условиям</span>':p.verdict.status==='pending'?'<span class="status-text verify">◐ Проверить</span>':'<span class="status-text excluded">○ Не соответствует</span>'}
function renderCatalog(result){
 const list=result.all.filter(p=>catalogFilter==='all'||p.verdict.status===catalogFilter).filter(p=>name(p).toLocaleLowerCase().includes(query.toLocaleLowerCase()));
 $('#catalog').innerHTML=list.length?list.map(p=>`<article class="product-row"><div><div class="product-title">${esc(name(p))}</div><div class="product-subtitle">${esc(typeText(p))} · ${p.keys} клавиш · ${p.key_size==='mini'?'mini':'полный размер'} · ${standalone(p)?'свои звуки и динамики':'нужен звуковой инструмент'}</div></div><div class="product-controls">${productStatus(p)}<span class="product-price">${esc(priceText(p))}</span><button type="button" class="add-btn ${duel.includes(p.id)?'active':''}" data-compare="${esc(p.id)}" aria-pressed="${duel.includes(p.id)}" aria-label="${duel.includes(p.id)?'Убрать из сравнения':'Добавить в сравнение'}: ${esc(name(p))}">${duel.includes(p.id)?'✓':'+'} Сравнить</button><button type="button" class="link-btn" data-detail="${esc(p.id)}" aria-expanded="${detailId===p.id&&detailContext==='catalog'}">Детали →</button></div></article>`).join(''):`<div class="empty"><strong>Ничего не найдено</strong>Измени запрос или фильтр каталога.</div>`;
 document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('selected',b.dataset.filter===catalogFilter);b.setAttribute('aria-pressed',String(b.dataset.filter===catalogFilter))});
}
const attributes=[['Тип',p=>typeText(p)],['Клавиши',p=>String(p.keys)],['Размер клавиш',p=>p.key_size==='mini'?'Мини':'Полный'],['Динамика',p=>p.velocity===true?'Есть':p.velocity===false?'Нет':'Проверить'],['Самостоятельный звук',p=>standalone(p)?'Да':'Нет'],['USB MIDI',p=>p.usb_midi===true?'Да':p.usb_midi===false?'Нет':'Проверить'],['Ширина',p=>p.width_mm!=null?`${p.width_mm/10} см`:'Проверить'],['Цена по старым публикациям',p=>priceEvidence(p)!=null?money(priceEvidence(p).amount_vnd):'Нет данных'],['Звук за 1 минуту',p=>standalone(p)?'Встроенные звуки':'VST + MIDI']];
function renderDuel(){
 const items=duel.map(id=>products.find(p=>p.id===id)).filter(Boolean);
 $('#compareCount').textContent=String(items.length);
 const dock=$('#compareDock');dock.hidden=items.length===0;
 $('#compareDockText').textContent=`В сравнении: ${items.length} из 2`;
 $('#clearDuel').disabled=items.length===0;
 const different=items.length===2?attributes.filter(([,fn])=>fn(items[0])!==fn(items[1])):[];
 $('#duelContent').innerHTML=`<div class="duel-slots">${[0,1].map(i=>items[i]?`<div class="duel-card"><div class="rec-kicker">МОДЕЛЬ 0${i+1}</div><h3>${esc(name(items[i]))}</h3><div class="product-subtitle">${esc(typeText(items[i]))}</div><button type="button" class="quiet-btn" data-remove="${esc(items[i].id)}">Убрать ×</button></div>`:`<div class="duel-card placeholder">${i===0?'Выбери первую модель':'Добавь вторую модель'}</div>`).join('')}</div>
 ${items.length===2?`${different.length?`<table class="duel-table" aria-label="Различия двух клавиатур"><tbody>${different.map(([label,fn])=>`<tr class="diff"><td>${label}</td><td>${esc(fn(items[0]))}</td><td>${esc(fn(items[1]))}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">В основных характеристиках различий не обнаружено.</div>'}<div class="duel-advice"><strong>Что решит выбор между ними</strong><p>${esc(compareAdvice(items[0],items[1],preferences))}</p></div><p class="content-intro">Данные о цене не являются актуальным предложением. Удобство клавиш и характер звука проверяй лично.</p>`:''}`;
}
function render(){renderSettings();const result=recommend(products,preferences);renderRecommendations(result);renderCatalog(result);renderDuel();renderDetails();persist()}
function updatePref(key,value){
 if(key==='minKeys')value=Number(value);
 if(key==='budgetVnd')value=value==='none'?null:Number(value);
 if(key==='maxWidthMm')value=value==='none'?null:Number(value);
 if(key==='hardBudget')value=value==='true';
 preferences[key]=value;
 detailId=null;detailContext=null;render();
}
document.addEventListener('click',e=>{
 const toggle=e.target.closest('[data-setting] [data-value]');if(toggle){const group=toggle.closest('[data-setting]');updatePref(group.dataset.setting,toggle.dataset.value);return}
 const conflict=e.target.closest('[data-change]');if(conflict){updatePref(conflict.dataset.change,conflict.dataset.value);toast('Условие изменено. Результаты пересчитаны.');return}
 const f=e.target.closest('[data-filter]');if(f){catalogFilter=f.dataset.filter;detailId=null;detailContext=null;render();return}
 const c=e.target.closest('[data-compare]');if(c){const id=c.dataset.compare;if(duel.includes(id))duel=duel.filter(x=>x!==id);else if(duel.length===2){duel=[duel[1],id];toast('В дуэли заменён первый инструмент.')}else duel.push(id);render();return}
 const detail=e.target.closest('[data-detail]');if(detail){const context=detail.closest('#catalog')?'catalog':'recommendations';const shouldClose=detailId===detail.dataset.detail&&detailContext===context;detailId=shouldClose?null:detail.dataset.detail;detailContext=shouldClose?null:context;renderDetails();document.querySelectorAll('[data-detail]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.detail===detailId&&Boolean(b.closest(`#${detailContext}`)))));if(detailId)requestAnimationFrame(()=>$('#activeDetail')?.scrollIntoView({behavior:'smooth',block:'nearest'}));return}
 if(e.target.closest('[data-close-detail]')){detailId=null;detailContext=null;renderDetails();document.querySelectorAll('[data-detail]').forEach(b=>b.setAttribute('aria-expanded','false'));return}
 const r=e.target.closest('[data-remove]');if(r){duel=duel.filter(id=>id!==r.dataset.remove);render();return}
 if(e.target.closest('#clearDuel')){duel=[];render();return}
 if(e.target.closest('#reset,#resetMobile')){preferences={...defaults};duel=[];query='';$('#search').value='';detailId=null;detailContext=null;catalogFilter='eligible';$('#advancedSettings').open=false;render();toast('Начальные условия восстановлены.');return}
});
$('#velocity').addEventListener('change',e=>{preferences.velocityRequired=e.target.checked;render()});
$('#hardBudget').addEventListener('change',e=>{preferences.hardBudget=e.target.checked;render()});
$('#used').addEventListener('change',e=>{preferences.includeUsed=e.target.checked;render()});
$('#maxWidth').addEventListener('change',e=>{const cm=Number(e.target.value);preferences.maxWidthMm=e.target.value&&Number.isFinite(cm)&&cm>0?Math.round(cm*10):null;render()});
$('#search').addEventListener('input',e=>{query=e.target.value;detailId=null;detailContext=null;renderCatalog(recommend(products,preferences))});
$('#jumpDuel').addEventListener('click',()=>$('#duel').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}));
if(preferences.budgetVnd!=null||preferences.hardBudget||preferences.maxWidthMm!=null||preferences.includeUsed)$('#advancedSettings').open=true;
async function init(){try{
 const res=await fetch('/catalog.json',{cache:'no-store'});if(!res.ok)throw new Error(`HTTP ${res.status}`);
 const body=await res.json();if(!Array.isArray(body.products))throw new Error('Некорректный каталог');
 products=body.products;duel=duel.filter(id=>products.some(p=>p.id===id));$('#catalogCount').textContent=`${products.length} моделей в базе`;render();
}catch(error){console.error(error);$('#resultCount').textContent='Недоступно';$('#recommendations').innerHTML=`<div class="warning-panel"><strong>Не удалось загрузить каталог</strong><p>Проверь подключение и попробуй перезагрузить страницу.</p><button class="add-btn" id="retryCatalog">Перезагрузить</button></div>`;$('#catalog').innerHTML='';}}
document.addEventListener('click',event=>{if(event.target.closest('#retryCatalog'))location.reload()});
init();
