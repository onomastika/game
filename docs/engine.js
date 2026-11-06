// Pure, deterministic selection logic. Unknown evidence never silently becomes a pass.
export const defaults = Object.freeze({
  intent: 'both', minKeys: 61, velocityRequired: true, mini: 'preferred',
  standalone: 'preferred', budgetVnd: null, hardBudget: false,
  maxWidthMm: null, includeUsed: false
});
export const money = n => n == null ? 'Цена не подтверждена' : `${new Intl.NumberFormat('ru-RU').format(n)} ₫`;
export const num = n => new Intl.NumberFormat('ru-RU').format(n);
export const standalone = p => p.onboard_sounds === true && p.speakers === true;
export const soundPath = p => p.onboard_sounds === true ? (p.speakers === true ? 'Встроенные звуки и динамики' : p.speakers === false ? 'Свои звуки, нужны наушники/колонки' : 'Свои звуки, динамики не подтверждены') : p.onboard_sounds === false ? 'MIDI: нужен внешний звуковой инструмент' : 'Источник звука требуется проверить';
export const name = p => `${p.brand} ${p.model}`;
export const activeOffers = (p, asOf = new Date()) => {
  const date = new Date(asOf); date.setHours(0, 0, 0, 0);
  return (p.prices ?? []).filter(o => {
    if (!o.amount_vnd || !o.checked_at || !o.url || !o.kind || o.kind === 'msrp' || o.model_variant_confirmed !== true) return false;
    const age = Math.round((date - new Date(`${o.checked_at}T00:00:00`)) / 86400000);
    return age >= 0 && age <= 7;
  });
};
export const lowestKnownPrice = p => {
  const offers = (p.prices ?? []).filter(x => x.amount_vnd > 0 && x.kind !== 'msrp');
  return offers.length ? Math.min(...offers.map(x => x.amount_vnd)) : null;
};
export function priceEvidence(p, asOf = new Date()) {
  const offers = (p.prices ?? []).filter(o => o.amount_vnd > 0 && o.kind !== 'msrp' && o.model_variant_confirmed === true && o.url && o.checked_at);
  if (!offers.length) return null;
  offers.sort((a,b) => a.amount_vnd - b.amount_vnd);
  const offer = offers[0];
  return { ...offer, fresh: activeOffers(p, asOf).some(o => o.url === offer.url && o.amount_vnd === offer.amount_vnd) };
}
export function compareAdvice(a, b, u) {
  if (!a || !b) return '';
  const as = standalone(a), bs = standalone(b);
  if (a.onboard_sounds !== b.onboard_sounds && a.onboard_sounds != null && b.onboard_sounds != null) return `${name(a.onboard_sounds ? a : b)} создаёт звук внутри корпуса, а ${name(a.onboard_sounds ? b : a)} только передаёт MIDI-команды. Проверь, какой способ игры удобнее тебе.`;
  if (as !== bs) return `Главная развилка: ${name(as ? a : b)} играет через собственные динамики, а ${name(as ? b : a)} требует внешний источник звука. Выбирай по тому, как часто будешь играть без компьютера.`;
  if ((a.key_size === 'mini') !== (b.key_size === 'mini')) return `Главная развилка: ${name(a.key_size === 'mini' ? a : b)} компактнее по размеру самих клавиш. Но удобство для обеих рук нужно проверить лично.`;
  if (a.usb_audio !== b.usb_audio && a.usb_audio != null && b.usb_audio != null) return 'Одна модель поддерживает USB audio, другая — нет. Это про передачу звука в программу, а не про качество клавиш.';
  const prices=[priceEvidence(a),priceEvidence(b)];
  if (prices.every(Boolean) && prices[0].amount_vnd !== prices[1].amount_vnd) return 'Указанные цены — только исторические ориентиры. Сравни их в день покупки, затем проверь ощущение клавиш; дешевле не обязательно удобнее.';
  if (u.intent === 'make_music') return 'Обе модели подходят по формальным условиям: проверь настройку в Reaper, ощущение клавиш и то, какие органы управления нужны тебе реально.';
  return 'По спецификациям решающего преимущества нет. Сравни ощущения рук, звук в твоём сценарии и число действий до начала игры.';
}
export function purchaseChecklist(p) {
  const items = ['Попроси показать точную модификацию, комплект и стоимость с аксессуарами.', 'Проверь все клавиши, особенно тихое нажатие и аккорд двумя руками.'];
  items.push(standalone(p) ? 'Послушай встроенные динамики и проверь выход на наушники, если он тебе нужен.' : p.onboard_sounds === true ? 'Проверь наушники, внешний аудиовывод и комплект для воспроизведения собственного звука.' : 'Возьми свой ноутбук или попроси показать звук через MIDI и виртуальный инструмент.');
  if(p.key_size==='mini')items.push('Попробуй широкие аккорды и быстрые переходы: mini нравится не всем.');
  if(p.market_status==='legacy')items.push('Для б/у проверь порты, питание, работу кнопок и право на возврат.');
  items.push('Проверь цену, наличие и срок гарантии сегодня — данные на сайте не онлайн.');
  return items;
}
export function classify(p, user, asOf = new Date()) {
  const checks = [];
  function check(label, status, detail) { checks.push({label, status, detail}); }
  check('Клавиши', p.keys == null ? 'verify' : p.keys >= user.minKeys ? 'pass' : 'fail', `${p.keys ?? '—'} / минимум ${user.minKeys}`);
  if (user.velocityRequired) check('Динамика', p.velocity === true ? 'pass' : p.velocity === false ? 'fail' : 'verify', p.velocity == null ? 'Нет точных данных' : p.velocity ? 'Есть' : 'Нет');
  if (user.mini === 'required') check('Мини-клавиши', !p.key_size ? 'verify' : p.key_size === 'mini' ? 'pass' : 'fail', p.key_size === 'mini' ? 'Мини' : 'Не мини');
  if (user.standalone === 'required') check('Без компьютера', p.onboard_sounds === false || p.speakers === false ? 'fail' : p.onboard_sounds == null || p.speakers == null ? 'verify' : 'pass', standalone(p) ? 'Свой звук и динамики' : 'Нужен источник звука');
  if (user.maxWidthMm != null && user.maxWidthMm > 0) check('Ширина', p.width_mm == null ? 'verify' : p.width_mm <= user.maxWidthMm ? 'pass' : 'fail', `${p.width_mm ?? '?'} / ${user.maxWidthMm} мм`);
  if (p.market_status === 'legacy' && !user.includeUsed) check('Новое устройство', 'fail', 'Архивная модель');
  if (user.hardBudget && user.budgetVnd != null) {
    const offers = activeOffers(p, asOf);
    check('Строгий бюджет', offers.length === 0 ? 'verify' : offers.some(o => o.amount_vnd <= user.budgetVnd) ? 'pass' : 'fail', offers.length ? `Проверенные предложения: ${offers.map(o => money(o.amount_vnd)).join(', ')}` : 'Нет актуальной цены на конкретный вариант');
  }
  return {
    status: checks.some(c => c.status === 'fail') ? 'excluded' : checks.some(c => c.status === 'verify') ? 'pending' : 'eligible',
    checks, reasons: checks.filter(c => c.status === 'fail' || c.status === 'verify')
  };
}
function routeScore(p, route, u) {
  const isStandalone = standalone(p), isMini = p.key_size === 'mini';
  const size = Number.isFinite(p.width_mm) ? p.width_mm : 1100;
  const price = lowestKnownPrice(p) ?? 16000000;
  let score = 0;
  if (route === 'play') score += isStandalone ? 120 : -200;
  if (route === 'studio') score += p.usb_midi === true ? 80 : -150;
  if (route === 'compact') score += isMini ? 120 : 0;
  if (u.intent === 'play_now' && isStandalone) score += 36;
  if (u.intent === 'make_music' && p.usb_midi) score += 36;
  if (u.mini === 'preferred' && isMini) score += 38;
  if (u.standalone === 'preferred' && isStandalone) score += 23;
  score -= size / 38;
  score -= price / 900000;
  // Stable tie-breaking always uses product ID.
  return score;
}
export function recommend(products, u, date = new Date()) {
  const all = products.map(p => ({...p, verdict: classify(p, u, date)}));
  const eligible = all.filter(p => p.verdict.status === 'eligible');
  const pending = all.filter(p => p.verdict.status === 'pending');
  const excluded = all.filter(p => p.verdict.status === 'excluded');
  const selected = [];
  const routes = u.intent === 'play_now' ? ['play','compact','studio'] : u.intent === 'make_music' ? ['studio','compact','play'] : ['play','studio','compact'];
  for (const route of routes) {
    const pool = eligible.filter(p => !selected.some(s => s.id === p.id)).filter(p => route === 'play' ? standalone(p) : route === 'studio' ? p.usb_midi === true : p.key_size === 'mini');
    const choice = pool.sort((a,b) => routeScore(b,route,u) - routeScore(a,route,u) || a.id.localeCompare(b.id))[0];
    if (choice) selected.push({...choice, route});
  }
  return {selected, eligible, pending, excluded, all};
}
export function tradeoffs(p, u) {
  const cons = [];
  if (p.onboard_sounds === false) cons.push('Для звука понадобится компьютер, телефон или другой MIDI-хост и программа с инструментом.');
  else if (p.onboard_sounds === true && p.speakers === false) cons.push('Звук встроенный, но динамиков нет: понадобятся наушники или внешняя акустика.');
  else if (p.onboard_sounds === true && p.speakers == null) cons.push('Встроенные динамики не подтверждены. Уточни, нужен ли внешний аудиовывод.');
  if (p.key_size === 'standard' && u.mini !== 'any') cons.push('Полноразмерные клавиши — важно проверить удобство для небольших рук.');
  if (p.key_size === 'mini') cons.push('На мини-клавишах может быть непривычно играть двумя руками.');
  if (p.width_mm == null) cons.push('Точные габариты нужно уточнить перед покупкой.');
  if ((p.prices ?? []).length === 0) cons.push('Нет подтверждённой локальной цены на конкретный вариант.');
  if (p.editorial?.data_warning) cons.push(p.editorial.data_warning);
  return cons;
}
export function firstSound(p) {
  if (p.onboard_sounds === true && !standalone(p)) return [
    'Подключи питание по инструкции, затем наушники или внешние активные колонки к предусмотренному выходу.',
    'Включи инструмент и выбери простой тембр пианино или синтезатора на его панели.',
    'Сыграй знакомую мелодию и проверь динамику от тихого до громкого исполнения.',
    'Если хочешь записывать в Reaper, отдельно проверь USB MIDI и USB audio: это разные возможности.'
  ];
  if (standalone(p)) return [
    'Поставь клавиши удобно, подключи питание по инструкции (адаптер может продаваться отдельно).',
    'Включи инструмент и выбери простой звук пианино без сопровождения.',
    'Сыграй одни и те же ноты тихо, потом громко; при необходимости настрой чувствительность.',
    'Запиши 30 секунд на телефон, сыграй знакомую мелодию и повтори завтра.'
  ];
  return [
    'Подключи USB MIDI клавиатуру к компьютеру. Проверь, что система её видит.',
    'В Reaper: Options → Preferences → Audio → MIDI Devices → включи устройство для входа.',
    'Создай дорожку, вставь VSTi (например, установленное виртуальное пианино), выбери MIDI-вход.',
    'Включи запись и monitoring, проверь аудиовыход (динамики/наушники/интерфейс) и сыграй три ноты.',
    'Запиши 30 секунд MIDI и сохрани проект-шаблон, чтобы в следующий раз сразу играть.'
  ];
}
