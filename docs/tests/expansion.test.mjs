import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults, classify, recommend, soundPath, standalone, firstSound, tradeoffs, compareAdvice, priceEvidence} from '../engine.js';
const data=JSON.parse(readFileSync(new URL('../catalog.json',import.meta.url),'utf8'));
const products=data.products;
const byId=id=>products.find(p=>p.id===id);
const date = new Date('2026-11-06T12:00:00');
test('29 new manufacturer-verified catalog entries, without invented prices',()=>{
 assert.equal(data.products.length,80);
 assert.equal(data.schema_version,'0.5.0');
 const added=products.filter(p=>p.data_quality==='manufacturer_specs_no_local_stock');
 assert.equal(added.length,29);
 for(const p of added){
  assert.deepEqual(p.prices,[],`${p.id} must not have guessed price`);
  assert.ok(['49','61','76'].includes(String(p.keys)),p.id);
  assert.ok(p.source_refs.some(s=>s.source_type==='manufacturer'&&/^https:\/\//.test(s.url)),p.id);
  assert.ok(p.editorial.best_for.length>35&&p.editorial.not_for.length>35);
  assert.ok(p.editorial.try_in_store.length>35&&p.editorial.question.length>35);
 }
});
test('no duplicate brand/model variant; brands and types remain defined',()=>{
 assert.equal(new Set(products.map(p=>`${p.brand.toLowerCase()}::${p.model.toLowerCase()}`)).size,products.length);
 assert.ok(products.filter(p=>p.keys===76).length>=3);
 assert.ok(products.filter(p=>p.type==='midi_controller').length>=8);
 assert.ok(products.filter(p=>p.type==='synthesizer').length>=2);
});
test('standalone keyboard, powered synthesizer and MIDI controller represent different paths',()=>{
 const casio=byId('casio-cts400'),roland=byId('roland-junod6'),controller=byId('novation-launchkey61-mk4');
 assert.equal(standalone(casio),true);
 assert.equal(standalone(roland),false);
 assert.equal(standalone(controller),false);
 assert.equal(roland.onboard_sounds,true);
 assert.equal(controller.onboard_sounds,false);
 assert.match(soundPath(roland),/Свои звуки, нужны наушники/);
 assert.match(soundPath(controller),/MIDI/);
 assert.match(tradeoffs(roland,defaults).join(' '),/Звук встроенный/);
 assert.doesNotMatch(tradeoffs(roland,defaults).join(' '),/программа с инструментом/);
 assert.match(firstSound(roland).join(' '),/наушники/);
 assert.match(compareAdvice(roland,controller,defaults),/MIDI-команды/);
});
test('unknown speaker evidence never becomes standalone pass',()=>{
 const p=byId('korg-i3');
 assert.equal(p.speakers,null);
 assert.equal(classify(p,{...defaults,standalone:'required'},date).status,'pending');
});
test('USB audio and own sound are independent',()=>{
 const p=byId('korg-keystage61');
 assert.equal(p.onboard_sounds,false);
 assert.equal(p.usb_audio,true);
 assert.equal(standalone(p),false);
 assert.equal(classify(p,{...defaults,standalone:'required'},date).status,'excluded');
});
test('No unsupported claims of Vietnamese pricing in newly added records',()=>{
 for(const p of products.filter(x=>x.data_quality==='manufacturer_specs_no_local_stock')){
  assert.equal(priceEvidence(p,date),null);
  assert.equal(classify(p,{...defaults,hardBudget:true,budgetVnd:2_000_000},date).checks.find(c=>c.label==='Строгий бюджет').status,'verify');
 }
});
test('recommender remains hard-constraint-safe for 80 model catalog',()=>{
 for(const minKeys of [49,61,76])for(const intent of ['both','play_now','make_music'])for(const mini of ['required','preferred','any'])for(const standalone of ['required','preferred','no']){
  const r=recommend(products,{...defaults,minKeys,intent,mini,standalone},date);
  assert.ok(r.selected.length<=3);
  assert.ok(r.selected.every(p=>p.verdict.status==='eligible'));
  assert.equal(new Set(r.selected.map(p=>p.id)).size,r.selected.length);
 }
});
