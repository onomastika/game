import {defaults, money, standalone, soundPath, name, classify, recommend, tradeoffs, firstSound, priceEvidence, compareAdvice, purchaseChecklist, actionName, aftertouchName, powerName, batteryStatus} from './engine.js';
const $ = sel => document.querySelector(sel);
const esc = text => String(text ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let products = [];
let preferences = {...defaults};
let duel = [];
let catalogFilter = 'eligible';
let brandFilter = 'all';
let typeFilter = 'all';
let yearFilter = 'all';
let yearSort = 'default';
let displayLimit = 12;
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
// Motion is progressive enhancement. The controls remain fully usable without it.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const canAnimate = () => !reducedMotion.matches;
const motionAttrs = (enabled, index, limit=8) => enabled && canAnimate() && index < limit
 ? ` data-motion="enter" style="--enter-delay:${Math.min(index,7)*28}ms"` : '';
let pillsScheduled = false;
let pillInstant = false;
function schedulePills(instant=false){
 if(!canAnimate()) return;
 pillInstant ||= instant;
 if(pillsScheduled) return;
 pillsScheduled = true;
 requestAnimationFrame(()=>{
  pillsScheduled = false;
  const noTransition = pillInstant; pillInstant = false;
  document.querySelectorAll('.option-row[data-setting]').forEach(group=>{
   const selected = group.querySelector('button.selected');
   if(!selected) return;
   if(noTransition) group.classList.add('pill-instant');
   group.style.setProperty('--pill-x',`${selected.offsetLeft}px`);
   group.style.setProperty('--pill-width',`${selected.offsetWidth}px`);
   group.classList.add('motion-pill');
   if(noTransition) requestAnimationFrame(()=>group.classList.remove('pill-instant'));
  });
 });
}
function pulseCount(){
 if(!canAnimate() || !Element.prototype.animate) return;
 const el=$('#compareCount');
 el.getAnimations().forEach(a=>a.cancel());
 el.animate([{transform:'scale(1)',color:'var(--text)'},{transform:'scale(1.18)',color:'var(--accent)'},{transform:'scale(1)',color:'var(--text)'}],{duration:280,easing:'ease-out'});
}
function syncCompareButtons(){
 document.querySelectorAll('[data-compare]').forEach(button=>{
  const selected = duel.includes(button.dataset.compare);
  button.classList.toggle('active',selected);
  button.setAttribute('aria-pressed',String(selected));
  button.textContent = button.closest('.rec-card') ? (selected?'✓ В сравнении':'+ Сравнить') : (selected?'✓ Сравнить':'+ Сравнить');
  if(button.closest('.product-row')){
   const model=products.find(p=>p.id===button.dataset.compare);
   if(model)button.setAttribute('aria-label',`${selected?'Убрать из сравнения':'Добавить в сравнение'}: ${name(model)}`);
  }
 });
}
function updateDuelOnly(){
 syncCompareButtons();
 renderDuel(true);
 persist();
 pulseCount();
}
window.addEventListener('resize',()=>schedulePills(true),{passive:true});
function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('show'),2700)}
function typeText(p){return p.type === 'midi_controller' ? 'MIDI-контроллер' : p.type === 'portable_keyboard' ? 'Автономные клавиши' : 'Синтезатор / аранжировщик'}
const routeNames={play:'МОЖНО ИГРАТЬ СРАЗУ',studio:'ДЛЯ REAPER И MIDI',compact:'МИНИ-КЛАВИШИ'};
function tip(p,route){
 if(route==='play')return standalone(p) ? 'Есть собственный звуковой движок и динамики: Reaper не нужен.' : 'Есть собственный звуковой движок; для игры подключи наушники или акустику.';
 if(route==='studio')return p.onboard_sounds===true ? 'Может отправлять MIDI в Reaper и играть собственными тембрами через аудиовыход.' : 'Передаёт исполнение в Reaper. Для звучания нужен VSTi или другой генератор звука.';
 return 'Сохранены 61 клавиша в более узком профиле клавиш; удобство двух рук важно проверить.';
}
function pills(p){return `<div class="spec-pills"><span>${p.keys} клавиш</span><span>${p.key_size==='mini'?'Mini':'Полный размер'}</span><span>${p.velocity===true?'Динамика нажатия':p.velocity===false?'Без динамики':'Динамика — уточнить'}</span><span>${esc(soundPath(p))}</span></div>`}
const exactWeight = p => Number.isFinite(p.weight_kg) ? `${p.weight_kg.toLocaleString('ru-RU')} кг` : 'Вес уточнить';
const dimensions = p => [p.width_mm,p.depth_mm,p.height_mm].every(Number.isFinite) ? `${(p.width_mm/10).toLocaleString('ru-RU')} × ${(p.depth_mm/10).toLocaleString('ru-RU')} × ${(p.height_mm/10).toLocaleString('ru-RU')} см` : 'Размеры уточнить';
const verifiedSpecsLink = p => p.physical_spec_evidence?.url?.startsWith('https://') ? `<a href="${esc(p.physical_spec_evidence.url)}" target="_blank" rel="noopener noreferrer">Проверенные размеры/питание ↗</a>` : `<span class="unverified-note">Дополнительные параметры ожидают проверки по инструкции</span>`;
function ergonomics(p){return `${esc(actionName(p))} · ${esc(exactWeight(p))}`;}
function yearText(p) { return Number.isInteger(p.release_year) ? `${p.release_year} · год выхода` : 'Год выхода не подтверждён'; }
function yearFact(p) { return Number.isInteger(p.release_year) ? String(p.release_year) : 'Не подтверждён'; }
function yearSource(p) {
 const url = p.release_year_evidence?.url;
 return Number.isInteger(p.release_year) && typeof url === 'string' && /^https:\/\//.test(url)
  ? `<a class="year-source" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Источник года ↗</a>` : '';
}
function priceText(p) {
 const offer=priceEvidence(p);
 return offer ? `${offer.fresh ? 'Ориентир' : 'Старая цена'}: ${money(offer.amount_vnd)} · ${offer.checked_at.slice(8,10)}.${offer.checked_at.slice(5,7)}` : 'Цена: нужно уточнить';
}
function recCard(p,i,animate=false){return `<article class="rec-card ${i===0?'featured':''}"${motionAttrs(animate,i,3)}>
 <div class="rec-top"><span class="rec-kicker">${routeNames[p.route]}</span><span class="rec-number">${i===0?'ПЕРВЫМ ПОПРОБОВАТЬ':`АЛЬТЕРНАТИВА ${i}`}</span></div>
 <div class="rec-main"><h3>${esc(name(p))}</h3><span class="rec-price">${esc(priceText(p))}</span></div>
 <div class="release-tag">${esc(yearText(p))}</div>
 <p class="rec-desc">${esc(p.editorial?.best_for ?? tip(p,p.route))}</p>
 <p class="rec-caution"><strong>Когда не стоит брать:</strong> ${esc(p.editorial?.not_for ?? tradeoffs(p,preferences)[0] ?? 'Проверь ощущения перед оплатой.')}</p>
 <p class="rec-ergonomics">${ergonomics(p)}</p>
 ${pills(p)}
 <div class="rec-bottom"><button type="button" class="link-btn" data-detail="${esc(p.id)}" aria-expanded="${detailId===p.id&&detailContext==='recommendations'}">Проверка и детали →</button><button type="button" class="add-btn ${duel.includes(p.id)?'active':''}" data-compare="${esc(p.id)}" aria-pressed="${duel.includes(p.id)}">${duel.includes(p.id)?'✓ В сравнении':'+ Сравнить'}</button></div></article>`;}
function conflictHtml(result){
 if(result.selected.length)return '';
 let details='В текущем каталоге нет подтверждённого совпадения. Обязательные требования не меняются без твоего участия.';
 const hasConflict=preferences.mini==='required'&&preferences.standalone==='required'&&result.eligible.length===0;
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
 $('#speakerRequired').checked=Boolean(preferences.speakersRequired);
 $('#used').checked=Boolean(preferences.includeUsed);
 $('#maxWidth').value=preferences.maxWidthMm!=null?preferences.maxWidthMm/10:'';
 $('#maxWeight').value=preferences.maxWeightKg!=null?preferences.maxWeightKg:'';
 $('#usbAudioRequired').checked=Boolean(preferences.usbAudioRequired);
 $('#batteryRequired').checked=Boolean(preferences.batteryRequired);
 $('#keyAftertouchRequired').checked=Boolean(preferences.keyAftertouchRequired);
 schedulePills();
}
function renderDetails(){
 document.querySelectorAll('.detail').forEach(el=>el.remove());
 if(!detailId)return;
 const p=products.find(x=>x.id===detailId);
 const anchor=Array.from(document.querySelectorAll(`[data-detail="${CSS.escape(detailId)}"]`)).find(button=>Boolean(button.closest(`#${detailContext}`)));
 if(!p||!anchor)return;
 const target=anchor.closest('.rec-card,.product-row');if(!target)return;
 const d=document.createElement('div');d.className='detail motion-detail';d.id='activeDetail';
 const verdict=classify(p,preferences);
 const offers=(p.prices??[]).filter(o=>o.amount_vnd);
 const priceList=offers.map(o=>`<li>${money(o.amount_vnd)} · ${esc(o.store)} · ${o.kind==='msrp'?'рекомендованная цена производителя':'публикация магазина'} от ${esc(o.checked_at)}; наличие не подтверждено. <a target="_blank" rel="noopener noreferrer" href="${esc(o.url)}">Проверить сейчас ↗</a></li>`).join('');
 const cons=tradeoffs(p,preferences);const width=Number.isFinite(p.width_mm)?p.width_mm:null;
 const sources=(p.source_refs??[]).filter(s=>s.source_type==='manufacturer');
 const editorial=p.editorial??{};
 d.innerHTML=`<div class="detail-heading"><div><h3>${esc(name(p))}</h3><div class="muted">${esc(typeText(p))} · ${p.keys} клавиш · ${p.key_size==='mini'?'mini':'полный размер'} · ${esc(yearText(p))}</div></div><button type="button" class="quiet-btn" data-close-detail aria-label="Закрыть подробности">✕ Закрыть</button></div>
 <div class="detail-intro"><strong>Подойдёт, если</strong><p>${esc(editorial.best_for??'Тебе подходят его подтверждённые характеристики.')}</p><strong>Не выбирай вслепую, если</strong><p>${esc(editorial.not_for??'Нужен другой сценарий игры.')}</p></div>
 <div class="detail-grid"><div class="fact"><span>Год выхода модели</span><strong>${esc(yearFact(p))}</strong>${yearSource(p)}</div><div class="fact"><span>Звук без компьютера</span><strong>${p.onboard_sounds===true?(p.speakers===true?'Да, есть динамики':'Да, через аудиовыход') : p.onboard_sounds===false?'Нет, нужен MIDI-хост':'Нужно проверить'}</strong></div><div class="fact"><span>USB MIDI</span><strong>${p.usb_midi===true?'Передаёт ноты':p.usb_midi===false?'Нет':'Неизвестно'}</strong></div><div class="fact"><span>USB audio</span><strong>${p.usb_audio===true?(p.usb_audio_direction==='output_only'?'Да · только вывод':'Есть'):p.usb_audio===false?'Нет':'Не проверено'}</strong></div><div class="fact"><span>Чувствительность</span><strong>${p.velocity===true?'Есть':p.velocity===false?'Нет':'Нужно проверить'}</strong></div><div class="fact"><span>Динамики</span><strong>${p.speakers===true?'Встроенные':p.speakers===false?'Нужны внешние / наушники':'Не подтверждены'}</strong></div><div class="fact"><span>Источник звука</span><strong>${p.onboard_sounds===true?'Встроенный генератор звука':p.onboard_sounds===false?'VSTi / внешний генератор':'Нужно проверить'}</strong></div><div class="fact"><span>Механика клавиш</span><strong>${esc(actionName(p))}</strong></div><div class="fact"><span>Aftertouch клавиш</span><strong>${esc(aftertouchName(p))}</strong></div><div class="fact"><span>Aftertouch пэдов</span><strong>${p.pad_aftertouch==='polyphonic'?'Полифонический':p.pad_aftertouch==='channel'?'Канальный':'Не подтверждён'}</strong></div><div class="fact"><span>Габариты корпуса (Ш×Г×В)</span><strong>${esc(dimensions(p))}</strong></div><div class="fact"><span>Вес (без аксессуаров)</span><strong>${esc(exactWeight(p))}</strong></div><div class="fact"><span>Питание</span><strong>${esc(powerName(p))}</strong></div><div class="fact"><span>Выход на наушники</span><strong>${p.headphones_out===true?'Подтверждён':p.headphones_out===false?'Отсутствует':'Не подтверждён'}</strong></div><div class="fact"><span>MIDI DIN</span><strong>${p.midi_din===true?'Есть':p.midi_din===false?'Нет':'Не подтверждён'}</strong></div></div>
 <div class="spec-citation">${verifiedSpecsLink(p)}<span>«Не подтверждён» означает недостаточно данных, а не отсутствие функции.</span></div>
 ${width?`<div class="footprint"><div class="footprint-line"><div class="footprint-bar" style="width:${Math.min(width/11,100)}%"></div></div><div class="footprint-label">Ширина ${width/10} см. Шкала: 110 см = вся полоска. Перед покупкой оставь место для рук и кабелей.</div></div>`:''}
 <div class="detail-question"><span>ВОПРОС ДЛЯ РЕШЕНИЯ</span><p>${esc(editorial.question??'Будешь ли ты садиться за инструмент без дополнительной подготовки?')}</p></div>
 <h4>Где возможен компромисс</h4><ul>${cons.length?cons.map(x=>`<li>${esc(x)}</li>`).join(''):'<li>По имеющимся данным критических ограничений нет; ощущение клавиш всё равно нужно проверить лично.</li>'}</ul>
 ${verdict.reasons.length?`<h4>Почему не попал в основной подбор</h4><ul>${verdict.reasons.map(c=>`<li>${esc(c.label)}: ${esc(c.detail)} (${c.status==='fail'?'не соответствует':'нужна проверка'})</li>`).join('')}</ul>`:''}
 <h4>Проба в магазине</h4><p class="muted">${esc(editorial.try_in_store??'Сыграй одни и те же ноты на разных моделях.')}</p>
 <h4>Первое подключение и 15 минут игры</h4><ol>${firstSound(p).map(x=>`<li>${esc(x)}</li>`).join('')}</ol>
 <details class="detail-check"><summary>Чек-лист перед оплатой</summary><ul>${purchaseChecklist(p).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>
 <h4>Цены и проверяемые сведения</h4>${priceList?`<ul>${priceList}</ul>`:'<p class="muted">Проверенного локального предложения на этот вариант в базе нет; отсутствие цены не означает отсутствие товара.</p>'}
 <div class="source-list">${sources.map(src=>`<a href="${esc(src.url)}" target="_blank" rel="noopener noreferrer">Источник производителя ↗</a>`).join('')}</div>
 <div class="source-warning">Проверенные дополнительные спецификации от 07.11.2026 (14 моделей); остальной каталог — предыдущий срез. Источники характеристик — производители; выводы «подойдёт / не подойдёт» — редакционные подсказки, не результаты тестирования инструмента. Цена и наличие требуют проверки у продавца.</div>`;
 target.after(d);
}
function renderRecommendations(result,animate=false){
 $('#resultCount').textContent=`${result.eligible.length} подходит · ${result.pending.length} проверить`;
 $('#conflict').innerHTML=conflictHtml(result);
 $('#recommendations').innerHTML=result.selected.length?result.selected.map((p,i)=>recCard(p,i,animate)).join(''):`<div class="empty"><strong>Нет подтверждённых совпадений</strong>Попробуй изменить обязательные условия или загляни в «Проверить».</div>`;
}
function productStatus(p){return p.verdict.status==='eligible'?'<span class="status-text">● Соответствует условиям</span>':p.verdict.status==='pending'?'<span class="status-text verify">◐ Проверить</span>':'<span class="status-text excluded">○ Не соответствует</span>'}
function renderCatalog(result,{animate=false,from=0}={}){
 let list=result.all.filter(p=>catalogFilter==='all'||p.verdict.status===catalogFilter).filter(p=>brandFilter==='all'||p.brand===brandFilter).filter(p=>typeFilter==='all'||p.type===typeFilter).filter(p=>name(p).toLocaleLowerCase().includes(query.toLocaleLowerCase()))
 .filter(p=>yearFilter==='all'||(Number.isInteger(p.release_year) && p.release_year>=Number(yearFilter)));
 if(yearSort!=='default'){
  list=list.slice().sort((a,b)=>{
   const ay=Number.isInteger(a.release_year)?a.release_year:null;
   const by=Number.isInteger(b.release_year)?b.release_year:null;
   if(ay===null)return by===null?a.id.localeCompare(b.id):1;
   if(by===null)return -1;
   return (yearSort==='newest'?by-ay:ay-by)||a.id.localeCompare(b.id);
  });
 }
 $('#catalogVisibleCount').textContent=`${Math.min(list.length,displayLimit)} из ${list.length} найденных · ${products.length} в базе`;
 const visible = list.slice(0,displayLimit);
 $('#catalog').innerHTML=list.length?visible.map((p,i)=>`<article class="product-row"${i>=from?motionAttrs(animate,i-from,12):''}><div><div class="product-title">${esc(name(p))}</div><div class="product-subtitle">${esc(typeText(p))} · ${esc(yearText(p))} · ${p.keys} клавиш · ${p.key_size==='mini'?'mini':'полный размер'} · ${esc(exactWeight(p))} · ${esc(soundPath(p))}</div></div><div class="product-controls">${productStatus(p)}<span class="product-price">${esc(priceText(p))}</span><button type="button" class="add-btn ${duel.includes(p.id)?'active':''}" data-compare="${esc(p.id)}" aria-pressed="${duel.includes(p.id)}" aria-label="${duel.includes(p.id)?'Убрать из сравнения':'Добавить в сравнение'}: ${esc(name(p))}">${duel.includes(p.id)?'✓':'+'} Сравнить</button><button type="button" class="link-btn" data-detail="${esc(p.id)}" aria-expanded="${detailId===p.id&&detailContext==='catalog'}">Детали →</button></div></article>`).join('') + (list.length>displayLimit?`<div class="more-wrap"><button type="button" class="more-button" id="showMore">Показать ещё ${Math.min(12,list.length-displayLimit)} из ${list.length-displayLimit}</button></div>`:''):`<div class="empty"><strong>Ничего не найдено</strong>Измени запрос или фильтр каталога.</div>`;
 document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('selected',b.dataset.filter===catalogFilter);b.setAttribute('aria-pressed',String(b.dataset.filter===catalogFilter))});
}
const attributes=[['Механика',p=>actionName(p)],['Aftertouch клавиш',p=>aftertouchName(p)],['Aftertouch пэдов',p=>p.pad_aftertouch==='polyphonic'?'Полифонический':p.pad_aftertouch==null?'Не подтверждён':'Другое'],['Вес',p=>exactWeight(p)],['Габариты',p=>dimensions(p)],['Питание',p=>powerName(p)],['USB audio',p=>p.usb_audio===true?(p.usb_audio_direction==='output_only'?'Есть · только вывод':'Есть'):p.usb_audio===false?'Нет':'Проверить'],['Батарейки AA',p=>batteryStatus(p)==null?'Не проверено':batteryStatus(p)?'Да':'Нет'],['Год выхода',p=>yearFact(p)],['Тип',p=>typeText(p)],['Клавиши',p=>String(p.keys)],['Размер клавиш',p=>p.key_size==='mini'?'Мини':'Полный'],['Динамика',p=>p.velocity===true?'Есть':p.velocity===false?'Нет':'Проверить'],['Собственный звуковой движок',p=>p.onboard_sounds===true?'Да':p.onboard_sounds===false?'Нет':'Проверить'],['Встроенные динамики',p=>p.speakers===true?'Да':p.speakers===false?'Нет':'Проверить'],['USB MIDI',p=>p.usb_midi===true?'Да':p.usb_midi===false?'Нет':'Проверить'],['Выход на наушники',p=>p.headphones_out===true?'Да':p.headphones_out===false?'Нет':'Проверить'],['Цена по старым публикациям',p=>priceEvidence(p)!=null?money(priceEvidence(p).amount_vnd):'Нет данных'],['Как услышать звук',p=>soundPath(p)]];
function renderDuel(animate=false){
 const items=duel.map(id=>products.find(p=>p.id===id)).filter(Boolean);
 $('#compareCount').textContent=String(items.length);
 const dock=$('#compareDock');dock.hidden=items.length===0;
 $('#compareDockText').textContent=`В сравнении: ${items.length} из 2`;
 $('#clearDuel').disabled=items.length===0;
 const different=items.length===2?attributes.filter(([,fn])=>fn(items[0])!==fn(items[1])):[];
 $('#duelContent').innerHTML=`<div class="duel-slots">${[0,1].map(i=>items[i]?`<div class="duel-card"${motionAttrs(animate,i,2)}><div class="rec-kicker">МОДЕЛЬ 0${i+1}</div><h3>${esc(name(items[i]))}</h3><div class="product-subtitle">${esc(typeText(items[i]))} · ${esc(yearText(items[i]))}</div><button type="button" class="quiet-btn" data-remove="${esc(items[i].id)}">Убрать ×</button></div>`:`<div class="duel-card placeholder">${i===0?'Выбери первую модель':'Добавь вторую модель'}</div>`).join('')}</div>
 ${items.length===2?`${different.length?`<table class="duel-table" aria-label="Различия двух клавиатур"><tbody>${different.map(([label,fn])=>`<tr class="diff"><td>${label}</td><td>${esc(fn(items[0]))}</td><td>${esc(fn(items[1]))}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">В основных характеристиках различий не обнаружено.</div>'}<div class="duel-advice"><strong>Что решит выбор между ними</strong><p>${esc(compareAdvice(items[0],items[1],preferences))}</p></div><p class="content-intro">Данные о цене не являются актуальным предложением. Удобство клавиш и характер звука проверяй лично.</p>`:''}`;
}
function render({animate=false}={}){renderSettings();const result=recommend(products,preferences);renderRecommendations(result,animate);renderCatalog(result,{animate});renderDuel();renderDetails();persist()}
function updatePref(key,value){
 if(key==='minKeys')value=Number(value);
 if(key==='budgetVnd')value=value==='none'?null:Number(value);
 if(key==='maxWidthMm')value=value==='none'?null:Number(value);
 if(key==='maxWeightKg')value=value==='none'?null:Number(value);
 if(key==='hardBudget')value=value==='true';
 preferences[key]=value;
 detailId=null;detailContext=null;render({animate:true});
}
document.addEventListener('click',e=>{
 const toggle=e.target.closest('[data-setting] [data-value]');if(toggle){const group=toggle.closest('[data-setting]');updatePref(group.dataset.setting,toggle.dataset.value);return}
 const conflict=e.target.closest('[data-change]');if(conflict){updatePref(conflict.dataset.change,conflict.dataset.value);toast('Условие изменено. Результаты пересчитаны.');return}
 const f=e.target.closest('[data-filter]');if(f){catalogFilter=f.dataset.filter;displayLimit=12;detailId=null;detailContext=null;render({animate:true});return}
 const c=e.target.closest('[data-compare]');if(c){const id=c.dataset.compare;if(duel.includes(id))duel=duel.filter(x=>x!==id);else if(duel.length===2){duel=[duel[1],id];toast('В дуэли заменён первый инструмент.')}else duel.push(id);updateDuelOnly();return}
 const detail=e.target.closest('[data-detail]');if(detail){const context=detail.closest('#catalog')?'catalog':'recommendations';const shouldClose=detailId===detail.dataset.detail&&detailContext===context;detailId=shouldClose?null:detail.dataset.detail;detailContext=shouldClose?null:context;renderDetails();document.querySelectorAll('[data-detail]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.detail===detailId&&Boolean(b.closest(`#${detailContext}`)))));if(detailId)requestAnimationFrame(()=>$('#activeDetail')?.scrollIntoView({behavior:canAnimate()?'smooth':'auto',block:'nearest'}));return}
 if(e.target.closest('[data-close-detail]')){detailId=null;detailContext=null;renderDetails();document.querySelectorAll('[data-detail]').forEach(b=>b.setAttribute('aria-expanded','false'));return}
 const r=e.target.closest('[data-remove]');if(r){duel=duel.filter(id=>id!==r.dataset.remove);updateDuelOnly();return}
 if(e.target.closest('#showMore')){const from=displayLimit;displayLimit+=12;renderCatalog(recommend(products,preferences),{animate:true,from});renderDetails();return}
 if(e.target.closest('#clearDuel')){duel=[];updateDuelOnly();return}
 if(e.target.closest('#reset,#resetMobile')){preferences={...defaults};duel=[];query='';brandFilter='all';typeFilter='all';yearFilter='all';yearSort='default';$('#brandFilter').value='all';$('#typeFilter').value='all';$('#yearFilter').value='all';$('#yearSort').value='default';$('#search').value='';detailId=null;detailContext=null;catalogFilter='eligible';displayLimit=12;$('#advancedSettings').open=false;render();toast('Начальные условия восстановлены.');return}
});
$('#velocity').addEventListener('change',e=>{preferences.velocityRequired=e.target.checked;render({animate:true})});
$('#hardBudget').addEventListener('change',e=>{preferences.hardBudget=e.target.checked;render({animate:true})});
$('#speakerRequired').addEventListener('change',e=>{preferences.speakersRequired=e.target.checked;render({animate:true})});
$('#used').addEventListener('change',e=>{preferences.includeUsed=e.target.checked;render({animate:true})});
$('#usbAudioRequired').addEventListener('change',e=>{preferences.usbAudioRequired=e.target.checked;render({animate:true})});
$('#batteryRequired').addEventListener('change',e=>{preferences.batteryRequired=e.target.checked;render({animate:true})});
$('#keyAftertouchRequired').addEventListener('change',e=>{preferences.keyAftertouchRequired=e.target.checked;render({animate:true})});
$('#maxWidth').addEventListener('change',e=>{const cm=Number(e.target.value);preferences.maxWidthMm=e.target.value&&Number.isFinite(cm)&&cm>0?Math.round(cm*10):null;render({animate:true})});
$('#maxWeight').addEventListener('change',e=>{const kg=Number(e.target.value.replace(',','.'));preferences.maxWeightKg=e.target.value&&Number.isFinite(kg)&&kg>0?kg:null;render({animate:true})});
$('#search').addEventListener('input',e=>{query=e.target.value;displayLimit=12;detailId=null;detailContext=null;renderCatalog(recommend(products,preferences))});
$('#brandFilter').addEventListener('change',e=>{brandFilter=e.target.value;displayLimit=12;detailId=null;detailContext=null;renderCatalog(recommend(products,preferences),{animate:true});renderDetails()});
$('#typeFilter').addEventListener('change',e=>{typeFilter=e.target.value;displayLimit=12;detailId=null;detailContext=null;renderCatalog(recommend(products,preferences),{animate:true});renderDetails()});
$('#yearFilter').addEventListener('change',e=>{yearFilter=e.target.value;displayLimit=12;detailId=null;detailContext=null;renderCatalog(recommend(products,preferences),{animate:true});renderDetails()});
$('#yearSort').addEventListener('change',e=>{yearSort=e.target.value;displayLimit=12;detailId=null;detailContext=null;renderCatalog(recommend(products,preferences),{animate:true});renderDetails()});
$('#jumpDuel').addEventListener('click',()=>$('#duel').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}));
if(preferences.budgetVnd!=null||preferences.hardBudget||preferences.maxWidthMm!=null||preferences.maxWeightKg!=null||preferences.usbAudioRequired||preferences.batteryRequired||preferences.keyAftertouchRequired||preferences.includeUsed||preferences.speakersRequired)$('#advancedSettings').open=true;
async function init(){try{
 const res=await fetch('/catalog.json',{cache:'no-store'});if(!res.ok)throw new Error(`HTTP ${res.status}`);
 const body=await res.json();if(!Array.isArray(body.products))throw new Error('Некорректный каталог');
 products=body.products;duel=duel.filter(id=>products.some(p=>p.id===id));$('#catalogCount').textContent=`${products.length} моделей в базе`;const brands=[...new Set(products.map(p=>p.brand))].sort((a,b)=>a.localeCompare(b,'ru'));$('#brandFilter').innerHTML='<option value="all">Все бренды</option>'+brands.map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join('');render({animate:true});
}catch(error){console.error(error);$('#resultCount').textContent='Недоступно';$('#recommendations').innerHTML=`<div class="warning-panel"><strong>Не удалось загрузить каталог</strong><p>Проверь подключение и попробуй перезагрузить страницу.</p><button class="add-btn" id="retryCatalog">Перезагрузить</button></div>`;$('#catalog').innerHTML='';}}
document.addEventListener('click',event=>{if(event.target.closest('#retryCatalog'))location.reload()});
if(canAnimate()) document.documentElement.classList.add('motion-enabled');
init();
