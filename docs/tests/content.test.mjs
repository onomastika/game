import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults, compareAdvice, purchaseChecklist, priceEvidence, tradeoffs, firstSound} from '../engine.js';
const data=JSON.parse(readFileSync(new URL('../catalog.json',import.meta.url),'utf8'));
const byId=id=>data.products.find(p=>p.id===id);
test('Every item has distinct editorial guidance and a test to perform',()=>{
 assert.equal(data.products.length,80);
 for(const p of data.products){
  for(const key of ['best_for','not_for','try_in_store','question']) assert.ok(typeof p.editorial?.[key]==='string'&&p.editorial[key].length>35,`${p.id}: ${key}`);
  assert.notEqual(p.editorial.best_for,p.editorial.not_for);
 }
 assert.equal(new Set(data.products.map(p=>p.editorial.question)).size,data.products.length);
});
test('Product narrative makes distinctions between USB MIDI, onboard sound and wireless MIDI',()=>{
 assert.match(byId('korg-microkey2-61').editorial.not_for,/компьютер/i);
 assert.match(byId('korg-microkeyair-61').editorial.not_for,/MIDI/);
 assert.match(byId('casio-cts200').editorial.not_for,/силой/);
 assert.match(byId('roland-gokeys3').editorial.best_for,/софту/);
});
test('Only verified exact-variant offer gets a price lead, no variant group cost',()=>{
 assert.equal(priceEvidence(byId('casio-cts1')),null);
 assert.ok(priceEvidence(byId('korg-microkey2-61'),new Date('2026-11-06'))?.fresh);
 assert.equal(priceEvidence(byId('korg-microkey2-61'),new Date('2026-11-20'))?.fresh,false);
});
test('Tradeoffs do not expose raw English auditing notes to Russian users',()=>{
 for(const id of ['arturia-keylabessential61-mk3','casio-cts1','casio-cts200','korg-microarranger']){
  assert.doesNotMatch(tradeoffs(byId(id),defaults).join(' '),/NEGATIVE CONTROL|exact product store|Variant-linked|Legacy;/);
 }
});
test('Different sound paths get actual decision advice',()=>{
 let advice=compareAdvice(byId('casio-cts1'),byId('korg-microkey2-61'),defaults);
 assert.match(advice,/только передаёт MIDI-команды/);
 assert.match(advice,/Casio CT-S1/);
 assert.match(advice,/Korg microKEY2/);
});
test('Reaper setup describes monitoring, VSTi and input (not false onboard sound)',()=>{
 const steps=firstSound(byId('nektar-se61')).join(' ');
 assert.match(steps,/Reaper/);assert.match(steps,/VSTi/);assert.match(steps,/monitoring/);
});
test('Store tests and purchase checklist are contextual',()=>{
 assert.match(purchaseChecklist(byId('korg-microarranger')).join(' '),/б\/у/);
 assert.match(purchaseChecklist(byId('korg-microkey2-61')).join(' '),/ноутбук/);
 assert.match(purchaseChecklist(byId('casio-cts1')).join(' '),/динамики/);
});
