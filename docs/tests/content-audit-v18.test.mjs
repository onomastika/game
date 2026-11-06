import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {actionName, defaults, recommend} from '../engine.js';
const data=JSON.parse(readFileSync(new URL('../catalog.json',import.meta.url),'utf8'));
const products=data.products;
const by = id => products.find(x => x.id === id);

test('content audit documents partial review and never implies real-time stock',()=>{
 assert.equal(data.schema_version,'0.8.0');
 assert.equal(data.products.length,124);
 assert.equal(data.content_audit.vietnam_inventory_checked,false);
 assert.equal(data.content_audit.full_catalog_spec_validation,false);
 assert.equal(products.filter(p=>p.physical_spec_evidence).length,14);
 assert.equal(data.content_audit.year_citations_replaced,17);
});
test('incorrect unrelated Korg microKORG citations are replaced by exact model release evidence',()=>{
 assert.match(by('korg-microarranger').release_year_evidence.url,/youtube\.com\/watch/);
 assert.match(by('korg-microstation').release_year_evidence.url,/2010\/03\/24\/.*microstation/);
 assert.equal(products.some(p=>/microkorg\/ten_years/.test(p.release_year_evidence.url)),false);
});
test('new source links target the actual model and do not swap 2024 Yamaha with 2010 only pages',()=>{
 for(const id of ['yamaha-ez310','yamaha-psre383','yamaha-psr-e283','roland-junod6','roland-juno-d7','arturia-astrolab-61']){
  assert.match(by(id).release_year_evidence.url,/^https:\/\//,id);
  assert.equal(by(id).release_year_evidence.checked_at,'2026-11-07');
 }
 assert.match(by('yamaha-ez310').release_year_evidence.url,/24051601/);
 assert.match(by('yamaha-psre383').release_year_evidence.url,/24050901/);
 assert.match(by('roland-junod6').release_year_evidence.url,/JUNO-D-Synthesizer-Series/);
});
test('individual store checks are unique and not repetitive boilerplate',()=>{
 assert.equal(new Set(products.map(p=>p.editorial.try_in_store)).size,products.length);
 for(const p of products){
  assert.ok(p.editorial.try_in_store.length>=70, p.id);
  assert.ok(p.editorial.not_for.length>35, p.id);
 }
});
test('NP-15, NP-35 mechanics are differentiated without fake hammer action',()=>{
 const a=by('yamaha-np15'), b=by('yamaha-np35');
 assert.equal(a.action,'box_light');assert.equal(b.action,'graded_soft_touch');
 assert.match(actionName(a),/Box Type/);assert.match(actionName(b),/Graded Soft Touch/);
 assert.match(actionName(a),/не молоточковая/);assert.match(actionName(b),/не молоточковая/);
});
test('USB audio output-only Keystage is explicitly documented',()=>{
 const k=by('korg-keystage61');
 assert.equal(k.usb_audio,true);
 assert.equal(k.usb_audio_direction,'output_only');
 assert.match(k.editorial.data_warning,/вывод.*2 каналов/);
});
test('source corrections do not change recommendation eligibility',()=>{
 const r=recommend(products,defaults,new Date('2026-11-07T10:00:00'));
 assert.ok(r.selected.length>0);
 assert.ok(r.selected.every(p=>p.verdict.status==='eligible'));
});
