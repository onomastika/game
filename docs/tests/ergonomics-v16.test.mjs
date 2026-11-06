import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults, classify, recommend, batteryStatus, powerName, actionName, aftertouchName, compareAdvice} from '../engine.js';
const dataset=JSON.parse(readFileSync(new URL('../catalog.json', import.meta.url),'utf8'));
const all=dataset.products;
const by=id=>{const p=all.find(p=>p.id===id);assert.ok(p,id);return p};
const date=new Date('2026-11-07T12:00:00');
const check=(id,pref)=>classify(by(id),{...defaults,...pref},date);
test('data enriched for exactly 14 products without adding fake prices',()=>{
 assert.equal(all.length,124);
 assert.equal(dataset.schema_version,'0.8.0');
 const enriched=all.filter(p=>p.physical_spec_evidence);
 assert.equal(enriched.length,14);
 for(const p of enriched){
  assert.match(p.physical_spec_evidence.url,/^https:\/\//);
  assert.equal(p.physical_spec_evidence.publisher,'manufacturer');
  assert.equal(p.physical_spec_evidence.checked_at,'2026-11-07');
  assert.ok(p.physical_spec_evidence.fields.length>=3);
  assert.equal(p.power_modes_verified,true);
  assert.ok(p.weight_kg>0&&p.width_mm>0&&p.depth_mm>0&&p.height_mm>0);
 }
});
test('unknown aftertouch never treated as false or true',()=>{
 assert.equal(by('novation-launchkey61-mk4').pad_aftertouch,'polyphonic');
 assert.equal(by('novation-launchkey61-mk4').key_aftertouch,null);
 assert.equal(check('novation-launchkey61-mk4',{keyAftertouchRequired:true}).status,'pending');
 assert.equal(check('korg-keystage61',{keyAftertouchRequired:true}).status,'eligible');
 assert.equal(check('korg-microstation',{keyAftertouchRequired:true,includeUsed:true}).status,'excluded');
 assert.equal(aftertouchName(by('korg-microstation')),'Нет (проверено)');
});
test('AA filter strictly uses power modes with manufacturer verification',()=>{
 assert.equal(batteryStatus(by('casio-cts1')),true);
 assert.equal(batteryStatus(by('m-audio-keystation61-mk3')),false);
 assert.equal(batteryStatus(by('nektar-se61')),null);
 assert.equal(check('casio-cts1',{batteryRequired:true}).status,'eligible');
 assert.equal(check('m-audio-keystation61-mk3',{batteryRequired:true}).status,'excluded');
 assert.equal(check('nektar-se61',{batteryRequired:true}).status,'pending');
 assert.match(powerName(by('korg-kross2-61')),/Батарейки AA/);
});
test('weight filter strictly separates matches and unknowns',()=>{
 assert.equal(check('casio-cts1',{maxWeightKg:5}).status,'eligible');
 assert.equal(check('arturia-astrolab-61',{maxWeightKg:5}).status,'excluded');
 assert.equal(check('nektar-se61',{maxWeightKg:5}).status,'pending');
 assert.equal(check('korg-microstation',{maxWeightKg:3,includeUsed:true}).status,'eligible');
});
test('USB audio filter does not confuse MIDI or onboard sound',()=>{
 assert.equal(check('roland-gokeys3',{usbAudioRequired:true}).status,'eligible');
 assert.equal(check('korg-keystage61',{usbAudioRequired:true}).status,'eligible');
 assert.equal(by('korg-keystage61').onboard_sounds,false);
 assert.notEqual(check('korg-microkey2-61',{usbAudioRequired:true}).status,'eligible');
});
test('mixed constraints never leak nonpassing choices into top recommendations',()=>{
 const prefs={...defaults,maxWeightKg:5,batteryRequired:true,usbAudioRequired:true};
 const result=recommend(all,prefs,date);
 assert.ok(result.selected.every(p=>p.verdict.status==='eligible'));
 for(const item of result.selected){
  assert.equal(item.power_modes_verified,true);
  assert.ok(item.weight_kg<=5);
  assert.equal(item.usb_audio,true);
 }
});
test('aftertouch and keybed labels are not qualitative ranks',()=>{
 assert.match(actionName(by('novation-launchkey61-mk4')),/Полувзвешенная/);
 assert.match(actionName(by('arturia-keylabessential61-mk3')),/Гибридная/);
 assert.match(compareAdvice(by('korg-keystage61'),by('korg-microstation'),{...defaults,keyAftertouchRequired:true}),/aftertouch|Aftertouch|Проверь/);
});
test('no release enrichment alters keyboard count or year',()=>{
 assert.equal(by('korg-microstation').keys,61);
 assert.equal(by('arturia-astrolab-61').key_aftertouch,'present');
 assert.equal(by('korg-keystage61').key_aftertouch,'polyphonic');
 assert.equal(by('casio-cts200').velocity,false);
});
test('unknown power data are not interpreted as missing capability',()=>{
 for(const p of all){
  assert.ok([null,'polyphonic','channel','present','none'].includes(p.key_aftertouch),p.id);
  assert.ok([null,'polyphonic','channel','none'].includes(p.pad_aftertouch),p.id);
  assert.equal(typeof p.power_modes_verified,'boolean',p.id);
  if(p.power_modes_verified)assert.ok(p.physical_spec_evidence,p.id);
 }
});
